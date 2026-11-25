// Baixa fotos e vídeos escolhidos no Google Photos, em resolução original, pela Google Photos Picker API.
//
// Uso:  npm run photos -- --dest <pasta>
//       npm run photos -- --dest "/Users/alanaraujo/Documents/Sem Rumo/torres-del-paine"
//
// Fluxo: abre o Google Photos no navegador para você marcar as mídias, espera a seleção terminar,
// baixa cada item (fotos com =d, vídeos com =dv) e grava a data de captura como data do arquivo.
// Também grava um photos-manifest.json na pasta com os metadados básicos de cada item.
// Depois de cada download, compara as dimensões do arquivo recebido com as originais: o Google pode
// entregar vídeos recodificados (ex.: 1080p em vez de 4K). Nesse caso avisa e grava downgraded: true.
//       npm run photos -- --dest <pasta> --check   só confere uma pasta já baixada, sem novo download
//
// Credenciais (fora do repositório):
//   ~/.config/gcloud/photos-oauth.json  cliente OAuth "aplicativo para computador" do projeto sem-rumo-analytics
//   ~/.config/gcloud/photos-token.json  refresh token salvo no primeiro login (permissão 600)
// A API photospicker.googleapis.com precisa estar ativa no projeto. Escopo somente leitura.
import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, chmod, utimes, access, rename } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { homedir } from 'node:os';
import path from 'node:path';

const CONFIG = path.join(homedir(), '.config', 'gcloud');
const CLIENT_FILE = process.env.PHOTOS_OAUTH_CLIENT ?? path.join(CONFIG, 'photos-oauth.json');
const TOKEN_FILE = process.env.PHOTOS_OAUTH_TOKEN ?? path.join(CONFIG, 'photos-token.json');
const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const API = 'https://photospicker.googleapis.com/v1';

// ---------- argumentos ----------
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dest = opt('dest');
if (!dest || args.includes('--help')) {
  console.log('Uso: npm run photos -- --dest <pasta>\nBaixa em resolução original as fotos e vídeos que você escolher no Google Photos.');
  process.exit(args.includes('--help') ? 0 : 1);
}
const DEST = path.resolve(dest);

const run = promisify(execFile);
// Dimensões reais do arquivo baixado: ffprobe para vídeo, sips (macOS) para imagem.
async function probeDims(file, isVideo) {
  try {
    if (isVideo) {
      const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
      const [w, h] = stdout.trim().split(',').map(Number);
      return w && h ? { w, h } : null;
    }
    const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
    const w = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const h = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    return w && h ? { w, h } : null;
  } catch {
    return null; // sem ffprobe/sips: não dá para conferir
  }
}
// Compara ignorando a orientação (vídeos verticais podem vir com largura e altura trocadas).
function checkQuality(entry, dims) {
  if (!dims || !entry.width || !entry.height) return entry;
  const orig = [Number(entry.width), Number(entry.height)].sort((a, b) => b - a);
  const got = [dims.w, dims.h].sort((a, b) => b - a);
  entry.downloadedWidth = dims.w;
  entry.downloadedHeight = dims.h;
  entry.downgraded = got[0] < orig[0] || got[1] < orig[1];
  return entry;
}
const qualityNote = (e) => (e.downgraded ? `  ⚠ resolução menor que a original: ${e.downloadedWidth}x${e.downloadedHeight} (original ${e.width}x${e.height})` : '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const openBrowser = (url) => execFile('open', [url], (err) => err && console.log(`Abra no navegador:\n${url}`));
// Durações da API vêm como "5s" ou "1800.5s".
const seconds = (d, fallback) => (d ? parseFloat(String(d)) : fallback);

// ---------- autenticação OAuth (loopback + PKCE) ----------
async function authorize() {
  const raw = JSON.parse(await readFile(CLIENT_FILE, 'utf8'));
  const { client_id, client_secret } = raw.installed ?? raw.web ?? {};
  if (!client_id) throw new Error(`Credencial inválida em ${CLIENT_FILE} (esperado um cliente "aplicativo para computador").`);

  const saved = await readFile(TOKEN_FILE, 'utf8').then(JSON.parse).catch(() => null);
  if (saved?.refresh_token && saved.scope?.includes(SCOPE)) {
    const client = new OAuth2Client(client_id, client_secret);
    client.setCredentials({ refresh_token: saved.refresh_token });
    try {
      await client.getAccessToken();
      return client;
    } catch (e) {
      console.log('O token salvo não vale mais; vou pedir um novo login.');
    }
  }

  // Login no navegador, com redirecionamento para um servidor local temporário.
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const redirectUri = `http://localhost:${server.address().port}`;
  const client = new OAuth2Client(client_id, client_secret, redirectUri);
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [SCOPE],
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  console.log('Abrindo o login do Google no navegador…');
  openBrowser(authUrl);
  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirectUri);
      const c = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(c ? '<p>Login concluído. Pode fechar esta aba e voltar ao terminal.</p>' : `<p>Login cancelado: ${err}</p>`);
      if (c) resolve(c);
      else if (err) reject(new Error(`Login recusado: ${err}`));
    });
  });
  server.close();
  const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: redirectUri });
  client.setCredentials(tokens);
  if (!tokens.refresh_token) throw new Error('O Google não devolveu refresh token. Revogue o acesso em myaccount.google.com/permissions e tente de novo.');
  await mkdir(CONFIG, { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify({ refresh_token: tokens.refresh_token, scope: tokens.scope ?? SCOPE }, null, 2), { mode: 0o600 });
  await chmod(TOKEN_FILE, 0o600);
  console.log(`Token salvo em ${TOKEN_FILE} (permissão 600).`);
  return client;
}

