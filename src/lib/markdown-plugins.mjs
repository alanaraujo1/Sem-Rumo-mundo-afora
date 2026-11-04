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

const WIDE_PREFIX = /^wide\s*(?:\|\s*|$)/;
const MIN_ALT_LENGTH = 30;

/**
 * Transforma um parágrafo com uma única imagem em <figure>:
 * `![alt](foto.jpg "Legenda")` ou, para ultrapassar a coluna, `![alt](foto.jpg "wide | Legenda")`.
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
      const isWide = WIDE_PREFIX.test(title);
      const caption = title.replace(WIDE_PREFIX, '').trim();

      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'figure',
        properties: { className: isWide ? ['article-figure', 'article-figure-wide'] : ['article-figure'] },
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
          ...(caption
            ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: captionChildren(caption) }]
            : []),
        ],
      });
    },
  },
};
