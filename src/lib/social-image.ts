import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

/** Tamanhos das imagens de compartilhamento: Open Graph e as proporções recomendadas pelo Google. */
export const SOCIAL_SIZES = {
  og: [1200, 630],
  '16x9': [1200, 675],
  '4x3': [1200, 900],
  '1x1': [1200, 1200],
} as const;

export type SocialSize = keyof typeof SOCIAL_SIZES;

/** Caminho da foto de capa, lido do frontmatter do artigo (relativo ao arquivo .md). */
function coverSourcePath(articlePath: string) {
  const markdown = readFileSync(articlePath, 'utf8');
  const match = markdown.match(/^cover:\s*['"]?([^'"\n]+?)['"]?\s*$/m);
  if (!match) throw new Error(`[${articlePath}] campo cover não encontrado no frontmatter.`);
  return resolve(dirname(articlePath), match[1]);
}

/**
 * Recorta a capa como o navegador faz com `object-fit: cover` e `object-position: "X% Y%"`,
 * para que a prévia nas redes sociais mostre o mesmo enquadramento da capa do artigo.
 */
export async function renderSocialImage(articlePath: string, position: string, size: SocialSize) {
  const [width, height] = SOCIAL_SIZES[size];
  const { data, info } = await sharp(coverSourcePath(articlePath)).rotate().toBuffer({ resolveWithObject: true });
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
