import type { HanziEvolutionModel, HanziEvolutionSketch } from "../../data/hanziPedagogy";
import { Button, Pill } from "../ui/primitives";
import { SpeakButton } from "../ui/SpeakButton";
import { Pinyin } from "./Pinyin";

interface HanziEvolutionCardProps {
  model: HanziEvolutionModel;
  compact?: boolean;
  trainLabel?: string;
  trainDisabled?: boolean;
  onTrain?: () => void;
}

export function HanziEvolutionCard({
  model,
  compact = false,
  trainLabel = "Treinar este hànzì",
  trainDisabled = false,
  onTrain,
}: HanziEvolutionCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Como um hànzì nasce
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="hanzi text-5xl leading-none text-ink sm:text-6xl">{model.hanzi}</span>
                <div>
                  <Pinyin text={model.pinyin} className="font-serif text-xl" />
                  <div className="text-sm font-medium text-ink-soft">{model.meaningPt}</div>
                </div>
              </div>
            </div>
            <SpeakButton text={model.hanzi} size="md" />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <EvolutionStage
              label={model.ancientLabel}
              note={model.ancientNote}
              sketch={model.sketch}
              variant="ancient"
              compact={compact}
            />
            <EvolutionArrow />
            <EvolutionStage
              label={model.middleLabel}
              note={model.middleNote}
              sketch={model.sketch}
              variant="middle"
              compact={compact}
            />
            <EvolutionArrow />
            <div className="rounded-2xl bg-surface-2 px-3 py-3 text-center">
              <div className={["hanzi leading-none text-accent", compact ? "text-5xl" : "text-6xl sm:text-7xl"].join(" ")}>
                {model.hanzi}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">moderno</div>
              <p className="mt-1 hidden text-xs leading-5 text-ink-soft sm:block">{model.modernNote}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:w-72">
          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Peças</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {model.decomposition.map((part) => (
                <span key={part} className="rounded-xl bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft">
                  {part}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Palavra real</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <div className="hanzi text-2xl text-ink">{model.word.hanzi}</div>
                <div className="text-xs text-ink-soft">
                  <Pinyin text={model.word.pinyin} className="font-serif" /> · {model.word.pt}
                </div>
              </div>
              <SpeakButton text={model.word.hanzi} size="sm" />
            </div>
          </div>

          <div className="rounded-2xl bg-accent-soft/55 px-4 py-3">
            <div className="flex items-center gap-2">
              <Pill tone="accent">ideia</Pill>
              <span className="text-xs font-medium text-ink-soft">{model.insight}</span>
            </div>
            {!compact && (
              <div className="mt-3 rounded-xl bg-surface/70 px-3 py-2">
                <div className="hanzi text-xl text-ink">{model.sentence.hanzi}</div>
                <div className="mt-0.5 text-xs text-ink-soft">
                  <Pinyin text={model.sentence.pinyin} className="font-serif" /> · {model.sentence.pt}
                </div>
              </div>
            )}
          </div>

          {onTrain && (
            <Button variant={trainDisabled ? "outline" : "soft"} className="w-full" onClick={onTrain} disabled={trainDisabled}>
              {trainLabel}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function EvolutionStage({
  label,
  note,
  sketch,
  variant,
  compact,
}: {
  label: string;
  note: string;
  sketch: HanziEvolutionSketch;
  variant: "ancient" | "middle";
  compact: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3 text-center sm:px-3">
      <AncientSketch sketch={sketch} variant={variant} compact={compact} />
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <p className="mt-1 hidden text-xs leading-5 text-ink-soft sm:block">{note}</p>
    </div>
  );
}

function EvolutionArrow() {
  return (
    <div className="text-center text-lg font-semibold text-accent sm:text-2xl">
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </div>
  );
}

function AncientSketch({
  sketch,
  variant,
  compact,
}: {
  sketch: HanziEvolutionSketch;
  variant: "ancient" | "middle";
  compact: boolean;
}) {
  const strokeWidth = variant === "ancient" ? 4 : 5;
  const stroke = variant === "ancient" ? "rgb(var(--accent))" : "rgb(var(--text))";
  const className = compact ? "mx-auto h-16 w-16" : "mx-auto h-20 w-20 sm:h-24 sm:w-24";

  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <rect x="10" y="10" width="76" height="76" rx="18" fill="rgb(var(--surface))" />
      <g fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {renderSketch(sketch, variant)}
      </g>
    </svg>
  );
}

function renderSketch(sketch: HanziEvolutionSketch, variant: "ancient" | "middle") {
  if (sketch === "tree") {
    return variant === "ancient" ? (
      <>
        <path d="M48 18v58" />
        <path d="M48 31c-12 8-20 16-27 27" />
        <path d="M48 31c12 8 20 16 27 27" />
        <path d="M48 62l-15 16" />
        <path d="M48 62l15 16" />
      </>
    ) : (
      <>
        <path d="M48 18v60" />
        <path d="M24 42h48" />
        <path d="M48 43 27 70" />
        <path d="M48 43 69 70" />
      </>
    );
  }

  if (sketch === "sun") {
    return variant === "ancient" ? (
      <>
        <circle cx="48" cy="48" r="27" />
        <circle cx="48" cy="48" r="4" fill={variant === "ancient" ? "rgb(var(--accent))" : "rgb(var(--text))"} stroke="none" />
      </>
    ) : (
      <>
        <rect x="30" y="20" width="36" height="56" rx="4" />
        <path d="M31 48h34" />
      </>
    );
  }

  if (sketch === "moon") {
    return variant === "ancient" ? (
      <>
        <path d="M58 18c-18 6-28 22-25 39 2 13 12 21 25 23-8-11-8-45 0-62Z" />
        <path d="M48 38h13" />
        <path d="M45 55h14" />
      </>
    ) : (
      <>
        <path d="M34 18h30v60H34" />
        <path d="M35 40h25" />
        <path d="M35 58h25" />
      </>
    );
  }

  if (sketch === "mountain") {
    return variant === "ancient" ? (
      <>
        <path d="M19 70 34 32l15 38" />
        <path d="M42 70 52 20l25 50" />
        <path d="M16 72h64" />
      </>
    ) : (
      <>
        <path d="M24 72V45" />
        <path d="M48 72V24" />
        <path d="M72 72V41" />
        <path d="M22 72h52" />
      </>
    );
  }

  if (sketch === "mouth") {
    return variant === "ancient" ? (
      <>
        <path d="M26 34c14-11 31-11 44 0v29c-13 10-30 10-44 0Z" />
      </>
    ) : (
      <>
        <rect x="27" y="29" width="42" height="38" rx="3" />
      </>
    );
  }

  if (sketch === "water") {
    return variant === "ancient" ? (
      <>
        <path d="M48 17c-10 12-10 22 0 34 10 12 10 22 0 34" />
        <path d="M28 28c7 8 7 16 0 24" />
        <path d="M68 28c-7 8-7 16 0 24" />
      </>
    ) : (
      <>
        <path d="M48 18v60" />
        <path d="M32 34 22 48" />
        <path d="M64 35 75 49" />
        <path d="M38 64 25 76" />
        <path d="M58 64 71 76" />
      </>
    );
  }

  return variant === "ancient" ? (
    <>
      <path d="M54 20c-14 10-23 25-26 50" />
      <path d="M50 36c9 11 16 24 20 40" />
      <path d="M41 30h14" />
    </>
  ) : (
    <>
      <path d="M48 18c-4 18-14 38-27 58" />
      <path d="M50 36c9 13 17 27 25 42" />
    </>
  );
}
