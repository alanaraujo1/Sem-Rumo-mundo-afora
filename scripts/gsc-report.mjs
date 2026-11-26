// Relatório do Search Console (Search Analytics API) para orientar otimizações e novos artigos.
//
// Autenticação: conta de serviço gsc-ga4-reader, por personificação (ver scripts/lib/google-auth.mjs).
// Ela precisa ser usuária (Restrito basta) da propriedade no Search Console.
//
// Uso:
//   npm run gsc                     últimos 28 dias
//   npm run gsc -- --days 90        outro período
//   npm run gsc -- --limit 50       mais linhas por tabela
//   npm run gsc -- --json           saída em JSON (para análise automatizada)
// GSC_SITE força a propriedade (ex.: sc-domain:semrumomundoafora.com.br).
import { authClient, authHint, SCOPES, SERVICE_ACCOUNT } from './lib/google-auth.mjs';
import { dec, flag, int, option, pct, table } from './lib/report.mjs';

const DOMAIN = 'semrumomundoafora.com.br';
const ORIGIN = `https://${DOMAIN}`;
// Posições em que um ajuste no artigo pode levar à primeira página.
const OPPORTUNITY = { min: 8, max: 20 };

const days = option('days', 28);
const limit = option('limit', 25);
const asJson = flag('json');

// O Search Console fecha os dados com uns 2 dias de atraso; o fim do período respeita isso.
const isoDaysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const endDate = isoDaysAgo(2);
const startDate = isoDaysAgo(days + 1);

const API = 'https://searchconsole.googleapis.com/webmasters/v3';
let client;

async function pickSite() {
  if (process.env.GSC_SITE) return process.env.GSC_SITE;
  const { data } = await client.request({ url: `${API}/sites` });
  const sites = (data.siteEntry ?? []).filter((s) => s.permissionLevel !== 'siteUnverifiedUser');
  const site =
    sites.find((s) => s.siteUrl === `sc-domain:${DOMAIN}`) ?? sites.find((s) => s.siteUrl.includes(DOMAIN));
  if (!site) {
    throw new Error(
      `${SERVICE_ACCOUNT} não tem acesso a nenhuma propriedade de ${DOMAIN}.\n` +
        'Adicione-a em Search Console > Configurações > Usuários e permissões (Restrito basta).',
    );
  }
  return site.siteUrl;
}

