import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/primitives";
import { ALL_LESSONS, type LessonStep, type StepKind } from "../../data/journey";
import { lessonRoundStepsFor } from "../lesson/lessonTasks";
import { StepRenderer } from "../lesson/steps";
import { LessonActionRegionProvider } from "../lesson/LessonActionRegion";
import { STEP_ADVANCE_CONTRACT } from "../../lib/lessonStepContract";
import { HANZI_BUILDERS } from "../../data/hanziBuilder";

/** Peças corretas de um builder (rótulo do traço ou glifo), para o driver do E2E. */
function builderSolution(builderId?: string): { type: "stroke" | "glyph"; value: string }[] {
  const builder = HANZI_BUILDERS.find((item) => item.id === builderId);
  if (!builder) return [];
  if (builder.mode === "components") return (builder.components ?? []).map((piece) => ({ type: "glyph" as const, value: piece.glyph }));
  const fixed = new Set(builder.fixedStrokeIds ?? []);
  return (builder.strokes ?? []).filter((stroke) => !fixed.has(stroke.id)).map((stroke) => ({ type: "stroke" as const, value: stroke.label }));
}

/**
 * RC2.2.14 — laboratório de passos (DEV/QA, atrás do QaFastPathGate).
 *
 * Renderiza o `StepRenderer` REAL do player para uma amostra de cada StepKind
 * e registra o que o passo emite: `onDone(correct)`, `onMistake`, `onSkip`.
 * O Playwright usa isto para provar, tipo por tipo, que "resposta certa →
 * passo concluído" e que o erro não deixa o passo sem saída. O avanço de
 * cursor (idx, stepAttempt, retry) é coberto no player real.
 *
 * `/qa/step-lab` sem parâmetros publica o índice de amostras em JSON.
 */

export interface StepLabSample {
  kind: StepKind;
  lessonId: string;
  source: string;
  index: number;
  variant?: string;
}

function collectSamples(onlyKind?: string | null): { samples: StepLabSample[]; steps: Map<string, LessonStep> } {
  const samples: StepLabSample[] = [];
  const steps = new Map<string, LessonStep>();
  const seen = new Map<string, number>();
  const push = (lessonId: string, source: string, index: number, step: LessonStep) => {
    if (onlyKind && step.kind !== onlyKind) return;
    const variant = step.pedagogyVariant ?? undefined;
    const key = `${step.kind}:${variant ?? ""}`;
    const count = seen.get(key) ?? 0;
    if (count >= 3) return;
    seen.set(key, count + 1);
    const sample: StepLabSample = { kind: step.kind, lessonId, source, index, variant };
    samples.push(sample);
    steps.set(sampleKey(sample), step);
  };
  for (const lesson of ALL_LESSONS) {
    lesson.steps.forEach((step, index) => push(lesson.id, "authored", index, step));
  }
  // Tipos que só existem no plano gerado (passes 1–4) também entram.
  const enough = () => (onlyKind ? samples.length >= 1 : false);
  for (const lesson of ALL_LESSONS) {
    if (enough()) break;
    for (const pass of [1, 2, 3, 4] as const) {
      if (enough()) break;
      let planned: LessonStep[] = [];
      try {
        planned = lessonRoundStepsFor(lesson, { masteryPass: pass }) as LessonStep[];
      } catch {
        planned = [];
      }
      planned.forEach((step, index) => push(lesson.id, `pass${pass}`, index, step));
    }
  }
  return { samples, steps };
}

export function sampleKey(sample: Pick<StepLabSample, "kind" | "lessonId" | "source" | "index">): string {
  return `${sample.kind}|${sample.lessonId}|${sample.source}|${sample.index}`;
}

type LabLog = { done: number; correct: string; mistakes: number; skips: number };

export function QaStepLabPage() {
  const [params] = useSearchParams();
  const kind = params.get("kind");
  const { samples, steps } = useMemo(() => collectSamples(kind), [kind]);
  const nth = Number(params.get("n") ?? "0") || 0;
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [log, setLog] = useState<LabLog>({ done: 0, correct: "none", mistakes: 0, skips: 0 });
  const [region, setRegion] = useState<HTMLDivElement | null>(null);

  if (!kind) {
    const kinds = Object.keys(STEP_ADVANCE_CONTRACT).sort();
    const covered = new Set(samples.map((sample) => sample.kind));
    return (
      <main className="bg-bg p-4" data-qa-step-lab-index>
        <p>StepKinds: {kinds.length} · com amostra: {covered.size}</p>
        <pre id="qa-step-index" className="whitespace-pre-wrap text-xs">
          {JSON.stringify({ kinds, missing: kinds.filter((k) => !covered.has(k as StepKind)), samples }, null, 0)}
        </pre>
      </main>
    );
  }

  const ofKind = samples.filter((sample) => sample.kind === kind);
  const sample = ofKind[(nth + offset) % Math.max(1, ofKind.length)];
  const step = sample ? steps.get(sampleKey(sample)) : undefined;

  return (
    <main className="min-h-[100dvh] bg-bg px-3 py-4" data-qa-step-lab>
      <LessonActionRegionProvider target={region}>
        <div
          data-qa-step-kind={kind}
          data-qa-step-sample={sample ? sampleKey(sample) : "none"}
          data-qa-step-done={String(log.done)}
          data-qa-step-correct={log.correct}
          data-qa-step-mistakes={String(log.mistakes)}
          data-qa-step-skips={String(log.skips)}
          data-qa-builder-solution={step?.kind === "hanzi_build" ? JSON.stringify(builderSolution(step.builderId)) : undefined}
        >
          {step && sample ? (
            <>
              <script type="application/json" id="qa-step-json" dangerouslySetInnerHTML={{ __html: JSON.stringify(step) }} />
              <Card className="mx-auto max-w-xl overflow-visible rounded-[24px] p-4 shadow-lift">
                <StepRenderer
                  key={`${sampleKey(sample)}:${offset}:${attempt}`}
                  step={step}
                  lessonId={sample.lessonId}
                  attemptSeed={`qa-lab:${sampleKey(sample)}:${offset}`}
                  stallGuard={false}
                  onDone={(correct) =>
                    setLog((prev) => ({ ...prev, done: prev.done + 1, correct: correct === undefined ? "undefined" : String(correct) }))
                  }
                  onMistake={() => setLog((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }))}
                  onSkip={() => setLog((prev) => ({ ...prev, skips: prev.skips + 1 }))}
                />
              </Card>
              <button
                type="button"
                data-qa-step-retry
                className="mt-4 mr-4 text-xs text-ink-faint underline"
                onClick={() => {
                  // Igual ao "Tentar de novo" do player: mesmo passo, remontado.
                  setAttempt((value) => value + 1);
                  setLog((prev) => ({ ...prev, done: 0, correct: "none" }));
                }}
              >
                tentar de novo (remontar)
              </button>
              <button
                type="button"
                data-qa-step-next
                className="mt-4 text-xs text-ink-faint underline"
                onClick={() => {
                  setOffset((value) => value + 1);
                  setLog({ done: 0, correct: "none", mistakes: 0, skips: 0 });
                }}
              >
                próxima amostra do mesmo tipo
              </button>
            </>
          ) : (
            <p data-qa-step-missing>Sem amostra para {kind}</p>
          )}
        </div>
      </LessonActionRegionProvider>
      <div ref={setRegion} data-lesson-action-region className="empty:hidden mt-3" />
    </main>
  );
}
