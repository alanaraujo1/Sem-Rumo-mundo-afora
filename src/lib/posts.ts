import { getCollection } from 'astro:content';

/** Artigos do mais novo ao mais antigo. Rascunhos aparecem só em `astro dev`. */
export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  for (const { id, data } of posts) {
    if (data.cover.width < 1200 || data.cover.format === 'svg') {
      throw new Error(
        `[${id}] cover: use uma foto (JPG, PNG, WebP ou AVIF) com pelo menos 1200px de largura; ` +
          `recebido ${data.cover.format} com ${data.cover.width}px.`,
      );
    }
  }
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' });

/** Palavras e minutos de leitura (200 palavras por minuto), sem contar a sintaxe de tabelas e links. */
export function getReadingStats(body = '') {
  const text = body.replace(/\]\([^)]*\)/g, ' ').replace(/[|#*_`>\[\]-]/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / 200)) };
}

export const formatDate = (date: Date) => dateFormatter.format(date);
