import { getImage } from 'astro:assets';
import avatar from '../assets/alan-primo-avatar.jpg';
import { AUTHOR_BIO, AUTHOR_JOB_TITLE, AUTHOR_NAME, AUTHOR_SCHEMA_PATH, INSTAGRAM } from '../consts';

/**
 * Entidade Person do autor, a mesma em todo o site: a página Sobre a declara por completo
 * e os artigos repetem os dados com o mesmo @id, para o Google ligar cada texto ao autor.
 */
export async function authorPerson(site: URL, { full = false } = {}) {
  const image = await getImage({ src: avatar, width: 320, height: 320, format: 'jpeg' });
  return {
    '@type': 'Person',
    '@id': new URL(AUTHOR_SCHEMA_PATH, site).href,
    name: AUTHOR_NAME,
    url: new URL('/sobre/', site).href,
    jobTitle: AUTHOR_JOB_TITLE,
    image: { '@type': 'ImageObject', url: new URL(image.src, site).href, width: 320, height: 320 },
    sameAs: [INSTAGRAM.author.url],
    ...(full && {
      description: AUTHOR_BIO,
      knowsAbout: ['Viagens', 'Expedições', 'Turismo de natureza', 'Ecoturismo', 'Fotografia de viagem', 'Fotografia documental'],
    }),
  };
}
