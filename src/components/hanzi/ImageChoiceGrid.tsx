import type { ReactNode } from "react";
import { VisualConceptIcon } from "./VisualConceptIcon";
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

function tileClass(state: ImageChoiceTileState): string {
  return [
    "relative flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition",
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
            aria-label={`Opção ${shortcutKeyForIndex(index)}`}
            className={tileClass(state)}
          >
            <ShortcutBadge className="absolute left-2 top-2">{shortcutKeyForIndex(index)}</ShortcutBadge>
            {mode === "images" ? (
              <>
                <VisualConceptIcon conceptId={value} size="md" />
                <span className="mt-2 text-[11px] text-ink-faint sr-only">{resolveVisualConcept(value)?.meaningPt}</span>
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
