// @ts-check
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { calloutPlugin, figurePlugin } from './src/lib/markdown-plugins.mjs';
import { trailingSlashRedirects } from './src/lib/trailing-slash-redirects.mjs';

export default defineConfig({
  // Canonical, Open Graph, JSON-LD, sitemap e robots.txt derivam desta URL.
  site: 'https://semrumomundoafora.com.br',
  trailingSlash: 'always',
  // URLs sem barra final recebem um 301 para a versão com barra (ver src/lib/trailing-slash-redirects.mjs).
  integrations: [sitemap(), trailingSlashRedirects()],
  // Larguras candidatas do srcset. Os padrões do Astro mais 1600 (e 360/480 para miniaturas); a de 1600 é a
  // versão em alta que o lightbox dos artigos abre sob demanda.
  image: {
    breakpoints: [360, 480, 640, 750, 828, 1080, 1280, 1600, 1668, 2048, 2560],
  },
  // Serifada só nos títulos: um peso, subconjunto latino, com fonte de reserva de métricas ajustadas (CLS 0).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Source Serif 4',
      cssVariable: '--font-display',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [{ src: ['./src/assets/fonts/source-serif-4-latin-600-normal.woff2'], weight: 600, style: 'normal' }],
      },
    },
  ],
  markdown: {
    processor: satteri({
      features: { directive: true },
      mdastPlugins: [calloutPlugin],
      hastPlugins: [figurePlugin],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
