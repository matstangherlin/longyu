/**
 * V4.6 — Sessão de QA físico (DEV / preview only).
 *
 * Não muta progresso, economia, streak, SRS nem entitlement.
 * Flag em sessionStorage; limpa ao sair da rota /qa.
 */

import { isProductionBetaEnv, isTestFixturesAllowed, type AppEnvironmentInput } from "./appEnvironment";

export const QA_SESSION_KEY = "longyu:qa-session";

export type QaFixtureId =
  | "first-mandarin"
  | "first-conversation"
  | "hanzi-builder"
  | "tone"
  | "image"
  | "review"
  | "free-production"
  | "l15-transfer"
  | "conversation-scene"
  | "sticky-keyboard"
  | "lesson-victory"
  | "missions";

export interface QaFixture {
  id: QaFixtureId;
  labelPt: string;
  /** Lição canônica ou rota especial. */
  lessonId?: string;
  route?: string;
  notePt?: string;
}

export const QA_FIXTURES: readonly QaFixture[] = [
  { id: "first-mandarin", labelPt: "First Mandarin interaction", lessonId: "p1-o-que-e-mandarim" },
  { id: "first-conversation", labelPt: "First conversation", lessonId: "p1-primeira-conversa" },
  { id: "hanzi-builder", labelPt: "Hànzì Builder", lessonId: "p1-primeiros-hanzi" },
  { id: "tone", labelPt: "Tone exercise", lessonId: "p1-o-que-e-mandarim", notePt: "Avance até atividade de tom" },
  { id: "image", labelPt: "Image exercise", lessonId: "p1-o-que-e-mandarim", notePt: "Avance até visual" },
  { id: "review", labelPt: "Review card", route: "/revisao" },
  { id: "free-production", labelPt: "Free production", lessonId: "p1-primeira-conversa" },
  { id: "l15-transfer", labelPt: "L15 early transfer", lessonId: "l2-rev" },
  { id: "conversation-scene", labelPt: "Conversation scene", lessonId: "p1-primeira-conversa" },
  { id: "sticky-keyboard", labelPt: "Sticky CTA + teclado", lessonId: "p1-o-que-e-mandarim" },
  { id: "lesson-victory", labelPt: "Lesson victory", lessonId: "p1-o-que-e-mandarim", notePt: "Complete a lição (sem mutar conta)" },
  { id: "missions", labelPt: "Mission page", route: "/missoes" },
] as const;

export function isQaModeAllowed(env: AppEnvironmentInput = import.meta.env): boolean {
  if (isProductionBetaEnv(env)) return false;
  return isTestFixturesAllowed(env) || env.DEV === true;
}

export function beginQaSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(QA_SESSION_KEY, "1");
}

export function endQaSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(QA_SESSION_KEY);
}

export function isQaSessionActive(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(QA_SESSION_KEY) === "1";
}

/** Guardas de mutação — usados pelo LessonPlayer em modo QA. */
export function qaBlocksProgressMutation(): boolean {
  return isQaSessionActive();
}
