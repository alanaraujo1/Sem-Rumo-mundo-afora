import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        // Limites de SEO: faixas que os buscadores costumam exibir sem cortes.
        title: z
          .string()
          .trim()
          .min(20, 'Use pelo menos 20 caracteres.')
          .max(60, 'Use no máximo 60 caracteres para não ser truncado na busca.'),
        description: z
          .string()
          .trim()
          .min(70, 'Use pelo menos 70 caracteres.')
          .max(160, 'Use no máximo 160 caracteres para não ser truncada na busca.'),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        author: z.string().trim().min(2),
        // Largura e formato são validados em src/lib/posts.ts: aqui image() ainda
        // não tem os metadados do arquivo.
        cover: image(),
        coverAlt: z
          .string()
          .trim()
          .min(30, 'Descreva a foto e o contexto em pelo menos 30 caracteres.')
          .max(200, 'Use no máximo 200 caracteres.'),
        destination: z.object({
          name: z.string().trim().min(2),
          region: z.string().trim().min(2).optional(),
          countryCode: z
            .string()
            .regex(/^[A-Z]{2}$/, 'Use o código ISO 3166-1 alfa-2, por exemplo BR ou PT.'),
          coordinates: z
            .object({
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
            })
            .optional(),
        }),
        tags: z
          .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use minúsculas sem acento, separadas por hífen.'))
          .min(1, 'Informe ao menos uma tag.')
          .max(8, 'Use no máximo 8 tags.'),
        draft: z.boolean().default(false),
      })
      .refine((post) => !post.updatedDate || post.updatedDate >= post.pubDate, {
        path: ['updatedDate'],
        message: 'Não pode ser anterior a pubDate.',
      }),
});

export const collections = { blog };
