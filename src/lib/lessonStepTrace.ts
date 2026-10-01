import { deviceQaEnabled } from "./deviceQa";
import { recordTechEvent } from "./techEvents";

/**
 * RC2.2.14 · DH — rastro estruturado de conclusão/avanço de passos.
 *
 * Só em DEV, builds de fixtures (E2E), Preview/QA Candidate ou build com
 * `VITE_DEVICE_QA=true` (RC2.2.20): nunca na Production Beta comum. Sem PII e sem resposta do aluno: lição, índice, tipo, tentativa e
 * o evento. O E2E lê `window.__longyuLessonTrace` para provar que todo
 * "completed" é seguido de "advanced" (ou "finished") e que nenhum passo
 * ficou "stalled".
 */
export type LessonStepTraceEvent =
  | "completed"
  | "advanced"
  | "finished"
  | "duplicate_completion"
  | "stalled"
  | "plan_swap_skipped"
  // RC2.2.17 · R — a cadeia inteira do toque em Continuar, para achar no
  // aparelho ONDE o avanço se perde.
  | "scene_continue_pressed"
  | "scene_onDone"
  | "renderer_onDone"
  | "renderer_latched"
  | "player_handleDone"
  | "completion_key"
  | "side_effect_failed"
  | "handle_done_failed"
  // RC2.2.19 — trilha curta áudio/avanço para o QA físico (DEV/QA apenas):
  // passo visível → áudio pedido → áudio começou → Continuar tocado →
  // conclusão começou → conclusão terminou → avançou.
  | "step_visible"
  | "audio_requested"
  | "audio_started"
  | "continue_pressed"
  | "completion_started"
  | "completion_finished";

/** A sequência mínima que o QA físico compara (RC2.2.19). */
export const AUDIO_ADVANCE_TRACE_EVENTS: readonly LessonStepTraceEvent[] = [
  "step_visible",
  "audio_requested",
  "audio_started",
  "continue_pressed",
  "completion_started",
  "completion_finished",
  "advanced",
];

export interface LessonStepTraceEntry {
  at: number;
  lessonId: string;
  stepIndex: number;
  kind: string;
  attempt: number;
  event: LessonStepTraceEvent;
}

type TraceWindow = Window & { __longyuLessonTrace?: LessonStepTraceEntry[] };

function traceEnabled(): boolean {
  const env = (import.meta as { env?: Record<string, unknown> }).env ?? {};
  // RC2.2.20 — também no APK de diagnóstico / build interno (`VITE_DEVICE_QA`),
  // Preview e QA Candidate: sem isso o QA físico não prova o avanço no aparelho.
  if (deviceQaEnabled()) return true;
  return env.DEV === true || env.VITE_USE_TEST_FIXTURES === "true";
}

/** RC2.2.21 — Continuar/avançou/travou também no buffer técnico do /qa/device. */
const TECH_STEP_EVENT: Partial<Record<LessonStepTraceEvent, "step_continue" | "step_advanced" | "step_stalled">> = {
  continue_pressed: "step_continue",
  scene_continue_pressed: "step_continue",
  advanced: "step_advanced",
  stalled: "step_stalled",
};

export function traceLessonStep(entry: Omit<LessonStepTraceEntry, "at">): void {
  const techEvent = TECH_STEP_EVENT[entry.event];
  if (techEvent) recordTechEvent(techEvent, { stepIndex: entry.stepIndex, kind: entry.kind, attempt: entry.attempt });
  if (typeof window === "undefined" || !traceEnabled()) return;
  const target = window as TraceWindow;
  const list = (target.__longyuLessonTrace ??= []);
  list.push({ ...entry, at: Date.now() });
  if (list.length > 500) list.splice(0, list.length - 500);
  if ((import.meta as { env?: Record<string, unknown> }).env?.DEV === true) {
    console.debug("[longyu:step]", entry.event, entry.lessonId, entry.stepIndex, entry.kind, entry.attempt);
  }
}

/**
 * RC2.2.19 — contexto do passo na tela, para que eventos de fora do player
 * (áudio, dock) caiam no passo certo. Só metadados; nunca texto nem resposta.
 */
type TraceContext = Omit<LessonStepTraceEntry, "at" | "event">;
let traceContext: TraceContext | null = null;

export function setLessonTraceContext(next: TraceContext | null): void {
  traceContext = next;
}

/** RC2.2.22 — lição/passo na tela, para o relato de problema do Beta QA (só ids e tipo). */
export function currentLessonTraceContext(): { lessonId: string; stepKind: string } | null {
  return traceContext ? { lessonId: traceContext.lessonId, stepKind: traceContext.kind } : null;
}

export function traceCurrentLessonStep(event: LessonStepTraceEvent): void {
  if (!traceContext) return;
  traceLessonStep({ ...traceContext, event });
}
