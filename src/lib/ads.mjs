// Google AdSense: blocos manuais (Anúncios Automáticos desativados no painel).
// Usado pelo componente AdUnit.astro e pelo plugin de Markdown que põe o bloco do meio no artigo.

export const AD_CLIENT = 'ca-pub-2816945091894214';
export const AD_SLOTS = { articleMiddle: '6061768352', articleEnd: '6115533855' };
/** Artigos com até este número de palavras não exibem anúncios. */
export const AD_MIN_WORDS = 800;

const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Marcação de um bloco de anúncio. A altura mínima do contêiner reserva o espaço antes de o anúncio chegar
 * (CLS 0). O `push` do adsbygoogle é feito pelo carregador da página, uma vez por bloco.
 */
export function adUnitHtml({ slot, format = 'auto', label = 'Publicidade' }) {
  return (
    `<aside class="ad-unit not-prose my-10 rounded-xl border border-stone-200/70 bg-stone-50/40 px-4 py-3" aria-label="${escape(label)}">` +
    `<p class="mb-2 text-center text-[10px] tracking-wider text-stone-500 uppercase">${escape(label)}</p>` +
    `<div class="min-h-[280px]">` +
    `<ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${escape(slot)}" ` +
    `data-ad-format="${escape(format)}" data-full-width-responsive="true"></ins>` +
    `</div></aside>`
  );
}