async function query(site, dimensions, rowLimit) {
  const { data } = await client.request({
    url: `${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    method: 'POST',
    data: { startDate, endDate, dimensions, rowLimit, dataState: 'final' },
  });
  return (data.rows ?? []).map((r) => ({
    ...Object.fromEntries(dimensions.map((d, i) => [d, r.keys[i]])),
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

// --inspect: estado de indexação de cada URL do sitemap (URL Inspection API, cota de 2.000 por dia).
async function inspectAll(site) {
  const xml = await (await fetch(`${ORIGIN}/sitemap-0.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const results = [];
  const queue = [...urls];
  const worker = async () => {
    for (let url; (url = queue.shift()); ) {
      try {
        const { data } = await client.request({
          url: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
          method: 'POST',
          data: { inspectionUrl: url, siteUrl: site, languageCode: 'pt-BR' },
        });
        const r = data.inspectionResult?.indexStatusResult ?? {};
        results.push({
          url,
          verdict: r.verdict ?? null,
          coverageState: r.coverageState ?? null,
          lastCrawlTime: r.lastCrawlTime ?? null,
          googleCanonical: r.googleCanonical ?? null,
          userCanonical: r.userCanonical ?? null,
          robotsTxtState: r.robotsTxtState ?? null,
          pageFetchState: r.pageFetchState ?? null,
        });
      } catch (error) {
        results.push({ url, error: error.response?.data?.error?.message ?? error.message });
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}

if (flag('inspect')) {
  let results, site;
  try {
    client = await authClient([SCOPES.searchConsole]);
    site = await pickSite();
    results = await inspectAll(site);
  } catch (error) {
    console.error(`Falha na inspeção de URLs:\n${error.response?.data?.error?.message ?? error.message}`);
    const hint = authHint(error);
    if (hint) console.error(`\n${hint}`);
    process.exit(1);
  }
  if (asJson) {
    console.log(JSON.stringify({ site, results }, null, 2));
    process.exit(0);
  }
  const indexed = results.filter((r) => r.verdict === 'PASS').length;
  const canonicalMismatch = (r) => r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical;
  const day = (iso) => (iso ? iso.slice(0, 10) : '–');
  console.log(`Search Console · inspeção de ${results.length} URLs do sitemap · ${indexed} indexadas`);
  table(
    'Estado de cada URL (não indexadas primeiro)',
    ['Página', 'Veredito', 'Situação', 'Último rastreio', 'Canônica'],
    [...results]
      .sort((a, b) => (a.verdict === 'PASS') - (b.verdict === 'PASS'))
      .map((r) => [
        r.url.slice(ORIGIN.length) || '/',
        r.error ? 'ERRO' : (r.verdict ?? '–'),
        r.error ?? r.coverageState ?? '–',
        day(r.lastCrawlTime),
        canonicalMismatch(r) ? `Google escolheu ${r.googleCanonical.replace(ORIGIN, '')}` : 'ok',
      ]),
  );
  process.exit(0);
}

let site, queries, pages, pairs, totals;
try {
  client = await authClient([SCOPES.searchConsole]);
  site = await pickSite();
  [queries, pages, pairs, totals] = await Promise.all([
    query(site, ['query'], 1000),
    query(site, ['page'], 1000),
    query(site, ['page', 'query'], 5000),
    query(site, [], 1),
  ]);
} catch (error) {
  const detail = error.response?.data?.error?.message ?? error.message;
  console.error(`Falha ao consultar o Search Console:\n${detail}`);
  const hint = authHint(error);
  if (hint) console.error(`\n${hint}`);
  else if (/has not been used|disabled/i.test(detail)) {
    console.error('\nAtive a API com: gcloud services enable searchconsole.googleapis.com --project sem-rumo-analytics');
  }
  process.exit(1);
}

// O Google ainda guarda visitas antigas em http:// e www., que já redirecionam (301) para a canônica.
// Junta as variantes numa linha só, com a posição média ponderada pelas impressões.
const canonical = (url) => url.replace(/^https?:\/\/(www\.)?/, 'https://');
function mergeVariants(rows) {
  const merged = new Map();
  for (const r of rows) {
    const page = canonical(r.page);
    const key = r.query === undefined ? page : `${page}\n${r.query}`;
    const m = merged.get(key) ?? { ...r, page, clicks: 0, impressions: 0, positionSum: 0 };
    m.clicks += r.clicks;
    m.impressions += r.impressions;
    m.positionSum += r.position * r.impressions;
    merged.set(key, m);
  }
  return [...merged.values()].map(({ positionSum, ...m }) => ({
    ...m,
    ctr: m.impressions ? m.clicks / m.impressions : 0,
    position: m.impressions ? positionSum / m.impressions : 0,
  }));
}
pages = mergeVariants(pages);
pairs = mergeVariants(pairs);

const byImpressions = (a, b) => b.impressions - a.impressions;
const topQuery = new Map();
for (const p of [...pairs].sort(byImpressions)) if (!topQuery.has(p.page)) topQuery.set(p.page, p);

const opportunities = pages
  .filter((p) => p.position >= OPPORTUNITY.min && p.position <= OPPORTUNITY.max)
  .sort(byImpressions)
  .map((p) => ({ ...p, topQuery: topQuery.get(p.page)?.query ?? null }));

if (asJson) {
  console.log(
    JSON.stringify(
      { site, startDate, endDate, totals: totals[0] ?? null, queries, pages, opportunities, pairs },
      null,
      2,
    ),
  );
  process.exit(0);
}

const path = (url) => (url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) || '/' : url);
const metrics = (r) => [int(r.clicks), int(r.impressions), pct(r.ctr), dec(r.position)];
const HEAD = ['Cliques', 'Impressões', 'CTR', 'Posição'];

console.log(`Search Console · ${site} · ${startDate} a ${endDate} (${days} dias, dados finais)`);
const t = totals[0];
if (t) console.log(`Total: ${int(t.clicks)} cliques, ${int(t.impressions)} impressões, CTR ${pct(t.ctr)}, posição média ${dec(t.position)}`);

table(
  `Buscas (${Math.min(limit, queries.length)} de ${queries.length}, por impressões)`,
  ['Busca', ...HEAD],
  [...queries].sort(byImpressions).slice(0, limit).map((r) => [r.query, ...metrics(r)]),
);

table(
  `Páginas (${Math.min(limit, pages.length)} de ${pages.length}, por impressões)`,
  ['Página', ...HEAD],
  [...pages].sort(byImpressions).slice(0, limit).map((r) => [path(r.page), ...metrics(r)]),
);

table(
  `Oportunidades: páginas entre a ${OPPORTUNITY.min}ª e a ${OPPORTUNITY.max}ª posição (${opportunities.length})`,
  ['Página', ...HEAD, 'Busca principal'],
  opportunities.slice(0, limit).map((r) => [path(r.page), ...metrics(r), r.topQuery ?? '–']),
);
