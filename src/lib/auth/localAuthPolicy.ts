import {
  isDevelopmentEnv,
  isPreviewEnv,
  isProductionBetaEnv,
  type AppEnvironmentInput,
} from "../appEnvironment";

const E2E_LOCAL_SESSION_KEY = "longyu:e2e-allow-local";

/**
 * Bypass explícito para DEV/E2E. Nunca vale em Production Beta.
 * Hard fail se a flag estiver ativa num build de produção.
 */
export function isDevLocalAuthAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  const flag = String((env as { VITE_DEV_ALLOW_LOCAL_AUTH?: string }).VITE_DEV_ALLOW_LOCAL_AUTH ?? "") === "1";
  if (isProductionBetaEnv(env)) {
    if (flag) {
      throw new Error("VITE_DEV_ALLOW_LOCAL_AUTH cannot be enabled in production builds");
    }
    return false;
  }
  if (!flag) return false;
  return isDevelopmentEnv(env) || isPreviewEnv(env);
}

export function isE2ELocalSessionMarked(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(E2E_LOCAL_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Pedagogy e2e may mark a seeded local session. Production ignores this. */
export function allowSeededLocalSession(env: AppEnvironmentInput = import.meta.env): boolean {
  return isDevLocalAuthAllowed(env) && isE2ELocalSessionMarked();
}

export const BACKEND_UNAVAILABLE_MESSAGE =
  "Não foi possível conectar ao Longyu agora. Tente novamente em alguns instantes.";

export const LEGACY_LOCAL_AUTH_MODE = "local" as const;
