/**
 * RC2.2.24 — "avançou" não é `setIdx(idx + 1)`: é o DOM da etapa nova ter
 * aparecido. Para TODO StepKind no APK:
 *
 *   tap/answer → completion_started → completion_committed → next_step_selected → next_step_rendered
 *
 * `completion_committed` sem `next_step_rendered` (nem `finished`) dentro de
 * STEP_RENDER_STALL_MS = STEP_RENDER_STALL_ANDROID. Reusa o rastro de passos
 * existente (lessonStepTrace) — não é um segundo sistema.
 *
 * Puro: o gate e o E2E avaliam a sequência a partir do rastro.
 */
export const STEP_RENDER_STALL_MS = 1500;

export const STEP_RENDER_TRUTH_SEQUENCE = ["completion_started", "completion_committed", "next_step_selected", "next_step_rendered"] as const;

export interface StepTraceLike {
  event: string;
  stepIndex: number;
  lessonId: string;
}

export interface StepRenderStall {
  lessonId: string;
  fromIndex: number;
  expectedIndex: number;
}

/**
 * Toda seleção de etapa nova precisa ser seguida da renderização DAQUELA
 * etapa (ou de `finished`). O que sobrar é travamento de render.
 */
export function stepRenderStalls(trace: readonly StepTraceLike[]): StepRenderStall[] {
  const stalls: StepRenderStall[] = [];
  trace.forEach((entry, index) => {
    if (entry.event !== "next_step_selected") return;
    const rest = trace.slice(index + 1);
    const landed = rest.some(
      (later) => later.lessonId === entry.lessonId && ((later.event === "next_step_rendered" && later.stepIndex === entry.stepIndex) || later.event === "finished")
    );
    if (!landed) stalls.push({ lessonId: entry.lessonId, fromIndex: entry.stepIndex - 1, expectedIndex: entry.stepIndex });
  });
  return stalls;
}

/** O DOM mostra a etapa esperada? (atributo data-current-step-index do frame). */
export function stepRenderLanded(expectedIndex: number | null, renderedIndex: number | null): boolean {
  return expectedIndex == null || expectedIndex === renderedIndex;
}
