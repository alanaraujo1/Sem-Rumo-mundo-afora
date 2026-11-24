import { AD_SLOTS, adUnitHtml } from './ads.mjs';
const CALLOUTS = {
  dica: 'Dica do Alan',
  alerta: 'Alerta Prático',
  logistica: 'Logística',
};

/**
 * Devolve os parágrafos de uma galeria com as imagens marcadas como `thumb` (e `lead` a primeira), mantendo as
 * demais opções e a legenda. O figurePlugin usa essas marcas para a classe e o `sizes` de miniatura.
 * Os nós recebidos são somente leitura, por isso são copiados.
 */
function galleryChildren(node) {
  // Uma imagem por parágrafo (linha em branco entre elas), para cada uma virar um <figure>.
  const images = node.children.map((child) => {
    if (child.type !== 'paragraph') return null;
    const content = child.children.filter((item) => item.type !== 'text' || item.value.trim());
    return content.length === 1 && content[0].type === 'image' ? content[0] : null;
  });
  if (images.includes(null) || images.length < 2) {
    throw new Error('Bloco ":::galeria" aceita só imagens, uma por parágrafo (separadas por linha em branco), e pelo menos duas.');
  }
  return images.map((image, index) => {
    const title = image.title ?? '';
    const separator = title.indexOf('|');
    const head = separator === -1 ? '' : title.slice(0, separator).trim();
    const caption = separator === -1 ? title : title.slice(separator + 1);
    const tokens = ['thumb', ...(index === 0 ? ['lead'] : []), ...(head ? head.split(/\s+/) : [])];
    return { type: 'paragraph', children: [{ ...image, title: `${tokens.join(' ')} | ${caption.trim()}` }] };
  });
}

/** Blocos `:::dica`, `:::alerta`, `:::logistica` e `:::galeria`. Nome desconhecido interrompe o build. */
export const calloutPlugin = {
  name: 'callouts',
  containerDirective(node, ctx) {
    if (node.name === 'galeria') {
      ctx.replaceNode(node, {
        type: 'blockquote',
        data: { hName: 'div', hProperties: { className: ['article-gallery'] } },
        children: galleryChildren(node),
      });
      return;
    }
    const title = CALLOUTS[node.name];
    if (!title) {
      throw new Error(`Bloco ":::${node.name}" desconhecido. Use: ${[...Object.keys(CALLOUTS), 'galeria'].join(', ')}.`);
    }
    ctx.replaceNode(node, {
      type: 'blockquote',
      data: { hName: 'aside', hProperties: { className: ['callout', `callout-${node.name}`] } },
      children: [
        {
          type: 'paragraph',
          data: { hProperties: { className: ['callout-title'] } },
          children: [{ type: 'text', value: title }],
        },
        ...node.children,
      ],
    });
  },
};

/** Converte `[texto](https://...)` da legenda em links. O título de imagem é texto puro no Markdown. */
function captionChildren(caption) {
  const children = [];
  let last = 0;
  for (const match of caption.matchAll(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g)) {
    children.push({ type: 'text', value: caption.slice(last, match.index) });
    children.push({
      type: 'element',
      tagName: 'a',
      properties: { href: match[2], rel: 'noopener' },
      children: [{ type: 'text', value: match[1] }],
    });
    last = match.index + match[0].length;
  }
  children.push({ type: 'text', value: caption.slice(last) });
  return children;
}

/** Separa o crédito final ("... Foto: Alan Primo") para exibi-lo em estilo próprio. */
function figcaptionChildren(caption) {
  const match = caption.match(/^(.*?)\s*(Foto: .+?)\.?$/s);
  if (!match) return captionChildren(caption);
  const [, text, credit] = match;
  return [
    ...(text ? captionChildren(text) : []),
    {
      type: 'element',
      tagName: 'span',
      properties: { className: ['figure-credit'] },
      children: captionChildren(credit),
    },
  ];
}

const OPTION = /^(?:wide|thumb|lead|\d+\/\d+|\d+%,\d+%)$/;

/** Separa as opções ("wide 16/9 50%,40% | Legenda") da legenda. */
function parseImageTitle(title) {
  const separator = title.indexOf('|');
  const head = (separator === -1 ? title : title.slice(0, separator)).trim();
  const tokens = head.split(/\s+/);
  if (!head || !tokens.every((token) => OPTION.test(token))) return { caption: title.trim() };
  return {
    isWide: tokens.includes('wide'),
    isThumb: tokens.includes('thumb'),
    isLead: tokens.includes('lead'),
    ratio: tokens.find((token) => token.includes('/')),
    position: tokens.find((token) => token.includes('%')),
    caption: separator === -1 ? '' : title.slice(separator + 1).trim(),
  };
}

