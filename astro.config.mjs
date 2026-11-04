// @ts-check
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { calloutPlugin, figurePlugin } from './src/lib/markdown-plugins.mjs';

export default defineConfig({
  // Canonical, Open Graph, JSON-LD, sitemap e robots.txt derivam desta URL.
  site: 'https://semrumomundoafora.com.br',
  trailingSlash: 'always',
  integrations: [sitemap()],
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
