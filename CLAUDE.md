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

## Dados reais de audiência (GA4)
Antes de otimizar artigos existentes ou planejar novos conteúdos, consulte o desempenho real com `npm run ga4`.
- O script `scripts/ga4-report.mjs` usa a GA4 Data API (`@google-analytics/data`) na propriedade `562396412` (fluxo G-7J2J6VVT7P, dentro do GTM-MMV8DDJ7).
- Ele mostra os últimos 28 dias, até ontem: views, usuários, tempo médio de engajamento e taxa de engajamento por página, além de origem/mídia e dispositivos.
- Opções: `npm run ga4 -- --days 90`, `--limit 50` e `--json` (saída para análise automatizada).
- Autenticação: Application Default Credentials do gcloud com escopo `analytics.readonly`, projeto de cota `sem-rumo-analytics` (a API "Google Analytics Data API" precisa estar ativada nele). Somente leitura; nada é enviado ao GA.
- Os números incluem apenas visitantes que aceitaram cookies de análise (Consent Mode v2 com tudo negado por padrão), então subestimam o tráfego real.
