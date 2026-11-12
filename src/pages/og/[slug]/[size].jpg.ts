import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts } from '../../../lib/posts';
import { renderSocialImage, SOCIAL_SIZES, type SocialSize } from '../../../lib/social-image';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return posts.flatMap((post) =>
    Object.keys(SOCIAL_SIZES).map((size) => ({
      params: { slug: post.id, size },
      props: { articlePath: post.filePath!, position: post.data.coverPosition },
    })),
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  const image = await renderSocialImage(props.articlePath, props.position, params.size as SocialSize);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/jpeg' } });
};
