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

## Protocolo de Revisão com Gemini
Sempre que eu pedir uma "segunda opinião", "revisão cruzada" ou "debate de planejamento":
1. Use as ferramentas do servidor MCP `gemini-cli` (wrapper `gemini-mcp-tool`, configurado em `.mcp.json`), por exemplo `ask-gemini`.
   - Usamos apenas o nível gratuito da API (sem faturamento). Em toda chamada de `ask-gemini` ou `brainstorm`, passe explicitamente `model: "gemini-3.5-flash-lite"`. Não deixe o modelo no padrão. O `.mcp.json` também fixa `GEMINI_MODEL=gemini-3.5-flash-lite` como reserva.
   - Testado em 25/11/2026: `gemini-3.5-flash-lite` respondeu (às vezes dá 503 por alta demanda; o CLI tenta de novo sozinho). `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-pro` e `gemini-2.5-flash` não estão mais disponíveis; `gemini-3-flash-preview`, `gemini-3.5-flash` (redirecionado para `gemini-3.8-flash`) e `gemini-3.1-pro-preview` têm cota gratuita de só 20 pedidos por dia. Se `gemini-3.5-flash-lite` falhar, tente `gemini-3-flash-preview` uma única vez e depois avise; não fique tentando vários modelos.
2. Passe o contexto relevante: um resumo do objetivo e os caminhos dos arquivos Markdown (`src/content/blog/*.md`) ou do código Astro (`src/**/*.astro`) envolvidos, usando a sintaxe `@caminho/do/arquivo` para o Gemini ler os arquivos da pasta atual. Nunca envie arquivos com segredos (`.env`, credenciais do GA4/gcloud).
3. Sintetize as sugestões do Gemini: aponte onde ele concorda ou diverge da sua análise e descarte o que contrariar este CLAUDE.md (SEO técnico, schema de frontmatter, regras de fotos e de publicação).
4. Proponha as melhorias finais e aguarde minha aprovação antes de editar os arquivos.
5. Se o MCP `gemini-cli` estiver indisponível, avise em vez de seguir sem a revisão.
