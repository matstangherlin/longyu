import { useMemo, useState } from "react";
import { ImageChoiceGrid } from "../../components/hanzi/ImageChoiceGrid";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { VisualConceptImage } from "../../components/hanzi/VisualConceptImage";
import { resolveVisualConcept } from "../../data/visualVocabulary";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { playSoundFx } from "../../lib/soundFx";
import { useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { useStore } from "../../lib/store";
import { useStickyActionsReserve } from "../../lib/useStickyActionsReserve";
import { t } from "../../i18n/catalog";
import { resolveInstructionText } from "../../i18n/overlays/instructionGloss";
import { getInterfaceLocale } from "../../i18n/locale";
import type { StepProps } from "./steps";

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }
  return copy;
}

export function StepCompareWithImage({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((state) => state.soundEffects);
  const mode = step.compareWithImageMode ?? "word_to_image";
  const level = step.compareWithImageLevel ?? 1;
  const target = resolveVisualConcept(step.imageId ?? step.iconId);
  const imagePick = mode === "word_to_image";
  const correctAnswer = imagePick ? step.correctImageId ?? "" : step.correctAnswer ?? "";
  const rawOptions = imagePick ? step.imageOptions ?? [] : step.options ?? [];
  const options = useMemo(() => shuffle(rawOptions), [rawOptions.join("|")]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const actionsRef = useStickyActionsReserve<HTMLDivElement>();

  function select(value: string) {
    if (answered) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelected(value);
  }

  function submit(value = selected) {
    if (!value || answered) return;
    const correct = value === correctAnswer;
    playSoundFx(correct ? "success" : "error", soundEffects);
    setSelected(value);
    setAnswered(value);
    if (!correct) onMistake?.(value);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: answered != null,
    hasSelection: Boolean(selected),
    onSelectOption: (index) => {
      const option = options[index];
      if (option) select(option);
    },
    onSubmit: () => submit(),
    onContinue: () => {
      if (answered) onDone(answered === correctAnswer);
    },
  });

  const chosenVisual = imagePick && answered ? resolveVisualConcept(answered) : undefined;
  const locale = getInterfaceLocale();
  const feedback =
    step.explanation ??
    (target
      ? resolveInstructionText(
          `${target.hanzi} (${formatPinyinForDisplay(target.pinyin)}) significa ${target.meaningPt}.`,
          locale
        )
      : undefined);

  return (
    <div data-compare-with-image data-compare-level={level}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {t("player.compareVisual", { n: level })}
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {step.promptPt ?? step.prompt ?? t("player.comparePrompt")}
      </p>

      {imagePick ? (
        <div className="my-5 flex justify-center">
          <MandarinText
            hanzi={step.targetHanzi ?? target?.hanzi ?? ""}
            pinyin={step.targetPinyin ?? target?.pinyin}
            meaning={level === 1 ? resolveInstructionText(step.targetMeaningPt ?? target?.meaningPt ?? "", locale) || undefined : undefined}
            size="lg"
            align="center"
            audio
          />
        </div>
      ) : (
        <div className="my-5 flex justify-center">
          <VisualConceptImage conceptId={target?.id ?? step.imageId ?? ""} size="lg" eager />
        </div>
      )}

      <ImageChoiceGrid
        mode={imagePick ? "images" : "text"}
        options={options}
        imageOptionIds={imagePick ? options : undefined}
        answered={answered}
        selected={selected}
        correctAnswer={correctAnswer}
        onSelect={(value) => {
          select(value);
          submit(value);
        }}
      />

      {answered && (
        <div
          role="status"
          aria-live="polite"
          className={[
            "mt-4 rounded-2xl border px-4 py-3 text-sm",
            answered === correctAnswer
              ? "border-transparent bg-[rgb(var(--good)/0.12)] text-ink"
              : "border-accent-soft bg-accent-soft/45 text-ink",
          ].join(" ")}
        >
          <p className="font-semibold">
            {answered === correctAnswer ? t("player.associationOk") : t("player.almostCompare")}
          </p>
          {chosenVisual && answered !== correctAnswer && (
            <p className="mt-1 text-ink-soft">
              {t("player.youChoseMeans", {
                hanzi: chosenVisual.hanzi,
                pinyin: formatPinyinForDisplay(chosenVisual.pinyin),
                meaning: resolveInstructionText(chosenVisual.meaningPt, locale),
              })}
            </p>
          )}
          {feedback && <p className="mt-1 text-ink-soft">{feedback}</p>}
        </div>
      )}

      <div
        ref={actionsRef}
        data-lesson-sticky-actions
        className="sticky bottom-0 z-10 -mx-2 mt-5 grid gap-2 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg)/0.96)] to-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-4 sm:flex sm:flex-wrap"
      >
        {!answered && (
          <button
            type="button"
            disabled={!selected}
            onClick={() => submit()}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
          >
            {t("player.confirm")}
          </button>
        )}
        {answered && (
          <button
            type="button"
            onClick={() => onDone(answered === correctAnswer)}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
          >
            {t("player.continue")}
          </button>
        )}
        {onSkip && !answered && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm text-ink-soft sm:w-auto"
          >
            {t("player.skip")}
          </button>
        )}
      </div>
    </div>
  );
}
