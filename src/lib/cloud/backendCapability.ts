import { isProductionLikeEnv, isTestFixturesAllowed, type AppEnvironmentInput } from "../appEnvironment";
import { flagEnabled, isBusinessProductEnabled, isSocialProductEnabled } from "../featureFlags";
import knownMissing from "./knownMissingBackend.json";

/**
 * Domínios cujo backend de produção ainda não existe (ver
 * docs/launch/rc2-3-10b-client-backend-call-graph.json). Nesses ambientes o
 * cliente pula a chamada e falha de forma suave, em vez de bater numa RPC que
 * devolve 404.
 *
 * Em dev/preview o backend é o de staging (schema completo), então nada muda.
 * Em production-like (Production Beta e QA Candidate) o padrão é "indisponível"
 * enquanto o domínio constar na lista conhecida.
 *
 * Reversível sem código: VITE_BACKEND_<DOMÍNIO>_ENABLED=true liga o domínio
 * depois que o schema chegou em produção; =false força desligado em qualquer
 * ambiente.
 */

export type BackendDomain = "social" | "family" | "business" | "pearl";

export const BACKEND_CAPABILITY_MISSING = "backend_capability_missing";

export type BackendCapabilityEnv = AppEnvironmentInput & {
  VITE_BACKEND_SOCIAL_ENABLED?: string;
  VITE_BACKEND_FAMILY_ENABLED?: string;
  VITE_BACKEND_BUSINESS_ENABLED?: string;
  VITE_BACKEND_PEARL_ENABLED?: string;
};

const ENV_KEYS: Record<BackendDomain, keyof BackendCapabilityEnv> = {
  social: "VITE_BACKEND_SOCIAL_ENABLED",
  family: "VITE_BACKEND_FAMILY_ENABLED",
  business: "VITE_BACKEND_BUSINESS_ENABLED",
  pearl: "VITE_BACKEND_PEARL_ENABLED",
};

const KNOWN_MISSING_DOMAINS: ReadonlySet<string> = new Set(Object.keys(knownMissing.domains));

export function isKnownMissingBackendDomain(domain: BackendDomain): boolean {
  return KNOWN_MISSING_DOMAINS.has(domain);
}

export function isBackendDomainAvailable(
  domain: BackendDomain,
  env: BackendCapabilityEnv = import.meta.env
): boolean {
  const raw = env[ENV_KEYS[domain]];
  if (raw !== undefined && String(raw).trim() !== "") {
    return flagEnabled(String(raw), false);
  }
  if (!isProductionLikeEnv(env)) return true;
  return !isKnownMissingBackendDomain(domain);
}

const E2E_SURFACE_KEYS = {
  social: "longyu:e2e-social-surface",
  business: "longyu:e2e-business-surface",
} as const;

type SurfaceStorage = { getItem(key: string): string | null };

/**
 * Só em build de fixture (preview/dev com VITE_USE_TEST_FIXTURES).
 * Produção ignora o localStorage: "1" não liga Amigos na beta.
 */
export function readE2ESurfaceOverride(
  kind: keyof typeof E2E_SURFACE_KEYS,
  env: AppEnvironmentInput = import.meta.env,
  storage?: SurfaceStorage
): boolean | null {
  if (!isTestFixturesAllowed(env)) return null;
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return null;
  const raw = store.getItem(E2E_SURFACE_KEYS[kind]);
  if (raw === "0") return false;
  if (raw === "1") return true;
  return null;
}

/** Flag de produto e backend. Os dois precisam estar ligados. */
export function isSocialSurfaceEnabled(
  env: BackendCapabilityEnv = import.meta.env,
  storage?: SurfaceStorage
): boolean {
  const override = readE2ESurfaceOverride("social", env, storage);
  if (override === false) return false;
  const product = override === true ? true : isSocialProductEnabled(env);
  return product && isBackendDomainAvailable("social", env);
}

export function isBusinessSurfaceEnabled(
  env: BackendCapabilityEnv = import.meta.env,
  storage?: SurfaceStorage
): boolean {
  const override = readE2ESurfaceOverride("business", env, storage);
  if (override === false) return false;
  const product = override === true ? true : isBusinessProductEnabled(env);
  return product && isBackendDomainAvailable("business", env);
}
