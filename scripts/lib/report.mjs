// Formatação comum dos relatórios de terminal (GA4 e Search Console).
export const args = process.argv.slice(2);
export const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
export const flag = (name) => args.includes(`--${name}`);

export const int = (n) => Math.round(n).toLocaleString('pt-BR');
export const pct = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
export const dec = (n, digits = 1) => n.toFixed(digits).replace('.', ',');
export const share = (n, total) => (total ? pct(n / total) : '–');

export function table(title, headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) =>
    cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
  console.log(`\n${title}`);
  if (!rows.length) {
    console.log('(sem dados no período)');
    return;
  }
  console.log(line(headers));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  rows.forEach((r) => console.log(line(r)));
}
