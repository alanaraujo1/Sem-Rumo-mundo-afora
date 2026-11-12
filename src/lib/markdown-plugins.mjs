const CALLOUTS = {
  dica: 'Dica do Alan',
  alerta: 'Alerta Prático',
  logistica: 'Logística',
};

/** Blocos `:::dica`, `:::alerta` e `:::logistica`. Nome desconhecido interrompe o build. */
export const calloutPlugin = {
  name: 'callouts',
  containerDirective(node, ctx) {
    const title = CALLOUTS[node.name];
    if (!title) {
      throw new Error(`Bloco ":::${node.name}" desconhecido. Use: ${Object.keys(CALLOUTS).join(', ')}.`);
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

const OPTION = /^(?:wide|\d+\/\d+|\d+%,\d+%)$/;

/** Separa as opções ("wide 16/9 50%,40% | Legenda") da legenda. */
function parseImageTitle(title) {
  const separator = title.indexOf('|');
  const head = (separator === -1 ? title : title.slice(0, separator)).trim();
  const tokens = head.split(/\s+/);
  if (!head || !tokens.every((token) => OPTION.test(token))) return { caption: title.trim() };
  return {
    isWide: tokens.includes('wide'),
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
      const { isWide, ratio, position, caption } = parseImageTitle(title);
      const classNames = ['article-figure'];
      if (isWide) classNames.push('article-figure-wide');
      if (ratio) classNames.push('article-figure-crop');
      const cropStyle = ratio
        ? `--figure-ratio: ${ratio}; --figure-position: ${(position ?? '50%,50%').replace(',', ' ')}`
        : undefined;

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
              width: isWide ? 1024 : 720,
              sizes: isWide
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
