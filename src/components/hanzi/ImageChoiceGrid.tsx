import { useEffect, useMemo, useState, type ReactNode } from "react";
import { VisualConceptImage, type VisualImageStatus } from "./VisualConceptImage";
import { resolveVisualConcept } from "../../data/visualVocabulary";
import { shortcutKeyForIndex, ShortcutBadge } from "../../lib/useExerciseHotkeys";
import { MandarinText } from "./MandarinText";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { VISUAL_IMAGE_SRC_BY_ID } from "../../assets/visuals";
import type { VisualConceptId } from "../../data/visualVocabulary";

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

function tileClass(state: ImageChoiceTileState, imageMode: boolean, locked: boolean): string {
  return [
    "relative flex flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[0.99]",
    imageMode ? "min-h-[10rem] p-2 sm:min-h-[11rem]" : "min-h-[4.5rem] px-3 py-3",
    state === "idle" && "border-line hover:bg-surface-2",
    state === "selected" && "border-accent bg-accent-soft text-accent",
    state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
    state === "wrong" && "border-transparent bg-wrong-soft",
    locked && "opacity-70",
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

function preloadVisual(id: string) {
  const concept = resolveVisualConcept(id);
  if (!concept) return;
  const src = VISUAL_IMAGE_SRC_BY_ID[concept.id as VisualConceptId];
  if (!src) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
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
  const imageMode = mode === "images";
  const [statusById, setStatusById] = useState<Record<string, VisualImageStatus>>({});

  useEffect(() => {
    if (!imageMode) return;
    for (const id of ids) preloadVisual(id);
  }, [imageMode, ids.join("|")]);

  const imagesReady = useMemo(() => {
    if (!imageMode) return true;
    if (ids.length === 0) return true;
    return ids.every((id) => {
      const status = statusById[id];
      return status === "ready" || status === "failed";
    });
  }, [imageMode, ids, statusById]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2" data-image-choice-ready={imagesReady ? "1" : "0"}>
      {!imagesReady && imageMode && (
        <p className="col-span-2 text-center text-xs font-medium text-ink-faint" role="status">
          Carregando imagens…
        </p>
      )}
      {options.map((option, index) => {
        const value = imageMode ? ids[index] ?? option : option;
        const visual = imageMode ? resolveVisualConcept(value) : undefined;
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
        const locked = imageMode && !imagesReady;

        return (
          <button
            key={`${value}-${index}`}
            type="button"
            disabled={answered != null || locked}
            onClick={() => onSelect(value)}
            aria-label={`Opção ${shortcutKeyForIndex(index)}${visual ? `: ${visual.imageAltPt}` : ""}`}
            className={tileClass(state, imageMode, locked)}
          >
            <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
            {imageMode ? (
              <>
                <VisualConceptImage
                  conceptId={value}
                  size="md"
                  className="pointer-events-none max-w-none"
                  eager
                  onStatusChange={(status) => {
                    setStatusById((prev) => (prev[value] === status ? prev : { ...prev, [value]: status }));
                  }}
                />
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
