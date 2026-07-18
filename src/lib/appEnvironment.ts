/**
 * Ambientes Longyu (build-time / runtime).
 *
 * - development: `npm run dev` (Vite DEV)
 * - preview: Deploy Preview / staging (VITE_APP_ENV=preview)
 * - production_beta: site principal da beta pública
 *
 * Variáveis de preview (ex.: VITE_ALLOW_PRO_PREVIEW) nunca devem valer no ambiente principal.
 */

export type AppEnvironment = "development" | "preview" | "production_beta";

export const APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  "development",
  "preview",
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

/** Rótulo curto para UI/admin. */
export function appEnvironmentLabel(env: AppEnvironmentInput = import.meta.env): string {
  switch (resolveAppEnvironment(env)) {
    case "development":
      return "Development";
    case "preview":
      return "Preview";
    default:
      return "Production Beta";
  }
}

/**
 * Pro Preview local só em Development, ou em Preview com flag explícita.
 * Nunca no ambiente principal (Production Beta), mesmo se a flag vazar no build.
 */
export function isProPreviewBuildAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  const appEnv = resolveAppEnvironment(env);
  if (appEnv === "production_beta") return false;
  if (appEnv === "development") return true;
  return env.VITE_ALLOW_PRO_PREVIEW === "true";
}

/** Fixtures / dados de teste nunca no ambiente principal. */
export function isTestFixturesAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  if (isProductionBetaEnv(env)) return false;
  if (isDevelopmentEnv(env)) return env.VITE_USE_TEST_FIXTURES === "true" || env.DEV === true;
  return env.VITE_USE_TEST_FIXTURES === "true";
}
