import { useMemo, useState } from "react";
import { Card } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/provider";
import type { LessonStep } from "../../data/journey";
import { StepRenderer } from "../lesson/steps";

/**
 * Fixture visual DEV/QA para o contrato de escuta pura.
 *
 * A rota inteira continua atrás de QaFastPathGate, portanto não existe em
 * Production Beta. O gate programático caminha os 113 temas; esta fixture dá
 * ao Playwright uma superfície determinística para provar copy, reveal e
 * geometria sem falsificar progresso/cursor de uma lição real.
 */
export function QaAudioDiscriminationPage() {
  const { instructionLocale } = useTranslation();
  const [completed, setCompleted] = useState(false);
  const step = useMemo<LessonStep>(() => ({
    kind: "audio_discrimination",
    title: instructionLocale === "en"
      ? "Are the sounds the same or different?"
      : "Os sons são iguais ou diferentes?",
    prompt: instructionLocale === "en"
      ? "Listen to both sounds. Compare only what you hear."
      : "Ouça os dois sons. Compare apenas o que você ouve.",
    audioText: "mā",
    audioTextB: "má",
    correctAnswer: "different",
    pairReveal: [
      { hanzi: "妈", pinyin: "mā", meaningPt: instructionLocale === "en" ? "mother" : "mãe" },
      { hanzi: "麻", pinyin: "má", meaningPt: instructionLocale === "en" ? "hemp" : "cânhamo" },
    ],
    explanation: instructionLocale === "en"
      ? "The syllable stays the same; the tone changes the word."
      : "A sílaba é a mesma; o tom muda a palavra.",
  }), [instructionLocale]);

  return (
    <main className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-bg" data-qa-audio-fixture>
      <div
        data-lesson-scroll-region
        data-lesson-activity-scroll
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[calc(var(--lesson-bottom-action-height,0px)+1rem)] [scroll-padding-bottom:calc(var(--lesson-bottom-action-height,0px)+1rem)]"
      >
        <Card
          data-lesson-task-body
          data-current-step-kind="audio_discrimination"
          className="mx-auto max-w-xl overflow-visible rounded-[24px] p-4 shadow-lift sm:p-5"
        >
          {completed ? (
            <p className="py-10 text-center font-semibold text-good" data-qa-audio-complete>
              {instructionLocale === "en" ? "Listening check complete." : "Teste de escuta concluído."}
            </p>
          ) : (
            <StepRenderer step={step} lessonId="qa-audio-discrimination" onDone={() => setCompleted(true)} />
          )}
        </Card>
      </div>
    </main>
  );
}
