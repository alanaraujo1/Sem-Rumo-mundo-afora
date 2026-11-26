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
- Autenticação (`scripts/lib/google-auth.mjs`): a conta de serviço `gsc-ga4-reader@sem-rumo-analytics.iam.gserviceaccount.com`, por personificação a partir do login do gcloud (`gcloud auth application-default login`). Não existe chave JSON: a organização bloqueia chaves de conta de serviço. A conta precisa ser Leitor no GA4 e usuária no Search Console. `GOOGLE_IMPERSONATE=0` usa o próprio login. Somente leitura; nada é enviado ao Google.
- Os números incluem apenas visitantes que aceitaram cookies de análise (Consent Mode v2 com tudo negado por padrão), então subestimam o tráfego real.

## Dados de busca (Search Console)
Use `npm run gsc` para ver buscas, páginas e oportunidades (páginas entre a 8ª e a 20ª posição, com a busca principal de cada uma) antes de otimizar artigos. Mesmas opções do GA4: `--days`, `--limit` e `--json`. Os dados têm uns 2 dias de atraso.
- `npm run gsc -- --inspect` confere a indexação de cada URL do sitemap (URL Inspection API, cota de 2.000 por dia): veredito, situação, último rastreio e se a canônica escolhida pelo Google bate com a do site.
- Para JSON, use `npm run -s` (sem o `-s`, o npm imprime um cabeçalho que quebra o JSON).

## Mídias do Google Photos
`npm run photos -- --dest <pasta>` abre o Google Photos no navegador para eu marcar fotos e vídeos e baixa os escolhidos em resolução original (fotos com `=d`, vídeos com `=dv`) pela Google Photos Picker API.
- Script: `scripts/photos-picker.mjs`. Projeto `sem-rumo-analytics`, API `photospicker.googleapis.com`, escopo somente leitura `photospicker.mediaitems.readonly`.
- Credenciais fora do Git: cliente OAuth desktop em `~/.config/gcloud/photos-oauth.json` e refresh token em `~/.config/gcloud/photos-token.json` (permissão 600, criado no primeiro login). Nunca copie esses arquivos para o repositório nem os envie ao Gemini.
- Cada arquivo baixado fica com a data de captura como data de modificação, e a pasta ganha um `photos-manifest.json` com tipo, data de captura, dimensões, câmera e metadados de foto/vídeo de cada item.
- O Google pode entregar vídeos recodificados (testado em 25/11/2026: vídeos 4K HDR do iPhone vieram em 1080×1920 H.264 SDR). O script compara com a resolução original, avisa no terminal e grava `downgraded: true` no manifesto; `--check` confere uma pasta já baixada. Para vídeos 4K originais, use o app Fotos, o site photos.google.com ou o Google Takeout.
- Destino recomendado: uma pasta em `fotos-originais/<destino>/` (fora do Git) ou no SSD/Documents. Não baixe direto em `src/assets/`: os originais podem trazer EXIF e GPS e são pesados demais para o repositório.
- Para artigos (Torres del Paine, El Calafate, El Chaltén e próximos): leia o `photos-manifest.json` para ordenar por horário e montar as legendas com hora, escolha as fotos, aplique a rotina de fotos do blog (LUT, conversão para `.webp` sem EXIF/GPS, lado maior até 1600 px) e só então grave em `src/assets/blog/<slug>/`.
- Para Reels: use os vídeos baixados como fonte. Os baixados por este comando já vêm em SDR Rec.709 (não aplique tone mapping); os originais do iPhone (app Fotos, SSD) vêm em HEVC HDR (HLG) e precisam do tone mapping HDR→SDR antes da cor.

## Protocolo de Revisão com Gemini
Sempre que eu pedir uma "segunda opinião", "revisão cruzada" ou "debate de planejamento":
1. Use as ferramentas do servidor MCP `gemini-cli` (wrapper `gemini-mcp-tool`, configurado em `.mcp.json`), por exemplo `ask-gemini`.
   - Usamos apenas o nível gratuito da API (sem faturamento). Em toda chamada de `ask-gemini` ou `brainstorm`, passe explicitamente `model: "gemini-3.5-flash-lite"`. Não deixe o modelo no padrão. O `.mcp.json` também fixa `GEMINI_MODEL=gemini-3.5-flash-lite` como reserva.
   - Testado em 25/11/2026: `gemini-3.5-flash-lite` respondeu (às vezes dá 503 por alta demanda; o CLI tenta de novo sozinho). `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-pro` e `gemini-2.5-flash` não estão mais disponíveis; `gemini-3-flash-preview`, `gemini-3.5-flash` (redirecionado para `gemini-3.8-flash`) e `gemini-3.1-pro-preview` têm cota gratuita de só 20 pedidos por dia. Com o `gemini-3.5-flash-lite`, envie pedidos enxutos e objetivos: nada de anexar artigos inteiros de ~3.000 palavras com `@arquivo` de uma vez (o stream corta com `Incomplete JSON segment at the end`). Mande só o trecho necessário (título, headings, FAQ, slugs, parágrafos específicos), divida revisões grandes em pedidos por tema e peça respostas diretas em tópicos curtos. Se `gemini-3.5-flash-lite` falhar, tente `gemini-3-flash-preview` uma única vez e depois avise; não fique tentando vários modelos.
2. Passe o contexto relevante: um resumo do objetivo e os caminhos dos arquivos Markdown (`src/content/blog/*.md`) ou do código Astro (`src/**/*.astro`) envolvidos, usando a sintaxe `@caminho/do/arquivo` para o Gemini ler os arquivos da pasta atual. Nunca envie arquivos com segredos (`.env`, credenciais do GA4/gcloud).
3. Sintetize as sugestões do Gemini: aponte onde ele concorda ou diverge da sua análise e descarte o que contrariar este CLAUDE.md (SEO técnico, schema de frontmatter, regras de fotos e de publicação).
4. Proponha as melhorias finais e aguarde minha aprovação antes de editar os arquivos.
5. Se o MCP `gemini-cli` estiver indisponível, avise em vez de seguir sem a revisão.
