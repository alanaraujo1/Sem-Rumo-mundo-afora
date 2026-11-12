// @ts-check
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { calloutPlugin, figurePlugin } from './src/lib/markdown-plugins.mjs';

export default defineConfig({
  // Canonical, Open Graph, JSON-LD, sitemap e robots.txt derivam desta URL.
  site: 'https://semrumomundoafora.com.br',
  trailingSlash: 'always',
  integrations: [sitemap()],
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
