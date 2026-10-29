import { isProductionLikeEnv, type AppEnvironmentInput } from "./appEnvironment";

/**
 * Feature flags de runtime/build para rollback rápido da beta.
 * Desligar via variável de ambiente no Netlify e redeploy (sem apagar progresso).
 */

export function flagEnabled(value: string | undefined, defaultEnabled: boolean): boolean {
  if (value === undefined || value === "") return defaultEnabled;
  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return defaultEnabled;
}

/** Conversas V2 (fluxo por nós). Default: ligado. Rollback: VITE_ENABLE_CONVERSATION_V2=false */
export function isConversationV2Enabled(
  env: { VITE_ENABLE_CONVERSATION_V2?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_CONVERSATION_V2, true);
}

/** Telemetria pedagógica (além do consentimento do usuário). Default: ligado. */
export function isTelemetryEnabled(
  env: { VITE_ENABLE_TELEMETRY?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_TELEMETRY, true);
}

/**
 * QA 2026-10 · prompt 22 — Qi graduado (1★ = 3, 2★ = 4) numa conta da nuvem.
 * Quem paga é o servidor, e hoje ele só conhece o pacote de 3★: ligar só
 * depois de aplicar supabase/pending/qa-22-graduated-lesson-qi.sql.
 * Default: desligado. Conta local não depende disto.
 */
export function isCloudGraduatedLessonQiEnabled(
  env: { VITE_GRADUATED_LESSON_QI?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_GRADUATED_LESSON_QI, false);
}

/** Envio de feedback beta ao backend. Default: ligado. */
export function isBetaFeedbackEnabled(
  env: { VITE_ENABLE_BETA_FEEDBACK?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_BETA_FEEDBACK, true);
}

type ProductSurfaceEnv = AppEnvironmentInput & {
  VITE_ENABLE_SOCIAL?: string;
  VITE_ENABLE_BUSINESS?: string;
};

/**
 * LGY-032 — decisão de produto, separada do backend.
 * production_beta e qa_candidate ficam desligados até VITE_ENABLE_SOCIAL=true.
 * Dev/preview seguem ligados para a suíte que já abre /amigos.
 */
export function isSocialProductEnabled(
  env: ProductSurfaceEnv = import.meta.env as ProductSurfaceEnv
): boolean {
  const raw = env.VITE_ENABLE_SOCIAL;
  if (raw !== undefined && String(raw).trim() !== "") return flagEnabled(String(raw), false);
  return !isProductionLikeEnv(env);
}

/** LGY-046 — /business na beta fechada fica escondido até VITE_ENABLE_BUSINESS=true. */
export function isBusinessProductEnabled(
  env: ProductSurfaceEnv = import.meta.env as ProductSurfaceEnv
): boolean {
  const raw = env.VITE_ENABLE_BUSINESS;
  if (raw !== undefined && String(raw).trim() !== "") return flagEnabled(String(raw), false);
  return !isProductionLikeEnv(env);
}

export type CloudOnboardingV2Env = AppEnvironmentInput & {
  VITE_CLOUD_ONBOARDING_V2_ENABLED?: string;
};

/**
 * Handoff V4.7.1 (onboarding_completed + finalize-onboarding + draft no servidor).
 * Default: desligado em ambiente production-like (Production Beta e QA
 * Candidate) enquanto o schema/Edges novas não existirem no backend alvo.
 * Preview/dev ficam ligados. O candidate acompanha a produção: certificar um
 * candidate com handoff V2 ligado não diria nada sobre a beta pública.
 * Explicit VITE_CLOUD_ONBOARDING_V2_ENABLED=true só depois do backend V4.7.
 * Nunca reativa conta local nova.
 */
export function isCloudOnboardingV2Enabled(
  env: CloudOnboardingV2Env = import.meta.env
): boolean {
  const raw = env.VITE_CLOUD_ONBOARDING_V2_ENABLED;
  if (raw !== undefined && String(raw).trim() !== "") {
    return flagEnabled(String(raw), false);
  }
  return !isProductionLikeEnv(env);
}
