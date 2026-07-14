import { SpeakButton } from "../ui/SpeakButton";
import { shortcutKeyForIndex, ShortcutBadge } from "../../lib/useExerciseHotkeys";

export type AudioChoiceTileState = "idle" | "selected" | "right" | "wrong";

interface AudioChoiceGridProps {
  options: string[];
  answered: string | null;
  selected: string | null;
  correctAnswer: string;
  onSelect: (value: string) => void;
}

function tileClass(state: AudioChoiceTileState): string {
  return [
    "relative flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition active:scale-[0.99]",
    state === "idle" && "border-line hover:bg-surface-2",
    state === "selected" && "border-accent bg-accent-soft text-accent",
    state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
    state === "wrong" && "border-transparent bg-wrong-soft",
  ]
    .filter(Boolean)
    .join(" ");
}

export function AudioChoiceGrid({ options, answered, selected, correctAnswer, onSelect }: AudioChoiceGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, index) => {
        const state: AudioChoiceTileState =
          answered == null
            ? option === selected
              ? "selected"
              : "idle"
            : option === correctAnswer
              ? "right"
              : option === answered
                ? "wrong"
                : "idle";

        return (
          <button
            key={`${option}-${index}`}
            type="button"
            disabled={answered != null}
            onClick={() => onSelect(option)}
            aria-label={`Opção ${shortcutKeyForIndex(index)}: ouvir ${option}`}
            className={tileClass(state)}
          >
            <ShortcutBadge className="absolute left-2 top-2">{shortcutKeyForIndex(index)}</ShortcutBadge>
            <SpeakButton text={option} size="md" label="Ouvir opção" />
          </button>
        );
      })}
    </div>
  );
}
