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
  platform: string;
  build: string;
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
  const { platform, build } = identity();
  push({ at: Date.now(), stage, outcome: "failed", code, platform, build });
  trackFunnelEvent("signup_failed", { stage, code, platform, build });
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
