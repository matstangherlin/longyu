/**
 * RC2.2.22 — Beta QA: "Encontrou um problema?" e sessões de QA humano.
 *
 * Só em builds de tester/QA (`VITE_BETA_QA=true`) ou nas superfícies de QA
 * (`deviceQaEnabled`). O produto continua produto: nada de ferramenta de dev
 * na cara do aluno.
 *
 * O pacote de problema leva contexto técnico SANITIZADO (rota, id da lição,
 * tipo de passo, build, viewport, plataforma, eventos técnicos recentes).
 * Nunca: e-mail, nome, senha, OTP, token, gravação, transcrição ou qualquer
 * texto que o aluno digitou fora do próprio campo de comentário. A #273 está
 * congelada, então não há nuvem nova: o pacote é exportado manualmente
 * (copiar/compartilhar) pelo tester.
 *
 * Sessão de QA humano: tester por ID (T01, T02…), nunca e-mail. Uma sessão
 * registra build, aparelho, direção do curso, lições testadas, categorias de
 * resultado e um comentário opcional — e NUNCA marca PASS físico.
 */
import { deviceQaEnabled, looksLikePiiOrSecret } from "./deviceQa";
import { sanitizeMobileDiagnostic } from "./mobileDiagnostics";
import type { TechEvent } from "./techEvents";

export const BETA_ISSUE_CATEGORIES = [
  "NOT_WORKING",
  "DID_NOT_UNDERSTAND",
  "TOO_REPETITIVE",
  "TOO_HARD",
  "TOO_EASY",
  "VISUAL",
  "AUDIO",
  "SPEECH",
  "OTHER",
] as const;
export type BetaIssueCategory = (typeof BETA_ISSUE_CATEGORIES)[number];

export const BETA_ISSUE_LABELS_PT: Record<BetaIssueCategory, string> = {
  NOT_WORKING: "Algo não funciona",
  DID_NOT_UNDERSTAND: "Não entendi o que fazer",
  TOO_REPETITIVE: "Muito repetitivo",
  TOO_HARD: "Muito difícil",
  TOO_EASY: "Muito fácil",
  VISUAL: "Problema visual",
  AUDIO: "Problema de áudio",
  SPEECH: "Problema de fala",
  OTHER: "Outro",
};

export function betaQaEnabled(env: { VITE_BETA_QA?: string } & Parameters<typeof deviceQaEnabled>[0] = import.meta.env): boolean {
  return env.VITE_BETA_QA === "true" || deviceQaEnabled(env);
}

/** Só estes campos de contexto entram no pacote (lista branca). */
export const ISSUE_CONTEXT_FIELDS = ["route", "lessonId", "stepKind", "build", "viewport", "platform", "deviceClass"] as const;
export type IssueContext = Partial<Record<(typeof ISSUE_CONTEXT_FIELDS)[number], string | null>>;

export const ISSUE_COMMENT_MAX = 280;

export type IssuePacketError = "UNKNOWN_CATEGORY" | "COMMENT_HAS_PII";

export interface IssuePacket {
  schema: "longyu-beta-issue/1";
  createdAt: string;
  category: BetaIssueCategory;
  comment: string | null;
  context: Record<string, string>;
  events: unknown;
  /** Um relato de problema nunca é prova física de nada. */
  physicalPass: false;
}

/**
 * Monta o pacote. O comentário é o ÚNICO texto livre e só entra se o tester o
 * escreveu no próprio campo e se não parecer PII/segredo.
 */
export function buildIssuePacket(input: {
  category: string;
  comment?: string | null;
  context: IssueContext & Record<string, unknown>;
  events?: readonly TechEvent[];
  now?: Date;
}): { packet: IssuePacket | null; errors: IssuePacketError[] } {
  const errors: IssuePacketError[] = [];
  if (!(BETA_ISSUE_CATEGORIES as readonly string[]).includes(input.category)) errors.push("UNKNOWN_CATEGORY");
  const comment = (input.comment ?? "").trim().slice(0, ISSUE_COMMENT_MAX);
  if (comment && looksLikePiiOrSecret(comment)) errors.push("COMMENT_HAS_PII");
  if (errors.length) return { packet: null, errors };
  const context: Record<string, string> = {};
  for (const field of ISSUE_CONTEXT_FIELDS) {
    const value = input.context[field];
    if (typeof value === "string" && value && !looksLikePiiOrSecret(value)) context[field] = value.slice(0, 80);
  }
  const events = sanitizeMobileDiagnostic(
    (input.events ?? []).slice(-30).map((event) => ({ at: event.at, event: event.name, route: event.route, detail: event.detail ?? null }))
  );
  return {
    packet: {
      schema: "longyu-beta-issue/1",
      createdAt: (input.now ?? new Date()).toISOString(),
      category: input.category as BetaIssueCategory,
      comment: comment || null,
      context,
      events,
      physicalPass: false,
    },
    errors: [],
  };
}

