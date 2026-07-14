import { useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveVisualConcept } from "../../data/visualVocabulary";
import { resolveVisualScene, sceneTargetHanzi } from "../../data/visualScenes";
import { ImageChoiceGrid } from "../../components/hanzi/ImageChoiceGrid";
import { VisualConceptImage } from "../../components/hanzi/VisualConceptImage";
import { VisualSceneImage } from "../../components/hanzi/VisualSceneImage";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { useStore } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import { KeyboardShortcutHint, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import type { StepProps } from "./steps";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{children}</div>;
}

function AnswerFeedback({
  correct,
  explanation,
}: {
  correct: boolean;
  explanation?: string;
}) {
  return (
    <div
      className={[
        "mt-4 rounded-xl px-4 py-3 text-sm",
        correct ? "bg-[rgb(var(--good)/0.12)] text-ink" : "bg-wrong-soft text-ink",
      ].join(" ")}
    >
      {correct ? "Correto." : "Quase — reveja a associação visual."}
      {explanation && <p className="mt-1 text-ink-soft">{explanation}</p>}
    </div>
  );
}

export function StepImageChoice({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const mode = step.imageChoiceMode ?? "choose_hanzi";
  const concept = resolveVisualConcept(step.imageId ?? step.iconId);
  const scene = resolveVisualScene(step.visualSceneId ?? (step.imageId?.startsWith("scene-") ? step.imageId : undefined));
  const isImagePick =
    mode === "choose_image" || mode === "listen_and_choose_image" || mode === "scene_audio_choice";
  const isSentenceFromScene = mode === "image_sentence_choice";
  const correctAnswer = isImagePick
    ? step.correctImageId ?? ""
    : step.correctAnswer ?? "";
  const rawOptions = isImagePick ? step.imageOptions ?? [] : step.options ?? [];
  const options = useMemo(() => shuffle([...rawOptions]), [rawOptions.join("|")]);
  const imageOptionIds = isImagePick ? options : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);

  const audioText =
    step.audioText ??
    step.targetHanzi ??
    (scene ? sceneTargetHanzi(scene) : undefined) ??
    concept?.hanzi;

  useEffect(() => {
    if ((mode !== "listen_and_choose_image" && mode !== "scene_audio_choice") || !audioText) return;
    const timer = window.setTimeout(() => {
      playSoundFx("pieceSelect", soundEffects);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [audioText, mode, soundEffects]);

  function selectOption(value: string) {
    if (answered) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelected(value);
  }

  function answerOption(value: string) {
    if (answered) return;
    const correct = value === correctAnswer;
    playSoundFx(correct ? "success" : "error", soundEffects);
    setSelected(value);
    setAnswered(value);
    if (!correct) onMistake?.(value);
  }

  function submitSelected() {
    if (!selected || answered) return;
    answerOption(selected);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: answered != null,
    hasSelection: Boolean(selected),
    onSelectOption: (index) => {
      const option = options[index];
      if (!option) return;
      selectOption(option);
    },
    onSubmit: submitSelected,
    onContinue: () => {
      if (answered) onDone(answered === correctAnswer);
    },
  });

  const prompt =
    step.promptPt ??
    step.prompt ??
    (isSentenceFromScene
      ? "Qual frase descreve a imagem?"
      : mode === "scene_audio_choice"
        ? "Ouça e escolha a imagem da situação."
        : "Escolha a opção correta.");

  const explanation =
    step.explanation ??
    (scene
      ? `${sceneTargetHanzi(scene) ?? ""} — ${scene.targetMeaningPt}.`
      : concept
        ? `${concept.hanzi} (${formatPinyinForDisplay(concept.pinyin)}) = ${concept.meaningPt}.`
        : undefined);

  return (
    <div>
      <Eyebrow>{isSentenceFromScene || mode === "scene_audio_choice" ? "Cena visual" : "Associação visual"}</Eyebrow>

      {(mode === "choose_hanzi" || mode === "choose_pinyin" || mode === "choose_meaning") && concept && (
        <div className="my-5 flex flex-col items-center gap-2">
          <VisualConceptImage conceptId={concept.id} size="xl" />
          {step.targetMeaningPt && mode !== "choose_meaning" && (
            <p className="text-xs text-ink-faint">{step.targetMeaningPt}</p>
          )}
        </div>
      )}

      {isSentenceFromScene && scene && (
        <div className="my-5 flex flex-col items-center gap-2">
          <VisualSceneImage sceneId={scene.id} size="xl" hideAnswerInAlt />
        </div>
      )}

      <p className="mt-2 text-sm leading-6 text-ink-soft">{prompt}</p>

      {mode === "choose_image" && (step.targetHanzi ?? concept?.hanzi) && (
        <div className="my-5 flex justify-center">
          <MandarinText
            hanzi={step.targetHanzi ?? concept!.hanzi}
            pinyin={step.targetPinyin ?? concept?.pinyin}
            size="lg"
            align="center"
          />
        </div>
      )}

      {(mode === "listen_and_choose_image" || mode === "scene_audio_choice") && (
        <div className="my-5 flex flex-col items-center gap-3">
          <SpeakButton text={audioText ?? ""} size="lg" label="Ouvir" />
          <p className="text-sm text-ink-soft">
            {mode === "scene_audio_choice" ? "Ouça a fala e escolha a cena." : "Ouça e escolha a imagem certa."}
          </p>
        </div>
      )}

      <KeyboardShortcutHint />

      <ImageChoiceGrid
        mode={isImagePick ? "images" : "text"}
        options={options}
        imageOptionIds={imageOptionIds}
        answered={answered}
        selected={selected}
        correctAnswer={correctAnswer}
        onSelect={(value) => {
          selectOption(value);
          answerOption(value);
        }}
        textRenderer={(value) => {
          if (mode === "choose_hanzi" || isSentenceFromScene) {
            return <span className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">{value}</span>;
          }
          if (mode === "choose_pinyin") return <span className="text-lg font-medium">{formatPinyinForDisplay(value)}</span>;
          return <span className="text-sm font-medium leading-5">{value}</span>;
        }}
      />

      {answered && <AnswerFeedback correct={answered === correctAnswer} explanation={explanation} />}

      <div className="mt-5 flex flex-wrap gap-2">
        {!answered && (
          <button
            type="button"
            disabled={!selected}
            onClick={submitSelected}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Confirmar
          </button>
        )}
        {answered && (
          <button
            type="button"
            onClick={() => onDone(answered === correctAnswer)}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Continuar
          </button>
        )}
        {onSkip && !answered && (
          <button type="button" onClick={onSkip} className="rounded-xl border border-line px-4 py-2 text-sm text-ink-soft">
            Pular
          </button>
        )}
      </div>
    </div>
  );
}
