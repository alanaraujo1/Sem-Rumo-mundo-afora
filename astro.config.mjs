// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO: troque pelo domínio definitivo. Canonical, Open Graph, JSON-LD,
  // sitemap e robots.txt derivam desta URL.
  site: 'https://blog-viagem.example.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
