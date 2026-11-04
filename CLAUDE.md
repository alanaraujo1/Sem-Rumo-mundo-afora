# Instruções Operacionais do Blog de Viagem

Você gerencia este blog de viagens construído em Astro + Tailwind CSS.
Sua função é criar código, manter o site e redigir artigos com foco em SEO técnico máximo (Schema.org JSON-LD, Core Web Vitals e semântica impecável).

## Regras de Execução Autônoma:
1. Quando solicitado um novo artigo, crie o arquivo em `src/content/blog/<slug>.md` seguindo o schema rigoroso de frontmatter.
2. Todas as fotos usadas devem conter atributos alt detalhados e contextuais.
3. Antes de publicar qualquer alteração, valide executando: `npm run build`.
4. Se o build passar com sucesso, execute:
   git add .
   git commit -m "feat: publicar novo artigo <slug>"
   git push origin main
5. Se o build falhar, corrija os erros de frontmatter ou tags antes de tentar o push.
