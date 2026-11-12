// Gera as imagens de compartilhamento (Open Graph e JSON-LD) em public/og/<slug>/<tamanho>.jpg,
// recortando cada capa com o mesmo foco percentual (coverPosition) usado na capa do artigo.
// Roda em Node antes do build (npm run prebuild), fora do Astro e do runtime do Cloudflare,
// que não suportam módulos nativos como o sharp.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src/content/blog');
const outputDir = join(root, 'public/og');

const SIZES = {
  og: [1200, 630],
  '16x9': [1200, 675],
  '4x3': [1200, 900],
  '1x1': [1200, 1200],
};
// Mesmo valor padrão de coverPosition definido em src/content.config.ts.
const DEFAULT_POSITION = '50% 30%';

function frontmatterValue(markdown, key) {
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return frontmatter.match(new RegExp(`^${key}:\\s*['"]?([^'"\\n]+?)['"]?\\s*$`, 'm'))?.[1];
}

/** Recorta como `object-fit: cover` com `object-position: "X% Y%"`. */
async function render(source, position, [width, height]) {
  const { data, info } = await sharp(source).rotate().toBuffer({ resolveWithObject: true });
  const [focusX, focusY] = position.split(' ').map((value) => Number.parseFloat(value) / 100);
  const scale = Math.max(width / info.width, height / info.height);
  const cropWidth = Math.min(info.width, Math.round(width / scale));
  const cropHeight = Math.min(info.height, Math.round(height / scale));

  return sharp(data)
    .extract({
      left: Math.round((info.width - cropWidth) * focusX),
      top: Math.round((info.height - cropHeight) * focusY),
      width: cropWidth,
      height: cropHeight,
    })
    .resize(width, height)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

const posts = readdirSync(contentDir)
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const markdown = readFileSync(join(contentDir, file), 'utf8');
    return {
      slug: file.replace(/\.md$/, ''),
      cover: frontmatterValue(markdown, 'cover'),
      position: frontmatterValue(markdown, 'coverPosition') ?? DEFAULT_POSITION,
      draft: frontmatterValue(markdown, 'draft') === 'true',
    };
  })
  .filter((post) => !post.draft);

// Recria a pasta do zero para não deixar imagens de artigos removidos ou renomeados.
rmSync(outputDir, { recursive: true, force: true });

let count = 0;
for (const post of posts) {
  if (!post.cover) throw new Error(`[${post.slug}] campo cover não encontrado no frontmatter.`);
  if (!/^\d{1,3}% \d{1,3}%$/.test(post.position)) {
    throw new Error(`[${post.slug}] coverPosition inválido: "${post.position}". Use o formato '50% 30%'.`);
  }
  const source = resolve(contentDir, post.cover);
  const folder = join(outputDir, post.slug);
  mkdirSync(folder, { recursive: true });
  for (const [name, size] of Object.entries(SIZES)) {
    writeFileSync(join(folder, `${name}.jpg`), await render(source, post.position, size));
    count += 1;
  }
}

console.log(`Imagens de compartilhamento: ${count} arquivos em public/og/ (${posts.length} artigos).`);
