import type { HanziEvolutionModel } from "../../data/hanziPedagogy";
import { Button } from "../ui/primitives";
import { SpeakButton } from "../ui/SpeakButton";
import { Pinyin } from "./Pinyin";

interface HanziConceptSlideProps {
  model: HanziEvolutionModel;
  explanation: string;
  index: number; // base 0
  total: number;
  onNext: () => void;
  nextLabel: string;
}

// Um exemplo de hànzì por vez: caractere grande, som, ideia curta e 2–3 peças.
// Compacto de propósito — cabe em 1366×768 e 360×667 sem virar lista/dashboard.
export function HanziConceptSlide({
  model,
  explanation,
  index,
  total,
  onNext,
  nextLabel,
}: HanziConceptSlideProps) {
  const pieces = model.decomposition.slice(0, 3);
  return (
    <div className="mt-4">
      <article className="rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
        <div className="flex items-center justify-center gap-4">
          <span className="hanzi text-6xl leading-none text-ink sm:text-7xl">{model.hanzi}</span>
          <SpeakButton text={model.hanzi} size="md" />
        </div>
        <div className="mt-2">
          <Pinyin text={model.pinyin} className="font-serif text-lg" />
          <span className="ml-2 text-sm font-medium text-ink-soft">{model.meaningPt}</span>
        </div>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-soft">{explanation}</p>
        {pieces.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {pieces.map((part) => (
              <span
                key={part}
                className="rounded-xl bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-soft"
              >
                {part}
              </span>
            ))}
          </div>
        )}
      </article>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-faint">
          Exemplo {index + 1} de {total}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-accent" : "w-1.5 bg-line",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <Button className="mt-3 w-full animate-pop shadow-lift" onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
