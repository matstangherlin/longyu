/**
 * RC2.2.19 — rastro de estágios do cadastro (P1 MOBILE_SIGNUP_FAILURE).
 *
 * No aparelho, "não consegui criar conta" não diz ONDE parou. Cada etapa do
 * caminho canônico deixa um marco, e toda falha registra só:
 *   estágio · código · plataforma · SHA do build
 * NUNCA e-mail, senha, token, nome, data de nascimento ou resposta do
 * servidor por extenso.
 *
 *   signup_started → signup_request_success → confirmation_required →
 *   session_available → draft_restore_started → profile_bootstrap_started →
 *   finalize_started → journey_entered
 */
import { trackFunnelEvent } from "../services/funnelEvents";
import { getBuildIdentity } from "./platform/buildIdentity";
import { recordDeviceQaObservation } from "./deviceQa";

export const SIGNUP_STAGES = [
  "signup_started",
  "signup_request_success",
  "confirmation_required",
  "session_available",
  "draft_restore_started",
  "profile_bootstrap_started",
  "finalize_started",
  "journey_entered",
] as const;

export type SignupStage = (typeof SIGNUP_STAGES)[number];

/** Nada de loading infinito: pedido de cadastro e finalização têm prazo. */
export const SIGNUP_REQUEST_TIMEOUT_MS = 25_000;
export const SIGNUP_FINALIZE_TIMEOUT_MS = 30_000;

export interface SignupTraceEntry {
  at: number;
  stage: SignupStage;
  outcome: "reached" | "failed";
  code?: string;
  /** RC2.2.20 — categoria segura (sem mensagem do servidor). */
  category?: SignupErrorCategory;
  platform: string;
  build: string;
}

/**
 * RC2.2.20 — categorias SEGURAS de falha de cadastro. Nunca stack trace nem
 * texto do servidor na tela: a UI escolhe a mensagem e a ação pela categoria.
 */
export const SIGNUP_ERROR_CATEGORIES = [
  "NETWORK",
  "RATE_LIMIT",
  "SUPABASE_AUTH",
  "EMAIL_CONFIRMATION",
  "SESSION_RESTORE",
  "PROFILE_BOOTSTRAP",
  "ONBOARDING_DRAFT",
  "TIMEOUT",
  "UNKNOWN_SAFE",
] as const;
export type SignupErrorCategory = (typeof SIGNUP_ERROR_CATEGORIES)[number];

/**
 * Código já sanitizado + estágio → categoria. A rede e o limite valem em
 * qualquer estágio; o resto é decidido pelo estágio em que parou.
 */
export function classifySignupError(stage: SignupStage, code: string): SignupErrorCategory {
  const c = safeSignupErrorCode(code);
  if (c === "TIMEOUT" || /TIMED?_?OUT/.test(c)) return "TIMEOUT";
  if (/FAILED_TO_FETCH|NETWORK|OFFLINE|LOAD_FAILED|FETCH/.test(c)) return "NETWORK";
  if (/429|RATE_LIMIT|TOO_MANY|OVER_.*_LIMIT/.test(c)) return "RATE_LIMIT";
  if (/EMAIL_NOT_CONFIRMED|CONFIRM/.test(c) || stage === "confirmation_required") return "EMAIL_CONFIRMATION";
  if (stage === "session_available") return "SESSION_RESTORE";
  if (stage === "draft_restore_started") return "ONBOARDING_DRAFT";
  if (stage === "profile_bootstrap_started" || stage === "finalize_started" || /PROFILE|USERNAME/.test(c)) return "PROFILE_BOOTSTRAP";
  if (/USER_ALREADY|ALREADY_REGISTERED|WEAK_PASSWORD|INVALID|SIGNUP_DISABLED|AUTH|EMAIL_ADDRESS/.test(c) || stage === "signup_started") {
    return "SUPABASE_AUTH";
  }
  return "UNKNOWN_SAFE";
}

/**
 * Onde o "Tentar novamente" retoma com segurança (nunca recria perfil,
 * username, conta ou recompensa de onboarding que já existem).
 */
export function signupRetryStage(category: SignupErrorCategory, stage: SignupStage): SignupStage {
  switch (category) {
    case "SUPABASE_AUTH":
    case "RATE_LIMIT":
      return "signup_started";
    case "EMAIL_CONFIRMATION":
      return "confirmation_required";
    case "SESSION_RESTORE":
      return "session_available";
    case "ONBOARDING_DRAFT":
      return "draft_restore_started";
    case "PROFILE_BOOTSTRAP":
      return "profile_bootstrap_started";
    default:
      return stage;
  }
}

const MAX_ENTRIES = 40;
const trace: SignupTraceEntry[] = [];

/** Código de erro seguro: só letras, dígitos e _:-; nunca um e-mail ou texto livre. */
export function safeSignupErrorCode(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text || /@/.test(text)) return "UNKNOWN";
  const token = text.replace(/[^A-Za-z0-9_:-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return (token || "UNKNOWN").slice(0, 60).toUpperCase();
}

function push(entry: SignupTraceEntry) {
  trace.push(entry);
  if (trace.length > MAX_ENTRIES) trace.splice(0, trace.length - MAX_ENTRIES);
  if (typeof window !== "undefined") {
    (window as Window & { __longyuSignupTrace?: SignupTraceEntry[] }).__longyuSignupTrace = trace.slice();
  }
}

function identity() {
  try {
    const build = getBuildIdentity();
    return { platform: build.platform, build: build.build };
  } catch {
    return { platform: "unknown", build: "unknown" };
  }
}

export function markSignupStage(stage: SignupStage): void {
  const { platform, build } = identity();
  push({ at: Date.now(), stage, outcome: "reached", platform, build });
  trackFunnelEvent("signup_stage", { stage, platform, build });
}

export function reportSignupFailure(stage: SignupStage, rawCode: unknown): string {
  const code = safeSignupErrorCode(rawCode);
  const category = classifySignupError(stage, code);
  const { platform, build } = identity();
  push({ at: Date.now(), stage, outcome: "failed", code, category, platform, build });
  trackFunnelEvent("signup_failed", { stage, code, category, platform, build });
  recordDeviceQaObservation("signup_failed", `${stage} · ${code} · ${category}`);
  return code;
}

export function signupTrace(): readonly SignupTraceEntry[] {
  return trace.slice();
}

/** Promessa com prazo: estoura com `TIMEOUT` em vez de girar para sempre. */
export async function withSignupTimeout<T>(promise: Promise<T>, ms: number): Promise<T | { timedOut: true }> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isSignupTimeout(value: unknown): value is { timedOut: true } {
  return Boolean(value && typeof value === "object" && (value as { timedOut?: boolean }).timedOut === true);
}