async function api(client, method, url, body) {
  const { token } = await client.getAccessToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? {} : res.json();
}

// ---------- download ----------
async function freeName(dir, name) {
  const { name: base, ext } = path.parse(name);
  for (let i = 0; ; i++) {
    const candidate = path.join(dir, i ? `${base}-${i}${ext}` : name);
    try {
      await access(candidate);
    } catch {
      return candidate;
    }
  }
}

async function download(client, item) {
  const file = item.mediaFile;
  const isVideo = item.type === 'VIDEO';
  const status = file.mediaFileMetadata?.videoMetadata?.processingStatus;
  if (isVideo && status && status !== 'READY') return { skipped: `vídeo ainda em processamento no Google Photos (${status})` };
  const url = `${file.baseUrl}=${isVideo ? 'dv' : 'd'}`;
  const { token } = await client.getAccessToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`download de ${file.filename} → ${res.status}`);
  const target = await freeName(DEST, file.filename || `${item.id}${isVideo ? '.mp4' : '.jpg'}`);
  const tmp = `${target}.part`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  await rename(tmp, target);
  if (item.createTime) {
    const t = new Date(item.createTime);
    await utimes(target, t, t); // data de captura como data do arquivo
  }
  return { path: target };
}

// ---------- só conferir uma pasta já baixada ----------
if (args.includes('--check')) {
  const manifestPath = path.join(DEST, 'photos-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  let n = 0;
  for (const e of manifest) {
    checkQuality(e, await probeDims(path.join(DEST, e.file), e.type === 'VIDEO'));
    if (e.downgraded) {
      n++;
      console.log(`${e.file}:${qualityNote(e)}`);
    }
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`${n} de ${manifest.length} arquivo(s) abaixo da resolução original. Manifesto atualizado.`);
  process.exit(0);
}

// ---------- fluxo principal ----------
const client = await authorize();
await mkdir(DEST, { recursive: true });

const session = await api(client, 'POST', `${API}/sessions`, {});
console.log('Abrindo o Google Photos: marque as fotos e vídeos e toque em "Concluído".');
openBrowser(session.pickerUri);

const interval = seconds(session.pollingConfig?.pollInterval, 5) * 1000;
const deadline = Date.now() + seconds(session.pollingConfig?.timeoutIn, 1800) * 1000;
let current = session;
while (!current.mediaItemsSet) {
  if (Date.now() > deadline) {
    await api(client, 'DELETE', `${API}/sessions/${session.id}`).catch(() => {});
    throw new Error('A sessão expirou antes de a seleção terminar. Rode o comando de novo.');
  }
  await sleep(interval);
  current = await api(client, 'GET', `${API}/sessions/${session.id}`);
}

const items = [];
let pageToken;
do {
  const q = new URLSearchParams({ sessionId: session.id, pageSize: '100', ...(pageToken ? { pageToken } : {}) });
  const page = await api(client, 'GET', `${API}/mediaItems?${q}`);
  items.push(...(page.mediaItems ?? []));
  pageToken = page.nextPageToken;
} while (pageToken);
console.log(`${items.length} item(ns) selecionado(s). Baixando para ${DEST}…`);

const manifestPath = path.join(DEST, 'photos-manifest.json');
const manifest = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => []);
let ok = 0;
for (const [i, item] of items.entries()) {
  const label = `[${i + 1}/${items.length}] ${item.mediaFile?.filename ?? item.id}`;
  try {
    const r = await download(client, item);
    if (r.skipped) {
      console.log(`${label}: pulado, ${r.skipped}`);
      continue;
    }
    const meta = item.mediaFile.mediaFileMetadata ?? {};
    const entry = {
      file: path.basename(r.path),
      type: item.type,
      createTime: item.createTime,
      mimeType: item.mediaFile.mimeType,
      width: meta.width,
      height: meta.height,
      camera: [meta.cameraMake, meta.cameraModel].filter(Boolean).join(' ') || undefined,
      photo: meta.photoMetadata,
      video: meta.videoMetadata,
    };
    checkQuality(entry, await probeDims(r.path, item.type === 'VIDEO'));
    manifest.push(entry);
    ok++;
    console.log(`${label}: ok${qualityNote(entry)}`);
  } catch (e) {
    console.log(`${label}: falhou (${e.message})`);
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await api(client, 'DELETE', `${API}/sessions/${session.id}`).catch(() => {});
const worse = manifest.filter((e) => e.downgraded).length;
console.log(`Pronto: ${ok} de ${items.length} arquivo(s) em ${DEST}. Metadados em photos-manifest.json.`);
if (worse) console.log(`Atenção: ${worse} arquivo(s) vieram em resolução menor que a original (downgraded: true no manifesto).`);
