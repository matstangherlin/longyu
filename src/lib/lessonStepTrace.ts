/**
 * RC2.2.14 · DH — rastro estruturado de conclusão/avanço de passos.
 *
 * Só em DEV ou em builds com fixtures de teste (E2E/preview): nunca em
 * produção. Sem PII e sem resposta do aluno: lição, índice, tipo, tentativa e
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
  | "handle_done_failed";

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
  return env.DEV === true || env.VITE_USE_TEST_FIXTURES === "true";
}

export function traceLessonStep(entry: Omit<LessonStepTraceEntry, "at">): void {
  if (typeof window === "undefined" || !traceEnabled()) return;
  const target = window as TraceWindow;
  const list = (target.__longyuLessonTrace ??= []);
  list.push({ ...entry, at: Date.now() });
  if (list.length > 500) list.splice(0, list.length - 500);
  if ((import.meta as { env?: Record<string, unknown> }).env?.DEV === true) {
    console.debug("[longyu:step]", entry.event, entry.lessonId, entry.stepIndex, entry.kind, entry.attempt);
  }
}
