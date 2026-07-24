import type { ReactNode } from "react";
import { VisualConceptImage } from "./VisualConceptImage";
import { resolveVisualConcept } from "../../data/visualVocabulary";
import { shortcutKeyForIndex, ShortcutBadge } from "../../lib/useExerciseHotkeys";
import { MandarinText } from "./MandarinText";
import { formatPinyinForDisplay } from "../../lib/pinyin";

export type ImageChoiceTileState = "idle" | "selected" | "right" | "wrong";

interface ImageChoiceGridProps {
  mode: "images" | "text";
  options: string[];
  imageOptionIds?: string[];
  answered: string | null;
  selected: string | null;
  correctAnswer: string;
  onSelect: (value: string) => void;
  textRenderer?: (value: string) => ReactNode;
}

function tileClass(state: ImageChoiceTileState, imageMode: boolean): string {
  return [
    "relative flex flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[0.99]",
    imageMode ? "min-h-[10rem] p-2 sm:min-h-[11rem]" : "min-h-[4.5rem] px-3 py-3",
    state === "idle" && "border-line hover:bg-surface-2",
    state === "selected" && "border-accent bg-accent-soft text-accent",
    state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
    state === "wrong" && "border-transparent bg-wrong-soft",
  ]
    .filter(Boolean)
    .join(" ");
}

function defaultTextRenderer(value: string): ReactNode {
  const visual = resolveVisualConcept(value);
  if (visual && value === visual.id) {
    return <span className="font-serif text-2xl font-semibold">{visual.hanzi}</span>;
  }
  if (/[\u3400-\u9fff]/.test(value)) {
    return <MandarinText hanzi={value} size="md" align="center" />;
  }
  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu.test(value)) {
    return <span className="text-lg font-medium">{formatPinyinForDisplay(value)}</span>;
  }
  return <span className="text-sm font-medium leading-5">{value}</span>;
}

export function ImageChoiceGrid({
  mode,
  options,
  imageOptionIds,
  answered,
  selected,
  correctAnswer,
  onSelect,
  textRenderer = defaultTextRenderer,
}: ImageChoiceGridProps) {
  const ids = imageOptionIds ?? options;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const value = mode === "images" ? ids[index] ?? option : option;
        const visual = mode === "images" ? resolveVisualConcept(value) : undefined;
        const state: ImageChoiceTileState =
          answered == null
            ? value === selected
              ? "selected"
              : "idle"
            : value === correctAnswer
              ? "right"
              : value === answered
                ? "wrong"
                : "idle";

        return (
          <button
            key={`${value}-${index}`}
            type="button"
            disabled={answered != null}
            onClick={() => onSelect(value)}
            aria-label={`Opção ${shortcutKeyForIndex(index)}${visual ? `: ${visual.imageAltPt}` : ""}`}
            className={tileClass(state, mode === "images")}
          >
            <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
            {mode === "images" ? (
              <>
                <VisualConceptImage conceptId={value} size="md" className="pointer-events-none max-w-none" />
                <span className="sr-only">{visual?.meaningPt}</span>
              </>
            ) : (
              <div className="px-2 pt-3">{textRenderer(option)}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