const MIN_ALT_LENGTH = 30;

/**
 * Transforma um parágrafo com uma única imagem em <figure>:
 * `![alt](foto.jpg "Legenda")` ou, com opções antes da barra, `![alt](foto.jpg "wide 16/9 50%,40% | Legenda")`.
 * `wide` ultrapassa a coluna; a proporção recorta por CSS, sem deformar, e o par de porcentagens define o foco.
 * `thumb` e `lead` são postas pelo bloco `:::galeria`; não é preciso escrevê-las.
 */
export const figurePlugin = {
  name: 'figures',
  element: {
    filter: ['p', 'img'],
    visit(node, ctx) {
      if (node.tagName === 'img') {
        const alt = String(node.properties?.alt ?? '').trim();
        if (alt.length < MIN_ALT_LENGTH) {
          throw new Error(
            `Imagem "${node.properties?.src}": descreva a foto e o contexto no alt, com pelo menos ${MIN_ALT_LENGTH} caracteres.`,
          );
        }
        return;
      }

      const content = node.children.filter((child) => child.type !== 'text' || child.value.trim());
      const [image] = content;
      if (content.length !== 1 || image.tagName !== 'img') return;

      const { title = '', ...properties } = image.properties;
      const { isWide, isThumb, isLead, ratio: chosenRatio, position, caption } = parseImageTitle(title);
      // Miniaturas de galeria sempre têm recorte (4/3 por padrão), para alinhar a grade.
      const ratio = chosenRatio ?? (isThumb ? '4/3' : undefined);
      const classNames = ['article-figure'];
      if (isThumb) classNames.push('article-figure-thumb');
      else if (isWide) classNames.push('article-figure-wide');
      // Miniaturas não usam a classe de recorte, para não entrarem na regra de pares lado a lado.
      if (ratio && !isThumb) classNames.push('article-figure-crop');
      const cropStyle = ratio
        ? `--figure-ratio: ${ratio}; --figure-position: ${(position ?? '50%,50%').replace(',', ' ')}`
        : undefined;
      // No celular, a primeira miniatura ocupa a largura toda e as outras, meia coluna.
      const thumbSizes = isLead
        ? '(min-width: 1056px) 330px, (min-width: 640px) calc((100vw - 4rem) / 3), calc(100vw - 2rem)'
        : '(min-width: 1056px) 330px, (min-width: 640px) calc((100vw - 4rem) / 3), calc(50vw - 1.375rem)';

      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'figure',
        properties: { className: classNames, ...(cropStyle && { style: cropStyle }) },
        children: [
          {
            type: 'element',
            tagName: 'img',
            properties: {
              ...properties,
              layout: 'constrained',
              // O dobro desta largura limita o maior arquivo do srcset: com 800 (ou 1024), o Astro gera a versão
              // de 1600px, usada pelo lightbox. O que o navegador baixa na página continua decidido pelo `sizes`.
              width: isWide && !isThumb ? 1024 : 800,
              sizes: isThumb
                ? thumbSizes
                : isWide
                  ? '(min-width: 1056px) 1024px, calc(100vw - 2rem)'
                  : '(min-width: 752px) 720px, calc(100vw - 2rem)',
              loading: 'lazy',
              decoding: 'async',
            },
            children: [],
          },
          ...(caption ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: figcaptionChildren(caption) }] : []),
        ],
      });
    },
  },
};

// Títulos de fechamento: o anúncio do meio nunca entra logo antes deles.
const CLOSING_SECTIONS = /^(perguntas frequentes|fontes consultadas|próxima parada|fim da viagem)/i;

/**
 * Bloco de anúncio do meio do artigo, antes do 4º <h2> (ou do 3º, se o 4º já for uma seção de fechamento).
 * Entra entre seções, então nunca separa pares de fotos, galerias ou tabelas. A página decide se os anúncios
 * aparecem (artigos com mais de 800 palavras); nos demais, o bloco fica oculto e nenhum script é carregado.
 */
export const adPlugin = {
  name: 'ads',
  before(root, ctx) {
    const sections = root.children.filter((node) => node.type === 'element' && node.tagName === 'h2');
    const target = [sections[3], sections[2]].find((h2) => h2 && !CLOSING_SECTIONS.test(ctx.textContent(h2).trim()));
    if (!target) return;
    ctx.insertBefore(target, { type: 'raw', value: adUnitHtml({ slot: AD_SLOTS.articleMiddle }) });
  },
};
