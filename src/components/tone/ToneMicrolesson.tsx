import { useMemo, useState } from "react";
import { Button, ProgressBar } from "../ui/primitives";
import { SpeakButton } from "../ui/SpeakButton";
import { ToneContour } from "./ToneContour";
import { ToneTrace } from "./ToneTrace";
import { playMandarinAudio } from "../../lib/audioPlayback";

function speak(text: string, options: { rate?: number } = {}) {
  void playMandarinAudio(String(text ?? ""), { rate: options.rate, source: "TONE" });
}
import { buildToneMicrolesson } from "../../lib/toneMicrolesson";
import type { MandarinToneNumber } from "../../data/toneKnowledge";
import { TONE_SHORT_LABEL } from "../../data/toneTrainer";

/**
 * RC2.2.23 — microaula de tom: uma tela, um conceito, uma ação.
 * VER → OUVIR → IMITAR → DISCRIMINAR → RECONHECER → PALAVRA → CONTEXTO.
 * Nenhuma nota de pronúncia (não há medição de pitch).
 */
export function ToneMicrolesson({ tone, onDone, onSkip }: { tone: MandarinToneNumber; onDone: () => void; onSkip: () => void }) {
  const screens = useMemo(() => buildToneMicrolesson(tone), [tone]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<MandarinToneNumber | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const screen = screens[index];
  const needsChoice = Boolean(screen.choices);
  const canContinue = !needsChoice || picked !== null;

  function next() {
    if (!canContinue) return;
    setPicked(null);
    if (index + 1 >= screens.length) onDone();
    else setIndex(index + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4" data-tone-microlesson={tone} data-tone-stage={screen.stage} data-tone-concept={screen.concept}>
      <div className="flex items-center gap-3">
        <ProgressBar value={index + 1} max={screens.length} className="flex-1" />
        <button type="button" className="min-h-11 px-2 text-sm text-ink-faint hover:text-ink" onClick={onSkip} data-testid="tone-microlesson-skip">
          Pular
        </button>
      </div>
      <p className="text-center font-serif text-xl text-ink">{screen.line}</p>

      {screen.stage === "SEE" && <ToneContour tone={tone} guided playKey={playKey} heightScale />}
      {screen.stage === "IMITATE" && <ToneContour tone={tone} guided gesture playKey={playKey} />}
      {/* RC2.2.24 — rastrear é treino de memória do contorno; nunca obrigatório (Continuar sempre livre). */}
      {screen.stage === "TRACE" && <ToneTrace tone={tone} />}

      {screen.sample && screen.stage !== "DISCRIMINATE" && (
        <div className="text-center">
          <div className="hanzi text-6xl text-ink" lang="zh-CN">{screen.sample.hanzi}</div>
          <div className="mt-1 text-lg text-ink-soft">{screen.sample.pinyin}{screen.sample.meaningPt ? ` · ${screen.sample.meaningPt}` : ""}</div>
        </div>
      )}
      {screen.sample && (
        <div className="flex justify-center">
          <SpeakButton text={screen.sample.hanzi} size="lg" revealText={false} />
        </div>
      )}

      {screen.choices && (
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {screen.choices.map((choice) => {
            const chosen = picked === choice;
            const right = choice === tone;
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={picked !== null}
                data-tone-choice={choice}
                onClick={() => {
                  setPicked(choice);
                  setPlayKey((value) => value + 1);
                  if (screen.sample) speak(screen.sample.hanzi, { rate: 0.78 });
                }}
                className={[
                  "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-surface p-3 transition",
                  picked === null ? "border-line hover:border-accent" : right ? "border-good" : chosen ? "border-accent" : "border-line opacity-60",
                ].join(" ")}
              >
                <ToneContour tone={choice} mode="LATE" />
                {screen.stage === "RECOGNIZE" && <span className="text-sm text-ink-soft">{TONE_SHORT_LABEL[choice]}</span>}
              </button>
            );
          })}
        </div>
      )}
      {picked !== null && (
        <p className="text-center text-sm font-semibold" data-tone-microlesson-feedback={picked === tone ? "right" : "wrong"}>
          {picked === tone ? `✓ ${TONE_SHORT_LABEL[tone]}` : `Era o ${TONE_SHORT_LABEL[tone]}.`}
        </p>
      )}

      <Button size="lg" className="w-full" disabled={!canContinue} onClick={next} data-testid="tone-microlesson-continue">
        {index + 1 >= screens.length ? "Ir para o treino" : "Continuar"}
      </Button>
    </section>
  );
}
