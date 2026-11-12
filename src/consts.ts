export const SITE_NAME = 'Sem Rumo Mundo Afora';
export const SITE_DESCRIPTION =
  'Roteiros, dicas práticas e relatos de viagem para planejar a sua próxima aventura com mais confiança.';
export const SITE_LOCALE = 'pt-BR';
export const GTM_ID = 'GTM-MMV8DDJ7';
export const CONTACT_EMAIL = 'contato@semrumomundoafora.com.br';
export const AUTHOR_NAME = 'Alan Primo';
export const INSTAGRAM = {
  blog: { handle: '@semrumomundoafora', url: 'https://www.instagram.com/semrumomundoafora/' },
  author: { handle: '@euprimoalan', url: 'https://www.instagram.com/euprimoalan/' },
} as const;
export const AUTHOR_BIO =
  'Alan Primo é realizador audiovisual, fotógrafo e criador de conteúdos focado em viagens, expedições e turismo de natureza. Com uma abordagem documental e visual, percorre destinos no Brasil e no mundo produzindo roteiros detalhados, guias práticos e registros de paisagens e cultura local. O Sem Rumo Mundo Afora reúne guias completos de ecoturismo, dicas reais de logística e planejamento independente de viagens.';

/** Rótulos legíveis das tags (slugs em kebab-case perdem acentos e maiúsculas). */
const TAG_LABELS: Record<string, string> = {
  andarai: 'Andaraí',
  bahia: 'Bahia',
  'cafe-especial': 'Café especial',
  'chapada-diamantina': 'Chapada Diamantina',
  'gruta-da-lapa-doce': 'Gruta da Lapa Doce',
  'gruta-da-pratinha': 'Gruta da Pratinha',
  'gruta-azul': 'Gruta Azul',
  'cachoeira-do-mosquito': 'Cachoeira do Mosquito',
  flutuacao: 'Flutuação',
  gastronomia: 'Gastronomia',
  lencois: 'Lençóis',
  mirantes: 'Mirantes',
  'morro-do-pai-inacio': 'Morro do Pai Inácio',
  mucuge: 'Mucugê',
  'nova-redencao': 'Nova Redenção',
  'pantanal-marimbus': 'Pantanal Marimbus',
  'passeio-de-barco': 'Passeio de barco',
  palmeiras: 'Palmeiras',
  'poco-azul': 'Poço Azul',
  'por-do-sol': 'Pôr do sol',
  'rio-roncador': 'Rio Roncador',
  'serra-das-paridas': 'Serra das Paridas',
  'vale-do-pati': 'Vale do Pati',
  'vinicola-uvva': 'Vinícola UVVA',
};

/** Rótulo de uma tag: do dicionário ou, sem acento conhecido, o slug com espaços e inicial maiúscula. */
export function tagLabel(slug: string) {
  const label = TAG_LABELS[slug] ?? slug.replaceAll('-', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
