import { useEffect, useState } from "react";
import {
  isLessonPerfEnabled,
  lessonPlannerTimings,
  observeLessonLongTasks,
  slowestLessonPlannerPhase,
} from "../../lib/lessonPerf";

/**
 * V3.9 · PERF-010 — Overlay DEV de abertura de lição.
 *
 * O congelamento no Android só foi diagnosticado porque houve medição. Este
 * painel deixa os mesmos números visíveis NO APARELHO, que é onde o problema
 * aparece: emulador e CPU de servidor escondem a diferença.
 *
 * Só renderiza com a instrumentação ligada (DEV, VITE_LESSON_PERF=true ou
 * localStorage.longyu_lesson_perf='1'), então não custa nada em produção.
 */

const MARK_LABELS: Array<[string, string]> = [
  ["lesson_start_click", "clique"],
  ["lesson_route_mounted", "rota montada"],
  ["lesson_data_ready", "plano pronto"],
  ["lesson_first_activity_painted", "1º passo pintado"],
  ["lesson_interactive", "interativo"],
];

interface OverlayState {
  marks: Array<{ label: string; ms: number }>;
  longestTask: number;
  taskCount: number;
}

function readMarks(): Array<{ label: string; ms: number }> {
  try {
    // Entrar direto na URL do player (o caso comum no QA de aparelho) não passa
    // pelo clique da lição, então o marco de origem não existe. Sem este
    // fallback o painel ficaria vazio justamente onde ele precisa servir.
    const base =
      performance.getEntriesByName("lesson_start_click")[0]?.startTime ??
      performance.getEntriesByName("lesson_route_mounted")[0]?.startTime;
    if (base === undefined) return [];
    const rows: Array<{ label: string; ms: number }> = [];
    for (const [name, label] of MARK_LABELS) {
      const entry = performance.getEntriesByName(name)[0];
      if (entry) rows.push({ label, ms: Math.round(entry.startTime - base) });
    }
    return rows;
  } catch {
    return [];
  }
}

export function LessonPerfOverlay() {
  const enabled = isLessonPerfEnabled();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OverlayState>({ marks: [], longestTask: 0, taskCount: 0 });

  useEffect(() => {
    if (!enabled) return undefined;
    // Long tasks (>50 ms) são o sintoma direto do travamento percebido.
    const stop = observeLessonLongTasks((entry) => {
      setState((current) => ({
        ...current,
        longestTask: Math.max(current.longestTask, Math.round(entry.duration)),
        taskCount: current.taskCount + 1,
      }));
    });
    const timer = window.setInterval(() => {
      setState((current) => ({ ...current, marks: readMarks() }));
    }, 500);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [enabled]);

  if (!enabled) return null;

  const phases = lessonPlannerTimings();
  const worst = slowestLessonPlannerPhase();

  return (
    // Ancorado no TOPO de propósito: a base é onde vive a barra de ação fixa
    // que este overlay costuma ser usado para investigar — cobri-la durante o
    // QA de aparelho seria criar o mesmo bug que estamos medindo.
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center p-2">
      <div className="pointer-events-auto max-w-full overflow-hidden rounded-xl border border-line bg-surface/95 text-[11px] leading-4 text-ink shadow-lift backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-3 py-1.5 font-semibold"
        >
          <span>perf</span>
          <span className={state.longestTask > 100 ? "text-danger" : "text-ink-soft"}>
            long task {state.longestTask}ms
          </span>
          {worst && (
            <span className="text-ink-soft">
              · {worst.phase} {worst.ms}ms
            </span>
          )}
          <span className="ml-auto text-ink-faint">{open ? "▾" : "▴"}</span>
        </button>

        {open && (
          <div className="max-h-56 overflow-y-auto border-t border-line px-3 py-2">
            <div className="font-semibold text-ink-soft">marcos (ms desde o clique)</div>
            {state.marks.length === 0 && <div className="text-ink-faint">sem marcos ainda</div>}
            {state.marks.map((mark) => (
              <div key={mark.label} className="flex justify-between gap-4">
                <span>{mark.label}</span>
                <span className="tabular-nums">{mark.ms}</span>
              </div>
            ))}

            <div className="mt-2 font-semibold text-ink-soft">fases do planner</div>
            {phases.length === 0 && <div className="text-ink-faint">nenhuma medida</div>}
            {phases.slice(-8).map((phase, index) => (
              <div key={`${phase.phase}:${index}`} className="flex justify-between gap-4">
                <span>{phase.phase}</span>
                <span className={phase.ms > 100 ? "text-danger tabular-nums" : "tabular-nums"}>
                  {phase.ms}
                </span>
              </div>
            ))}

            <div className="mt-2 flex justify-between gap-4 text-ink-soft">
              <span>long tasks observadas</span>
              <span className="tabular-nums">{state.taskCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
