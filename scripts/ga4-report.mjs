// Relatório do GA4 (Data API) para orientar otimizações e novos artigos.
//
// Autenticação: conta de serviço gsc-ga4-reader, por personificação (ver scripts/lib/google-auth.mjs).
// Ela precisa ser Leitor na propriedade do GA4 (Administrador > Gerenciamento de acesso à propriedade).
//
// Uso:
//   npm run ga4                     últimos 28 dias
//   npm run ga4 -- --days 90        outro período
//   npm run ga4 -- --limit 50       mais linhas por tabela
//   npm run ga4 -- --json           saída em JSON (para análise automatizada)
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { authClient, authHint, impersonating, SCOPES, SERVICE_ACCOUNT } from './lib/google-auth.mjs';
import { flag, int, option, pct, share, table } from './lib/report.mjs';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? '562396412';

const days = option('days', 28);
const limit = option('limit', 25);
const asJson = flag('json');

const property = `properties/${PROPERTY_ID}`;
// "yesterday" como fim, igual aos relatórios padrão do GA4 (o dia corrente ainda está incompleto).
const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }];
const client = new BetaAnalyticsDataClient({ authClient: await authClient([SCOPES.analytics]) });

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
  } else if (authHint(error)) {
    console.error(`\n${authHint(error)}`);
  } else if (error.code === 7) {
    const who = impersonating ? SERVICE_ACCOUNT : 'a conta do gcloud';
    console.error(`\nConfira se ${who} é Leitor na propriedade do GA4 (Administrador > Gerenciamento de acesso à propriedade).`);
  }
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify({ propertyId: PROPERTY_ID, days, pages, sources, devices }, null, 2));
  process.exit(0);
}

// Tempo médio de engajamento por usuário ativo, como no GA4.
const avgTime = (seconds, users) => {
  if (!users) return '–';
  const s = Math.round(seconds / users);
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
};

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
