// Autenticação dos scripts de relatório (GA4 e Search Console).
//
// Não há chave JSON: a organização do projeto bloqueia chaves de conta de serviço
// (iam.disableServiceAccountKeyCreation). Em vez disso, o login do gcloud (Application Default
// Credentials) gera tokens temporários em nome da conta de serviço, que só tem leitura no GA4 e
// no Search Console. Configuração, uma vez só:
//   gcloud auth application-default login
//   (a conta precisa do papel roles/iam.serviceAccountTokenCreator na conta de serviço)
//
// GOOGLE_IMPERSONATE=0 usa o próprio login do gcloud, sem a conta de serviço.
import { GoogleAuth, Impersonated } from 'google-auth-library';

export const SERVICE_ACCOUNT =
  process.env.GOOGLE_SERVICE_ACCOUNT ?? 'gsc-ga4-reader@sem-rumo-analytics.iam.gserviceaccount.com';

export const SCOPES = {
  analytics: 'https://www.googleapis.com/auth/analytics.readonly',
  searchConsole: 'https://www.googleapis.com/auth/webmasters.readonly',
};

export const impersonating = process.env.GOOGLE_IMPERSONATE !== '0';

export async function authClient(scopes) {
  if (!impersonating) return new GoogleAuth({ scopes }).getClient();
  const sourceClient = await new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  }).getClient();
  // O construtor avisa que não valida configurações vindas de fora; aqui ela é fixa no código.
  const warn = console.warn;
  console.warn = (msg, ...rest) => (/Impersonated` constructor/.test(String(msg)) ? undefined : warn(msg, ...rest));
  try {
    return new Impersonated({ sourceClient, targetPrincipal: SERVICE_ACCOUNT, targetScopes: scopes, lifetime: 3600 });
  } finally {
    console.warn = warn;
  }
}

export function authHint(error) {
  const text = `${error?.details ?? ''} ${error?.message ?? ''}`;
  if (/getAccessToken|impersonat|iam\.serviceAccounts/i.test(text)) {
    return (
      `Não foi possível agir como ${SERVICE_ACCOUNT}. Confira se o seu login tem o papel ` +
      `"Criador de token da conta de serviço" nela, ou refaça: gcloud auth application-default login`
    );
  }
  if (/default credentials|invalid_grant|reauth/i.test(text)) return 'Refaça o login: gcloud auth application-default login';
  return null;
}
