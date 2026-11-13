// Relatório do GA4 (Data API) para orientar otimizações e novos artigos.
//
// Autenticação: Application Default Credentials do gcloud, com escopo analytics.readonly:
//   gcloud auth application-default login \
//     --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform
//   gcloud auth application-default set-quota-project sem-rumo-analytics
//
// Uso:
//   npm run ga4                     últimos 28 dias
//   npm run ga4 -- --days 90        outro período
//   npm run ga4 -- --limit 50       mais linhas por tabela
//   npm run ga4 -- --json           saída em JSON (para análise automatizada)
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? '562396412';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const days = option('days', 28);
const limit = option('limit', 25);
const asJson = args.includes('--json');

const property = `properties/${PROPERTY_ID}`;
// "yesterday" como fim, igual aos relatórios padrão do GA4 (o dia corrente ainda está incompleto).
const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }];
const client = new BetaAnalyticsDataClient();

async function run(dimension, metrics, orderMetric) {
  const [response] = await client.runReport({
    property,
    dateRanges,
    dimensions: [{ name: dimension }],
    metrics: metrics.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: orderMetric }, desc: true }],
    metricAggregations: ['TOTAL'],
    limit,
  });
  const toRow = (r) => ({
    [dimension]: r.dimensionValues?.[0]?.value ?? '(total)',
    ...Object.fromEntries(metrics.map((m, i) => [m, Number(r.metricValues[i].value)])),
  });
  return {
    rows: (response.rows ?? []).map(toRow),
    total: response.totals?.[0] ? toRow(response.totals[0]) : null,
    rowCount: response.rowCount ?? 0,
  };
}

let pages, sources, devices;
try {
  [pages, sources, devices] = await Promise.all([
    run('pagePath', ['screenPageViews', 'activeUsers', 'userEngagementDuration', 'engagementRate'], 'screenPageViews'),
    run('sessionSourceMedium', ['sessions', 'activeUsers', 'engagementRate'], 'sessions'),
    run('deviceCategory', ['activeUsers', 'sessions', 'screenPageViews'], 'activeUsers'),
  ]);
} catch (error) {
  // Erros de autenticação/permissão vêm do gRPC com um stack enorme; basta a mensagem.
  console.error(`Falha ao consultar o GA4 (propriedade ${PROPERTY_ID}):\n${error.details ?? error.message}`);
  if (error.code === 7 && /has not been used|disabled/.test(error.details ?? '')) {
    console.error('\nAtive a API com: gcloud services enable analyticsdata.googleapis.com --project sem-rumo-analytics');
  } else if (error.code === 7) {
    console.error('\nConfira se a conta do gcloud tem acesso de leitura à propriedade no GA4 (Administrador > Gerenciamento de acesso).');
  } else if (error.code === 16 || /default credentials/i.test(error.message)) {
    console.error('\nRefaça o login: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform');
  }
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify({ propertyId: PROPERTY_ID, days, pages, sources, devices }, null, 2));
  process.exit(0);
}

const int = (n) => n.toLocaleString('pt-BR');
const pct = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
const share = (n, total) => (total ? pct(n / total) : '–');
// Tempo médio de engajamento por usuário ativo, como no GA4.
const avgTime = (seconds, users) => {
  if (!users) return '–';
  const s = Math.round(seconds / users);
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
};

function table(title, headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) =>
    cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
  console.log(`\n${title}`);
  console.log(line(headers));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  rows.forEach((r) => console.log(line(r)));
}

console.log(`GA4 · propriedade ${PROPERTY_ID} · últimos ${days} dias (até ontem)`);

const pageRow = (r) => [
  r.pagePath,
  int(r.screenPageViews),
  int(r.activeUsers),
  avgTime(r.userEngagementDuration, r.activeUsers),
  pct(r.engagementRate),
];
table(
  `Páginas (${pages.rows.length} de ${pages.rowCount})`,
  ['Página', 'Views', 'Usuários', 'Tempo médio', 'Engajamento'],
  [...pages.rows.map(pageRow), ...(pages.total ? [pageRow({ ...pages.total, pagePath: 'TOTAL' })] : [])],
);

table(
  `Origem / mídia (${sources.rows.length} de ${sources.rowCount})`,
  ['Origem / mídia', 'Sessões', '% sessões', 'Usuários', 'Engajamento'],
  sources.rows.map((r) => [
    r.sessionSourceMedium,
    int(r.sessions),
    share(r.sessions, sources.total?.sessions),
    int(r.activeUsers),
    pct(r.engagementRate),
  ]),
);

table(
  'Dispositivos',
  ['Dispositivo', 'Usuários', '% usuários', 'Sessões', 'Views'],
  devices.rows.map((r) => [
    r.deviceCategory,
    int(r.activeUsers),
    share(r.activeUsers, devices.total?.activeUsers),
    int(r.sessions),
    int(r.screenPageViews),
  ]),
);
