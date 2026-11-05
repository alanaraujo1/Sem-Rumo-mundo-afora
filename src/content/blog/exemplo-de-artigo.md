---
title: 'Modelo de artigo de viagem para copiar e editar'
description: 'Rascunho de referência com todos os campos do frontmatter. Duplique este arquivo e troque o conteúdo ao escrever um novo artigo.'
category: 'Modelo'
pubDate: 2026-11-04
author: 'Nome do Autor'
cover: '../../assets/blog/exemplo-capa.jpg'
coverAlt: 'Imagem provisória em tons de verde-azulado com silhuetas de montanhas, usada no modelo de artigo'
destination:
  name: 'Nome do destino'
  region: 'Estado ou região'
  countryCode: 'BR'
  coordinates:
    latitude: -15.79
    longitude: -47.88
tags:
  - modelo
draft: true
---

Este é um modelo. Com `draft: true`, ele aparece em `npm run dev`, mas fica fora do build de produção e do sitemap.

## Como usar

Duplique o arquivo, renomeie-o com o slug do artigo, substitua a capa e defina `draft: false` para publicar.

## Caixas de destaque

:::dica
Bloco `:::dica`, para uma recomendação pessoal do Alan Primo. Use somente com experiências reais.
:::

:::alerta
Bloco `:::alerta`, para riscos e cuidados que o leitor não pode ignorar.
:::

:::logistica
Bloco `:::logistica`, para transporte, horários e reservas.
:::

## Imagens

Uma imagem sozinha em um parágrafo vira figura, e o texto entre aspas vira a legenda, que aceita links:

![Imagem provisória em tons de verde-azulado com silhuetas de montanhas, na largura da coluna de texto](../../assets/blog/exemplo-capa.jpg "Legenda discreta, na largura do texto.")

Comece a legenda com `wide |` para a imagem ultrapassar a coluna:

![Imagem provisória em tons de verde-azulado com silhuetas de montanhas, mais larga que a coluna de texto](../../assets/blog/exemplo-capa.jpg "wide | Legenda de uma imagem horizontal ampla.")

Antes da barra, também é possível recortar sem deformar, informando a proporção e o foco horizontal e vertical:

![Imagem provisória em tons de verde-azulado com silhuetas de montanhas, recortada na proporção 16 por 9](../../assets/blog/exemplo-capa.jpg "16/9 50%,70% | Legenda de uma imagem recortada.")

### Subtítulo de exemplo

Títulos H2 e H3 entram automaticamente no sumário.
