/**
 * Ambientes Longyu (build-time / runtime).
 *
 * - development: `npm run dev` (Vite DEV)
 * - preview: Deploy Preview / staging (VITE_APP_ENV=preview)
 * - qa_candidate: RC2 candidate production-like em QA (VITE_APP_ENV=qa_candidate)
 * - production_beta: site principal da beta pública
 *
 * Variáveis de preview (ex.: VITE_ALLOW_PRO_PREVIEW) nunca devem valer em
 * nenhum ambiente production-like — nem no ambiente principal, nem no candidate.
 *
 * RC2.2: antes desta remessa, um build com VITE_APP_ENV=qa_candidate caía no
 * fallback e era resolvido como production_beta. Isso tornava o candidate
 * indistinguível do ambiente principal em runtime (rótulo, diagnóstico e flags),
 * que é exatamente o que a certificação do candidate precisa distinguir.
 */

export type AppEnvironment = "development" | "preview" | "qa_candidate" | "production_beta";

export const APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  "development",
  "preview",
  "qa_candidate",
  "production_beta",
] as const;

/** Subconjunto de ImportMetaEnv usado nas checagens (testável sem Vite completo). */
export type AppEnvironmentInput = {
  DEV?: boolean;
  MODE?: string;
  VITE_APP_ENV?: string;
  VITE_ALLOW_PRO_PREVIEW?: string;
  VITE_USE_TEST_FIXTURES?: string;
};

export function resolveAppEnvironment(env: AppEnvironmentInput = import.meta.env): AppEnvironment {
  if (env.DEV === true) return "development";

  const raw = String(env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (raw === "development" || raw === "dev") return "development";
  if (raw === "preview" || raw === "deploy_preview" || raw === "staging") return "preview";
  if (raw === "qa_candidate" || raw === "rc2_candidate" || raw === "candidate" || raw === "qa") {
    return "qa_candidate";
  }
  if (raw === "production_beta" || raw === "production" || raw === "prod" || raw === "beta") {
    return "production_beta";
  }

  // Build de produção sem VITE_APP_ENV → beta pública (ambiente principal).
  if (env.MODE === "production") return "production_beta";
  return "production_beta";
}

export function isDevelopmentEnv(env: AppEnvironmentInput = import.meta.env): boolean {
  return resolveAppEnvironment(env) === "development";
}

export function isPreviewEnv(env: AppEnvironmentInput = import.meta.env): boolean {
  return resolveAppEnvironment(env) === "preview";
}

export function isProductionBetaEnv(env: AppEnvironmentInput = import.meta.env): boolean {
  return resolveAppEnvironment(env) === "production_beta";
}

/** RC2 candidate publicado em QA (backend Supabase QA, sem fixtures). */
export function isQaCandidateEnv(env: AppEnvironmentInput = import.meta.env): boolean {
  return resolveAppEnvironment(env) === "qa_candidate";
}

/**
 * Ambientes production-like: beta pública e RC2 candidate.
 *
 * O candidate existe para ser testado como a beta pública seria. Qualquer
 * afrouxamento que valha só em dev/preview (Pro Preview, fixtures, QA Fast Path,
 * conta local) precisa continuar desligado aqui — senão o que foi certificado
 * não é o que vai ao ar.
 */
export function isProductionLikeEnv(env: AppEnvironmentInput = import.meta.env): boolean {
  const appEnv = resolveAppEnvironment(env);
  return appEnv === "production_beta" || appEnv === "qa_candidate";
}

/** Rótulo curto para UI/admin. */
export function appEnvironmentLabel(env: AppEnvironmentInput = import.meta.env): string {
  switch (resolveAppEnvironment(env)) {
    case "development":
      return "Development";
    case "preview":
      return "Preview";
    case "qa_candidate":
      return "QA Candidate";
    default:
      return "Production Beta";
  }
}

/**
 * Pro Preview local só em Development, ou em Preview com flag explícita.
 * Nunca em ambiente production-like (Production Beta ou QA Candidate),
 * mesmo se a flag vazar no build.
 */
export function isProPreviewBuildAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  if (isProductionLikeEnv(env)) return false;
  if (isDevelopmentEnv(env)) return true;
  return env.VITE_ALLOW_PRO_PREVIEW === "true";
}

/** Fixtures / dados de teste nunca em ambiente production-like. */
export function isTestFixturesAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  if (isProductionLikeEnv(env)) return false;
  if (isDevelopmentEnv(env)) return env.VITE_USE_TEST_FIXTURES === "true" || env.DEV === true;
  return env.VITE_USE_TEST_FIXTURES === "true";
}

/**
 * QA Fast Path (`/qa`) só em development ou preview.
 * Nunca em ambiente production-like, mesmo se alguém colar a URL ou um marker
 * no storage. O candidate QA é testado pelos caminhos reais do aluno.
 */
export function isQaFastPathAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  if (isProductionLikeEnv(env)) return false;
  return isDevelopmentEnv(env) || isPreviewEnv(env);
}