// ── Sessão de QA humano ────────────────────────────────────────────────────

export const TESTER_CATEGORIES = ["BEGINNER", "HAS_STUDIED_CHINESE", "TECHNICAL_QA"] as const;
export type TesterCategory = (typeof TESTER_CATEGORIES)[number];

export const SESSION_RESULT_CATEGORIES = ["COMPLETED_ALONE", "NEEDED_HELP", "HESITATED", "WENT_BACK", "ABANDONED", "REPEATED_ERRORS", "TECH_FAILURE"] as const;
export const PERCEIVED_SPEEDS = ["INSTANT", "ACCEPTABLE", "SLOW", "FROZE"] as const;
export type PerceivedSpeed = (typeof PERCEIVED_SPEEDS)[number];

export interface HumanQaSession {
  sessionId: string;
  testerId: string;
  testerCategory: TesterCategory;
  build: string;
  deviceClass: string;
  courseDirection: string;
  lessonIds: string[];
  resultCategories: string[];
  sessionLoad: SessionLoad;
  observedDurationMin?: number | null;
  comment?: string | null;
}

export type HumanQaSessionError =
  | "TESTER_ID_NOT_OPAQUE"
  | "UNKNOWN_TESTER_CATEGORY"
  | "UNKNOWN_RESULT_CATEGORY"
  | "SESSION_HAS_PII"
  | "SESSION_CLAIMS_PHYSICAL_PASS"
  | "FORBIDDEN_FIELD";

/** Campos que uma sessão humana nunca carrega. */
export const HUMAN_SESSION_FORBIDDEN = /email|e-mail|password|senha|otp|token|recording|gravacao|gravação|transcript|name|nome|phone|telefone/i;

export function validateHumanQaSession(session: Record<string, unknown>): HumanQaSessionError[] {
  const errors: HumanQaSessionError[] = [];
  if (!/^T\d{2,3}$/.test(String(session.testerId ?? ""))) errors.push("TESTER_ID_NOT_OPAQUE");
  if (!(TESTER_CATEGORIES as readonly string[]).includes(String(session.testerCategory))) errors.push("UNKNOWN_TESTER_CATEGORY");
  const results = Array.isArray(session.resultCategories) ? session.resultCategories : [];
  if (results.some((item) => !(SESSION_RESULT_CATEGORIES as readonly string[]).includes(String(item)))) errors.push("UNKNOWN_RESULT_CATEGORY");
  if (Object.keys(session).some((key) => HUMAN_SESSION_FORBIDDEN.test(key))) errors.push("FORBIDDEN_FIELD");
  if ("physicalPass" in session || "status" in session || "evidenceType" in session) errors.push("SESSION_CLAIMS_PHYSICAL_PASS");
  const text = JSON.stringify(session);
  if (looksLikePiiOrSecret(String(session.comment ?? "")) || /[^\s@"]+@[^\s@"]+\.[^\s@"]+/.test(text)) errors.push("SESSION_HAS_PII");
  return errors;
}

// ── Carga da sessão (popups) ───────────────────────────────────────────────

export interface SessionLoad {
  coachmarks: number;
  unlockReveals: number;
  ceremonies: number;
  permissions: number;
}

/** Quantas interrupções a sessão teve DE VERDADE (pelos eventos técnicos). */
export function sessionLoad(events: readonly Pick<TechEvent, "name">[]): SessionLoad {
  const count = (name: string) => events.filter((event) => event.name === name).length;
  return {
    coachmarks: count("coachmark_shown"),
    unlockReveals: count("unlock_reveal_shown"),
    ceremonies: count("ceremony_shown"),
    permissions: count("permission_prompted"),
  };
}

/** Primeira sessão leve: no máximo 2 orientações, 1 cerimônia e 1 pedido de permissão. */
export const FIRST_SESSION_LOAD_BUDGET: SessionLoad = { coachmarks: 2, unlockReveals: 1, ceremonies: 1, permissions: 1 };

export function sessionLoadExceeded(load: SessionLoad, budget: SessionLoad = FIRST_SESSION_LOAD_BUDGET): (keyof SessionLoad)[] {
  return (Object.keys(budget) as (keyof SessionLoad)[]).filter((key) => load[key] > budget[key]);
}
