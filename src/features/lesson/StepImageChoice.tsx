import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  imageChoiceShowsAudioStimulus,
  imageChoiceShowsHanziStimulus,
  imageChoiceShowsImageStimulus,
  imageChoiceShowsMeaningStimulus,
  imageChoiceUsesAudioOptions,
  imageChoiceUsesImageOptions,
  imageChoiceUsesSentenceOptions,
  normalizeImageChoiceMode,
  resolveVisualConcept,
} from "../../data/visualVocabulary";
import { resolveVisualScene } from "../../data/visualScenes";
import { AudioChoiceGrid } from "../../components/hanzi/AudioChoiceGrid";
import { ImageChoiceGrid } from "../../components/hanzi/ImageChoiceGrid";
import { VisualConceptImage } from "../../components/hanzi/VisualConceptImage";
import { VisualExerciseFeedback } from "../../components/hanzi/VisualExerciseFeedback";
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

export function StepImageChoice({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const mode = step.imageChoiceMode ?? "image_to_hanzi";
  const normalized = normalizeImageChoiceMode(mode);
  const scene = resolveVisualScene(step.visualSceneId);
  const concept = resolveVisualConcept(step.imageId ?? step.iconId ?? scene?.conceptId);
  const stimulusConceptId = step.imageId ?? step.iconId ?? scene?.conceptId ?? concept?.id;

  const hanzi = step.targetHanzi ?? scene?.targetHanzi ?? concept?.hanzi ?? "";
  const pinyin = step.targetPinyin ?? scene?.targetPinyin ?? concept?.pinyin ?? "";
  const meaningPt = step.targetMeaningPt ?? scene?.targetMeaningPt ?? concept?.meaningPt ?? "";

  const isImagePick = imageChoiceUsesImageOptions(mode);
  const isAudioPick = imageChoiceUsesAudioOptions(mode);
  const isSentencePick = imageChoiceUsesSentenceOptions(mode);

  const correctAnswer = isImagePick ? step.correctImageId ?? "" : step.correctAnswer ?? "";
  const rawOptions = isImagePick ? step.imageOptions ?? [] : step.options ?? [];
  const options = useMemo(() => shuffle([...rawOptions]), [rawOptions.join("|")]);
  const imageOptionIds = isImagePick ? options : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);

  const audioText = step.targetHanzi ?? scene?.targetHanzi ?? concept?.hanzi ?? step.audioText;

  useEffect(() => {
    if (!imageChoiceShowsAudioStimulus(mode) || !audioText) return;
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
    enabled: !isAudioPick,
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

  const prompt = step.promptPt ?? step.prompt ?? "Escolha a opção correta.";
  const showTranslation =
    normalized === "image_to_hanzi" ||
    normalized === "image_to_meaning" ||
    (normalized === "image_sentence_choice" && !step.isNoHint);

  const wrongPrefix =
    meaningPt && hanzi
      ? `Esta imagem representa ${meaningPt.replace(/\.$/, "")}: ${hanzi}, ${formatPinyinForDisplay(pinyin)}.`
      : undefined;

  return (
    <div>
      <Eyebrow>Associação visual</Eyebrow>

      {imageChoiceShowsImageStimulus(mode) && (scene || concept) && (
        <div className="my-5 flex flex-col items-center gap-2">
          {scene ? (
            <VisualSceneImage sceneId={scene.id} size="xl" />
          ) : stimulusConceptId ? (
            <VisualConceptImage conceptId={stimulusConceptId} size="xl" />
          ) : null}
          {showTranslation && meaningPt && normalized !== "image_to_meaning" && (
            <p className="text-xs text-ink-faint">{meaningPt}</p>
          )}
        </div>
      )}

      <p className="mt-2 text-sm leading-6 text-ink-soft">{prompt}</p>

      {imageChoiceShowsHanziStimulus(mode) && hanzi && (
        <div className="my-5 flex justify-center">
          <MandarinText hanzi={hanzi} pinyin={step.isNoHint ? undefined : pinyin} size="lg" align="center" />
        </div>
      )}

      {imageChoiceShowsMeaningStimulus(mode) && meaningPt && (
        <div className="my-5 flex justify-center">
          <p className="text-xl font-semibold text-ink">{meaningPt}</p>
        </div>
      )}

      {imageChoiceShowsAudioStimulus(mode) && (
        <div className="my-5 flex flex-col items-center gap-3">
          <SpeakButton text={audioText ?? ""} size="lg" label="Ouvir" />
          <p className="text-sm text-ink-soft">Ouça e escolha a imagem certa.</p>
        </div>
      )}

      {!isAudioPick && <KeyboardShortcutHint />}

      {isAudioPick ? (
        <AudioChoiceGrid
          options={options}
          answered={answered}
          selected={selected}
          correctAnswer={correctAnswer}
          onSelect={(value) => {
            selectOption(value);
            answerOption(value);
          }}
        />
      ) : (
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
            if (normalized === "image_to_hanzi") {
              return <span className="font-serif text-3xl font-semibold">{value}</span>;
            }
            if (normalized === "image_to_pinyin") {
              return <span className="text-lg font-medium">{formatPinyinForDisplay(value)}</span>;
            }
            if (isSentencePick || /[\u3400-\u9fff]/.test(value)) {
              return <MandarinText hanzi={value} size="sm" align="center" />;
            }
            return <span className="text-sm font-medium leading-5">{value}</span>;
          }}
        />
      )}

      {answered && (
        <VisualExerciseFeedback
          correct={answered === correctAnswer}
          hanzi={hanzi}
          pinyin={pinyin}
          meaningPt={meaningPt}
          conceptId={stimulusConceptId}
          visualSceneId={step.visualSceneId}
          wrongPrefix={wrongPrefix}
        />
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!answered && !isAudioPick && (
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
