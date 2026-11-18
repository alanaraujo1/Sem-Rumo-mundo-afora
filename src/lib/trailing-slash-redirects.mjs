// Integração do Astro que gera `_redirects` com um 301 de cada página sem barra final para a URL canônica.
//
// Sem isso, o Static Assets da Cloudflare redireciona `/blog/slug` → `/blog/slug/` com 307 (temporário),
// e o Search Console acusa "Erro de redirecionamento" nas variantes sem barra.
// As regras são exatas (uma por página), para nunca afetar arquivos como robots.txt ou sitemap-index.xml.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @returns {import('astro').AstroIntegration} */
export function trailingSlashRedirects() {
  return {
    name: 'trailing-slash-redirects',
    hooks: {
      'astro:build:done': ({ dir, pages, logger }) => {
        const rules = pages
          .map(({ pathname }) => '/' + pathname.replace(/\/$/, ''))
          .filter((path) => path !== '/' && path !== '/404')
          .sort()
          .map((path) => `${path} ${path}/ 301`);
        writeFileSync(
          fileURLToPath(new URL('_redirects', dir)),
          `# Gerado por src/lib/trailing-slash-redirects.mjs\n${rules.join('\n')}\n`,
        );
        logger.info(`_redirects: ${rules.length} regras 301 (sem barra → com barra)`);
      },
    },
  };
}
