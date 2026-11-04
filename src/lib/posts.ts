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

export const formatDate = (date: Date) => dateFormatter.format(date);
