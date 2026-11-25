/**
 * Gera o nó FAQPage (Schema.org) a partir da seção "## Perguntas frequentes" do Markdown do artigo:
 * cada "### Pergunta" vira uma Question, e o texto até o próximo título vira a resposta.
 */
const plain = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function faqSchema(body: string | undefined, pageUrl: string): Record<string, unknown> | undefined {
  if (!body) return undefined;
  const section = body.match(/^## Perguntas frequentes\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
  if (!section) return undefined;
  const mainEntity = section
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [question, ...rest] = block.split('\n');
      return { question: plain(question), answer: plain(rest.join('\n')) };
    })
    .filter(({ question, answer }) => question && answer)
    .map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    }));
  return mainEntity.length ? { '@type': 'FAQPage', '@id': `${pageUrl}#faq`, mainEntity } : undefined;
}
