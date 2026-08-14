/**
 * V3.9 · PERF-010 — custo interno do planner, fase a fase.
 *
 * Módulo deliberadamente SEM `import.meta` e sem dependências: `lessonTasks` é
 * compilado para CommonJS pelos validators, e `import.meta` força saída ESM —
 * misturar os dois quebra o gate. Por isso a chave de ativação é injetada por
 * `lessonPerf` em runtime, em vez de lida aqui.
 *
 * Motivo de existir: as marcas de clique → primeiro passo dizem QUANTO demorou,
 * não ONDE. O congelamento no Android vinha de trabalho síncrono dentro do
 * planner (o índice de exposição estrutural custava ~12 s a frio) e
 * `startTransition` não move nada disso da main thread — só muda a prioridade
 * de renderização. Sem medir as fases, uma regressão dessas volta invisível.
 */

export interface LessonPlannerTiming {
  phase: string;
  ms: number;
  at: number;
}

const timings: LessonPlannerTiming[] = [];
const TIMING_LIMIT = 50;
let enabled = false;

/** Ligado por `lessonPerf` conforme DEV / flag de localStorage / env do Vite. */
export function setPlannerTimingEnabled(value: boolean): void {
  enabled = value;
}

export function isPlannerTimingEnabled(): boolean {
  return enabled;
}

/** Executa `work` medindo a fase. Sem overhead quando desligado. */
export function timeLessonPlannerPhase<T>(phase: string, work: () => T): T {
  if (!enabled) return work();
  const start = Date.now();
  try {
    return work();
  } finally {
    const ms = Date.now() - start;
    timings.push({ phase, ms, at: start });
    if (timings.length > TIMING_LIMIT) timings.shift();
  }
}

/** Fases medidas, mais recente por último. Vazio quando desligado. */
export function lessonPlannerTimings(): readonly LessonPlannerTiming[] {
  return timings;
}

/** Pior fase registrada — o que investigar primeiro num relato de travamento. */
export function slowestLessonPlannerPhase(): LessonPlannerTiming | null {
  if (timings.length === 0) return null;
  return timings.reduce((worst, entry) => (entry.ms > worst.ms ? entry : worst));
}

export function resetLessonPlannerTimings(): void {
  timings.length = 0;
}
