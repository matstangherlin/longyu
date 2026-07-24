import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LessonStep, StepTextType } from "../../data/journey";
import type { ConversationNode } from "../../data/conversationScenes";
import { CHARACTERS, charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { TONE_COLOR, TONE_LABELS, TONE_LISTENING_TIPS, TONE_NAMES } from "../../data/tones";
import { HANZI_EVOLUTIONS, HANZI_CONCEPT_EXPLANATIONS } from "../../data/hanziPedagogy";
import { glossFor } from "../../data/gloss";
import { numericPinyinToDiacritics } from "../../lib/pinyin";
import { speak, scheduleAutoSpeak } from "../../lib/tts";
import {
  personalizeConversationPrompt,
  personalizeName as personalizeValue,
  useStudentFirstName,
} from "../../lib/personalize";
import { useAutoSpeak } from "../../lib/useAutoSpeak";
import { playSoundFx } from "../../lib/soundFx";
import {
  KeyboardShortcutHint,
  ShortcutBadge,
  leftPairShortcut,
  rightPairShortcut,
  shortcutKeyForIndex,
  useExerciseHotkeys,
} from "../../lib/useExerciseHotkeys";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { useStore } from "../../lib/store";
import { Button } from "../../components/ui/primitives";
import { ExerciseText, containsCjk } from "../../components/hanzi/ExerciseText";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { MandarinHelpProvider, useMandarinHelpSettings } from "../../components/hanzi/helpMode";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { DecompositionCard } from "../../components/hanzi/DecompositionCard";
import { HanziConceptSlide } from "../../components/hanzi/HanziConceptSlide";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";
import { getHanziBuilder } from "../../data/hanziBuilder";
import { IconCheck, IconX, IconChevron, IconSound, IconFlame } from "../../components/ui/Icon";
import { PronunciationPractice } from "./PronunciationPractice";
import { FeedbackButton } from "../../components/feedback/FeedbackButton";
import { validateExercise } from "./exerciseValidation";
import { StepImageChoice } from "./StepImageChoice";
import { ConversationSceneStep } from "./ConversationSceneStep";
import type { ItemType } from "../../data/types";

export interface PairMistakePayload {
  kind: "pair-match";
  pairIndex: number;
  left: string;
  expectedRight: string;
  userAnswer: string;
  leftType?: StepTextType;
  rightType?: StepTextType;
  selectedRightType?: StepTextType;
  reviewType?: ItemType;
  reviewItemId?: string;
}

export interface StepDoneMeta {
  /** Tentativas reais na conversa V2 (erros de ramo contam). */
  attempts?: number;
}

export interface StepProps {
  step: LessonStep;
  onDone: (correct?: boolean, meta?: StepDoneMeta) => void;
  onSkip?: () => void;
  onMistake?: (answer?: string, payload?: PairMistakePayload) => void;
}

type ToneN = 1 | 2 | 3 | 4;

function ToneCurve({ tone, size = 16 }: { tone: ToneN; size?: number }) {
  const paths: Record<ToneN, string> = {
    1: "M4 8 H44",
    2: "M4 20 L44 6",
    3: "M4 10 C14 26, 26 26, 44 8",
    4: "M4 6 L44 22",
  };
  return (
    <svg viewBox="0 0 48 28" style={{ height: size }} className="w-12">
      <path d={paths[tone]} fill="none" stroke={TONE_COLOR[tone]} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function ContinueBtn({ onClick, label = "Continuar" }: { onClick: () => void; label?: string }) {
  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    isAnswered: true,
    onContinue: onClick,
  });
  return (
    <Button className="mt-4 w-full animate-pop shadow-lift" onClick={onClick}>
      {label}
      <IconChevron width={18} height={18} aria-hidden="true" />
    </Button>
  );
}

function SkipStepButton({ onSkip, className = "mt-3" }: { onSkip?: () => void; className?: string }) {
  if (!onSkip) return null;
  return (
    <button
      type="button"
      onClick={onSkip}
      className={[
        "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-xs font-semibold text-ink-faint transition hover:bg-surface-2 hover:text-ink-soft",
        className,
      ].join(" ")}
    >
      <IconFlame width={13} height={13} />
      Pular · custa 1 fôlego
    </button>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
      {children}
    </div>
  );
}

// Banner de feedback (significado + pronúncia) após responder.
function AnswerFeedback({
  correct,
  hanzi,
  pinyin,
  meaning,
  hint,
  onContinue,
}: {
  correct: boolean;
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  /** Dica didática mostrada ao errar (ex.: "日 sol + 月 lua → claro"). */
  hint?: string;
  onContinue: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "animate-pop mt-4 rounded-2xl border p-3.5",
        correct ? "border-transparent bg-[rgb(var(--good)/0.12)] longyu-success-bloom" : "border-accent-soft bg-accent-soft/45",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-center gap-1.5 text-sm font-semibold",
          correct ? "text-[rgb(var(--good))]" : "text-accent",
        ].join(" ")}
      >
        {correct ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
        {correct ? "Certo! +Qi" : "Quase"}
      </div>
      <MandarinText
        hanzi={hanzi}
        pinyin={pinyin}
        meaning={meaning}
        size="md"
        audio
        align="center"
        className="mt-2"
      />
      {!correct && hint && (
        <p className="mt-2 rounded-lg bg-surface/70 px-3 py-2 text-center text-xs text-ink-soft">
          {hint}
        </p>
      )}
      <ContinueBtn onClick={onContinue} />
    </div>
  );
}

function ToneAnswerFeedback({
  correct,
  picked,
  answer,
  hanzi,
  pinyin,
  meaning,
  onContinue,
}: {
  correct: boolean;
  picked: ToneN;
  answer: ToneN;
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  onContinue: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "animate-pop mt-4 rounded-2xl border p-3.5 text-left",
        correct ? "border-transparent bg-[rgb(var(--good)/0.12)] longyu-success-bloom" : "border-accent-soft bg-accent-soft/45",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2 text-sm font-semibold",
          correct ? "text-[rgb(var(--good))]" : "text-accent",
        ].join(" ")}
      >
        {correct ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
        {correct ? "Certo! +Qi" : "Quase — compare os contornos."}
      </div>

      <div className="mt-3 rounded-xl bg-surface/70 px-3 py-2">
        <MandarinText
          hanzi={hanzi}
          pinyin={pinyin}
          meaning={meaning}
          size="md"
          audio
          autoPlay={false}
        />
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-surface/70 px-3 py-2">
          <span className="text-ink-faint">Você marcou: </span>
          <span className="font-medium text-ink">{picked}º — {TONE_LABELS[picked]}</span>
        </div>
        <div className="rounded-xl bg-surface/70 px-3 py-2">
          <span className="text-ink-faint">Era: </span>
          <span className="font-medium text-ink">{answer}º — {TONE_LABELS[answer]}</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        Pista auditiva: {TONE_LISTENING_TIPS[answer]}.
      </p>
      <ContinueBtn onClick={onContinue} />
    </div>
  );
}

function pinyinWithoutToneMark(text?: string): string {
  return numericPinyinToDiacritics(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function personalizeNode(node: ConversationNode, name: string | undefined): ConversationNode {
  const interaction = node.interaction;
  return {
    ...node,
    hanzi: personalizeValue(node.hanzi, name) ?? node.hanzi,
    pinyin: personalizeValue(node.pinyin, name) ?? node.pinyin,
    pt: personalizeValue(node.pt, name) ?? node.pt,
    audioText: personalizeValue(node.audioText, name) ?? node.audioText,
    interaction: interaction
      ? {
          ...interaction,
          prompt: personalizeConversationPrompt(interaction.prompt, name) ?? interaction.prompt,
          correctAnswer: personalizeValue(interaction.correctAnswer, name) ?? interaction.correctAnswer,
          explanation: personalizeConversationPrompt(interaction.explanation, name) ?? interaction.explanation,
          options: interaction.options?.map((option) => personalizeValue(option, name) ?? option),
        }
      : interaction,
  };
}

function personalizeStep(step: LessonStep, name: string | undefined): LessonStep {
  return {
    ...step,
    // Personagens da cena: o avatar do aluno (esquerda) recebe o nome do usuário.
    characters: step.characters?.map((character) => ({
      ...character,
      name: personalizeValue(character.name, name) ?? character.name,
    })),
    // Fluxo V2 por nós (o que o player realmente renderiza hoje): as falas e as
    // interações também precisam trocar "马修/Matheus" (e "Lin" legado) pelo nome.
    nodes: step.nodes?.map((node) => personalizeNode(node, name)),
    title: personalizeValue(step.title, name),
    body: personalizeValue(step.body, name),
    text: personalizeValue(step.text, name),
    pinyin: personalizeValue(step.pinyin, name),
    pt: personalizeValue(step.pt, name),
    hanzi: personalizeValue(step.hanzi, name),
    answer: personalizeValue(step.answer, name),
    suggestion: personalizeValue(step.suggestion, name),
    placeholder: personalizeValue(step.placeholder, name),
    requiredTerms: step.requiredTerms?.map((term) => personalizeValue(term, name) ?? term),
    wordBank: step.wordBank?.map((part) => personalizeValue(part, name) ?? part),
    accepts: step.accepts?.map((answer) => personalizeValue(answer, name) ?? answer),
    options: step.options?.map((option) => personalizeValue(option, name) ?? option),
    target: step.target?.map((part) => personalizeValue(part, name) ?? part),
    bank: step.bank?.map((part) => personalizeValue(part, name) ?? part),
    pairs: step.pairs?.map((pair) => ({
      ...pair,
      left: personalizeValue(pair.left, name) ?? pair.left,
      right: personalizeValue(pair.right, name) ?? pair.right,
    })),
    audioText: personalizeValue(step.audioText, name),
    slowAudioText: personalizeValue(step.slowAudioText, name),
    prompt: personalizeConversationPrompt(step.prompt, name),
    sourceText: personalizeValue(step.sourceText, name),
    sourcePinyin: personalizeValue(step.sourcePinyin, name),
    sourceMeaning: personalizeValue(step.sourceMeaning, name),
    targetParts: step.targetParts?.map((part) => personalizeValue(part, name) ?? part),
    distractors: step.distractors?.map((part) => personalizeValue(part, name) ?? part),
    sentenceBefore: personalizeValue(step.sentenceBefore, name),
    sentenceAfter: personalizeValue(step.sentenceAfter, name),
    blankAnswer: personalizeValue(step.blankAnswer, name),
    speaker: personalizeValue(step.speaker, name),
    dialoguePrompt: personalizeConversationPrompt(step.dialoguePrompt, name),
    correctAnswer: personalizeValue(step.correctAnswer, name),
    explanation: personalizeConversationPrompt(step.explanation, name),
    lines: step.lines?.map((line) => ({
      ...line,
      hanzi: personalizeValue(line.hanzi, name) ?? line.hanzi,
      pinyin: personalizeValue(line.pinyin, name) ?? line.pinyin,
      pt: personalizeValue(line.pt, name) ?? line.pt,
      audioText: personalizeValue(line.audioText, name) ?? line.audioText,
    })),
    checkpoint: step.checkpoint
      ? {
          ...step.checkpoint,
          prompt: personalizeConversationPrompt(step.checkpoint.prompt, name) ?? step.checkpoint.prompt,
          correctAnswer:
            personalizeValue(step.checkpoint.correctAnswer, name) ?? step.checkpoint.correctAnswer,
          explanation:
            personalizeConversationPrompt(step.checkpoint.explanation, name) ?? step.checkpoint.explanation,
          options: step.checkpoint.options?.map((option) => personalizeValue(option, name) ?? option),
        }
      : step.checkpoint,
  };
}

// ---------------------------------------------------------------------------

function StepIntro({ step, onDone }: StepProps) {
  return (
    <div>
      <Eyebrow>Entenda</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      <p className="mt-3 text-ink-soft">{step.body}</p>
      <ContinueBtn onClick={() => onDone()} label="Entendi" />
    </div>
  );
}

function StepListen({ step, onDone }: StepProps) {
  return (
    <div className="text-center">
      <Eyebrow>Ouça e imite</Eyebrow>
      <div className="my-4">
        <MandarinText
          hanzi={step.text!}
          pinyin={step.pinyin}
          meaning={step.pt}
          size="lg"
          audio
          align="center"
        />
      </div>
      <PronunciationPractice target={step.text!} onContinue={() => onDone()} />
    </div>
  );
}

function StepTone({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const [selectedTone, setSelectedTone] = useState<ToneN | null>(null);
  const [picked, setPicked] = useState<ToneN | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const guided = step.assist !== "quiz";
  const [hintLevel, setHintLevel] = useState(guided ? 1 : 0);
  const [listenCount, setListenCount] = useState(0);
  const answer = step.tone as ToneN;
  const meaning = glossFor(step.hanzi!)?.pt;
  const basePinyin = pinyinWithoutToneMark(step.pinyin);

  function pick(t: ToneN) {
    if (picked) return;
    setSelectedTone(t);
    playSoundFx(t === answer ? "success" : "pieceSelect", soundEffects);
    setPicked(t);
    if (t !== answer) onMistake?.(`${t} tom`);
  }

  function selectTone(t: ToneN) {
    if (picked) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelectedTone(t);
  }

  function play() {
    setListenCount((n) => n + 1);
    speak(step.hanzi!, { rate: 0.8 });
  }

  useEffect(() => {
    if (picked != null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [picked]);

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: 4,
    isAnswered: picked != null && (picked === answer || !onMistake),
    hasSelection: selectedTone != null,
    onSelectOption: (index) => {
      const tone = ([1, 2, 3, 4] as ToneN[])[index];
      if (tone) selectTone(tone);
    },
    onSubmit: () => {
      if (selectedTone != null) pick(selectedTone);
    },
    onContinue: () => {
      if (picked != null) onDone(picked === answer);
    },
  });

  return (
    <div className="text-center">
      <Eyebrow>{guided ? "Ouvido tonal" : "Qual é o tom?"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">Qual contorno você ouviu?</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        Escute primeiro, compare com as curvas e só peça a dica forte se travar.
      </p>

      <div className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-2 text-xs font-medium">
        {["1. Ouça", "2. Compare", "3. Escolha"].map((label, i) => (
          <div
            key={label}
            className={[
              "rounded-full px-3 py-1.5",
              (i === 0 && listenCount > 0) ||
              (i === 1 && hintLevel >= 1) ||
              (i === 2 && picked != null)
                ? "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
                : "bg-surface-2 text-ink-faint",
            ].join(" ")}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mx-auto my-3 grid max-w-md gap-3 sm:my-4 sm:max-w-xl sm:grid-cols-[112px_1fr] sm:items-start">
        <button
          onClick={play}
          className="mx-auto flex h-14 w-14 flex-col items-center justify-center rounded-full bg-accent-soft text-accent shadow-sm ring-4 ring-accent-soft/40 transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
          aria-label="Ouvir"
        >
          <IconSound width={26} height={26} />
          <span className="mt-1 text-[11px] font-semibold">
            {listenCount > 0 ? `${listenCount}x` : "Ouvir"}
          </span>
        </button>

        <div className="rounded-2xl bg-surface-2/80 p-3 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Dica 1 · sem entregar
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="hanzi text-3xl text-ink">{step.hanzi}</span>
                {basePinyin && (
                  <span className="font-serif text-xl text-ink-soft">{basePinyin}</span>
                )}
              </div>
              {meaning && <div className="mt-1 text-sm text-ink-soft">{meaning}</div>}
            </div>
            <div className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-faint">
              pinyin sem tom
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as ToneN[]).map((t) => (
              <div
                key={t}
                className={[
                  "rounded-xl bg-surface px-2 py-2 text-center transition",
                  hintLevel >= 2 && t === answer ? "ring-2 ring-accent/40" : "",
                ].join(" ")}
              >
                <ToneCurve tone={t} size={13} />
                <div className="mt-0.5 text-[11px] font-medium text-ink-soft">
                  {t}º tom
                </div>
              </div>
            ))}
          </div>

          {hintLevel >= 2 ? (
            <div className="mt-3 rounded-xl bg-surface px-3 py-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Dica 2 · resposta explicada
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {step.pinyin && <Pinyin text={step.pinyin} className="font-serif text-xl" />}
                  <span className="text-sm font-medium text-ink">{TONE_NAMES[answer]}</span>
                </div>
                <div className="mt-1 text-sm text-ink-soft">
                  Escute se o som {TONE_LISTENING_TIPS[answer]}.
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="soft"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setHintLevel(2)}
            >
              Estou travado · mostrar pinyin e tom
            </Button>
          )}
        </div>
      </div>

      <KeyboardShortcutHint />
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {([1, 2, 3, 4] as ToneN[]).map((t) => {
          const state = picked == null ? (selectedTone === t ? "selected" : "idle") : t === answer ? "right" : t === picked ? "wrong" : "idle";
          return (
            <button
              key={t}
              onClick={() => pick(t)}
              disabled={picked != null}
              className={[
                "relative flex flex-col items-center gap-1 rounded-xl border py-2.5 transition disabled:cursor-default sm:py-3",
                state === "idle" && "border-line bg-surface hover:bg-surface-2",
                state === "selected" && "border-accent bg-accent-soft text-accent",
                state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
                state === "wrong" && "border-transparent bg-wrong-soft",
              ].filter(Boolean).join(" ")}
              aria-label={`Opção ${t}: ${t}º tom`}
            >
              <ShortcutBadge className="shrink-0">{t}</ShortcutBadge>
              <ToneCurve tone={t} />
              <span className="text-xs font-medium text-ink sm:text-sm">{t}º tom</span>
            </button>
          );
        })}
      </div>
      {picked == null && <SkipStepButton onSkip={onSkip} />}
      {picked != null && (picked === answer || !onMistake) && (
        <div ref={feedbackRef}>
          <ToneAnswerFeedback
            correct={picked === answer}
            picked={picked}
            answer={answer}
            hanzi={step.hanzi!}
            pinyin={step.pinyin}
            meaning={meaning}
            onContinue={() => onDone(picked === answer)}
          />
        </div>
      )}
    </div>
  );
}

function StepComprehend({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const options = useMemo(() => shuffle(step.options ?? []), [step]);

  function selectOption(option: string) {
    if (answered) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelected(option);
  }

  function answerOption(option: string) {
    if (answered) return;
    playSoundFx(option === step.answer ? "success" : "pieceSelect", soundEffects);
    setSelected(option);
    setAnswered(option);
    if (option !== step.answer) onMistake?.(option);
  }

  function submitSelected() {
    if (!selected || answered) return;
    answerOption(selected);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: answered != null && (answered === step.answer || !onMistake),
    hasSelection: Boolean(selected),
    onSelectOption: (index) => {
      const option = options[index];
      if (option) selectOption(option);
    },
    onSubmit: submitSelected,
    onContinue: () => {
      if (answered) onDone(answered === step.answer);
    },
  });

  return (
    <div>
      <Eyebrow>Compreenda</Eyebrow>
      <div className="my-4">
        <MandarinText
          hanzi={step.hanzi!}
          pinyin={step.pinyin}
          size="lg"
          audio
          align="center"
        />
      </div>
      <KeyboardShortcutHint />
      <div className="grid gap-2">
        {options.map((o, index) => {
          const state = answered == null ? (o === selected ? "selected" : "idle") : o === step.answer ? "right" : o === answered ? "wrong" : "idle";
          return (
            <button
              key={o}
              onClick={() => answerOption(o)}
              disabled={answered != null}
              aria-label={`Opção ${shortcutKeyForIndex(index)}: ${o}`}
              className={[
                "relative flex min-h-12 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition",
                state === "idle" && "border-line hover:bg-surface-2",
                state === "selected" && "border-accent bg-accent-soft text-accent",
                state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
                state === "wrong" && "border-transparent bg-wrong-soft",
              ].filter(Boolean).join(" ")}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="min-w-0 flex-1">{o}</span>
              {state === "right" && <IconCheck className="text-[rgb(var(--good))]" />}
              {state === "wrong" && <IconX className="text-wrong" />}
            </button>
          );
        })}
      </div>
      {answered == null && <SkipStepButton onSkip={onSkip} />}
      {answered != null && (answered === step.answer || !onMistake) && (
        <AnswerFeedback
          correct={answered === step.answer}
          hanzi={step.hanzi!}
          pinyin={step.pinyin}
          meaning={step.answer}
          onContinue={() => onDone(answered === step.answer)}
        />
      )}
    </div>
  );
}

function StepProduce({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const target = step.target ?? [];
  const bank = step.bank ?? [];
  const [picked, setPicked] = useState<string[]>([]);
  const wrongAttemptChargedRef = useRef(false);
  const done = picked.join("") === target.join("");
  const full = picked.length >= target.length;

  useEffect(() => {
    if (!full) {
      wrongAttemptChargedRef.current = false;
      return;
    }
    if (!done && !wrongAttemptChargedRef.current) {
      wrongAttemptChargedRef.current = true;
      onMistake?.(picked.join(""));
    }
  }, [done, full, onMistake]);

  function addBankPiece(piece: string) {
    if (full) return;
    speakExercisePiece(piece);
    playSoundFx("pieceSelect", soundEffects);
    setPicked((p) => [...p, piece]);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "builder",
    optionCount: bank.length,
    isAnswered: done,
    hasSelection: picked.length > 0,
    onSelectOption: (index) => {
      const piece = bank[index];
      if (piece) addBankPiece(piece);
    },
    onContinue: () => onDone(true),
  });

  return (
    <div>
      <Eyebrow>Produza</Eyebrow>
      <p className="mt-2 text-sm text-ink-soft">Monte “{step.pt}” na ordem certa.</p>
      <div className="my-4 flex min-h-[64px] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed border-accent-soft bg-surface-2/80 p-4">
        {picked.length === 0 && <span className="text-sm font-medium text-ink-faint">toque nas peças</span>}
        {picked.map((p, i) => (
          <button key={i} onClick={() => {
            playSoundFx("tap", soundEffects);
            setPicked((arr) => arr.filter((_, idx) => idx !== i));
          }} className={engineTileClass({ cjk: isCjkText(p), active: true })}>
            <ExerciseText value={p} type={isCjkText(p) ? "hanzi" : "pt"} speakOnClick />
          </button>
        ))}
      </div>
      <KeyboardShortcutHint />
      <div className="flex flex-wrap justify-center gap-2.5">
        {bank.map((b, i) => (
          <button
            key={i}
            onClick={() => addBankPiece(b)}
            disabled={full}
            className={[engineTileClass({ cjk: isCjkText(b) }), "relative"].join(" ")}
            aria-label={`Peça ${shortcutKeyForIndex(i)}: ${b}`}
          >
            <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(i)}</ShortcutBadge>
            <ExerciseText value={b} type={isCjkText(b) ? "hanzi" : "pt"} speakOnClick />
          </button>
        ))}
      </div>
      {!full && !done && <SkipStepButton onSkip={onSkip} />}
      {full && !done && !onMistake && (
        <div className="animate-pop mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent">
            <IconX width={18} height={18} />
            Quase
          </div>
          <p className="mt-2 text-sm text-ink-soft">A resposta certa está abaixo. Tente montar de novo.</p>
          <div className="mt-2 hanzi text-3xl text-ink">
            <ExerciseText value={target.join("")} type="hanzi" speakOnClick />
          </div>
          <div className="mt-4">
            <Button variant="good" className="w-full shadow-lift" onClick={() => {
              playSoundFx("tap", soundEffects);
              setPicked([]);
            }}>
              Tentar de novo
            </Button>
          </div>
        </div>
      )}
      {done && <ContinueBtn onClick={() => onDone(true)} label="Certo! +Qi" />}
    </div>
  );
}

type WriteStatus = "partial" | "wrong" | "correct" | null;

function normalizeWriteText(text: string): string {
  return pinyinWithoutToneMark(text)
    .toLowerCase()
    .replace(/[，。！？、,.!?？;:：；"“”'‘’()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function hasWriteTerm(text: string, term: string): boolean {
  const cleanTerm = term.trim();
  if (!cleanTerm) return false;
  return text.toLowerCase().includes(cleanTerm.toLowerCase()) ||
    normalizeWriteText(text).includes(normalizeWriteText(cleanTerm));
}

function uniqueStrings(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

type GlossedPieceToken = {
  id: string;
  value: string;
};

function joinWritePieces(pieces: string[]): string {
  return pieces.reduce((draft, piece) => appendWritePiece(draft, piece), "");
}

function appendWritePiece(draft: string, piece: string): string {
  const cleanPiece = piece.trim();
  if (!cleanPiece) return draft;
  const cleanDraft = draft.trimEnd();
  if (!cleanDraft) return cleanPiece;

  const previous = cleanDraft.slice(-1);
  const next = cleanPiece.slice(0, 1);
  const separator = containsCjk(previous) && containsCjk(next) ? "" : " ";
  return `${cleanDraft}${separator}${cleanPiece}`;
}

function suggestionStarter(step: LessonStep, requiredTerms: string[], acceptedAnswers: string[]): string {
  if (requiredTerms.length > 0) {
    if (step.mode === "free_reflection") {
      return `${appendWritePiece("Uso", requiredTerms[0])} quando `;
    }
    return joinWritePieces(requiredTerms);
  }
  return acceptedAnswers[0] ?? step.answer ?? "";
}

function suggestionFeedbackText(suggestion: string): string {
  return suggestion
    .replace(/^use a estrutura:\s*/i, "")
    .replace(/^complete:\s*/i, "")
    .replace(/\.$/, "");
}

function isWriteAnswerCorrect(
  step: LessonStep,
  draft: string,
  requiredTerms: string[],
  acceptedAnswers: string[]
): boolean {
  const normalizedDraft = normalizeWriteText(draft);
  const accepted = acceptedAnswers.some((answer) => normalizedDraft === normalizeWriteText(answer));
  const mode = step.mode ?? "guided_write";

  if (accepted) return true;
  if (mode === "translation_fill") return false;

  const requiredSize = normalizeWriteText(joinWritePieces(requiredTerms)).length;
  if (mode === "guided_write") {
    return requiredTerms.length > 0 && normalizedDraft.length > requiredSize;
  }

  return normalizedDraft.length >= Math.max(4, requiredSize + 2);
}

function StepWrite({ step, onDone, onSkip, onMistake }: StepProps) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<WriteStatus>(null);
  const [modelVisible, setModelVisible] = useState(false);
  const [pickedPieces, setPickedPieces] = useState<GlossedPieceToken[]>([]);
  const [typedMode, setTypedMode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isFreeReflection = (step.mode ?? "free_reflection") === "free_reflection";

  const suggestion = step.suggestion ?? step.answer ?? "Use a estrutura sugerida e complete com suas palavras.";
  const requiredTerms = step.requiredTerms ?? [];
  const wordBank = step.wordBank ?? [];
  // Tradução guiada com banco de peças: montar a resposta ordenando sugestões
  // é o modo primário — nada de campo dissertativo aberto. Peças repetidas
  // ganham ids únicos por posição; "Prefiro digitar" abre o campo livre.
  const guidedPieces = !isFreeReflection && step.mode === "translation_fill" && wordBank.length > 0;
  const pieceTokens = useMemo(
    () => wordBank.map((value, index) => ({ id: `wb_${index}`, value })),
    [wordBank]
  );
  const usedPieceIds = new Set(pickedPieces.map((piece) => piece.id));
  const composing = guidedPieces && !typedMode;
  const acceptedAnswers = useMemo(
    () => uniqueStrings([...(step.accepts ?? []), step.answer]),
    [step.accepts, step.answer]
  );
  const usedRequiredTerms = requiredTerms.filter((term) => hasWriteTerm(draft, term));
  const missingRequiredTerms = requiredTerms.filter((term) => !hasWriteTerm(draft, term));
  const hasDraft = normalizeWriteText(draft).length > 0;
  const hasRequiredStarter = requiredTerms.length === 0 || usedRequiredTerms.length > 0;
  const canCheck = hasDraft && hasRequiredStarter && status !== "correct";

  function updateDraft(value: string) {
    setDraft(value);
    if (status !== "correct") setStatus(null);
  }

  function useSuggestion() {
    setPickedPieces([]);
    setTypedMode(true);
    updateDraft(suggestionStarter(step, requiredTerms, acceptedAnswers));
    setModelVisible(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function addPiece(piece: string) {
    updateDraft(appendWritePiece(draft, piece));
    setModelVisible(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function addGuidedPiece(token: GlossedPieceToken) {
    if (status === "correct" || usedPieceIds.has(token.id)) return;
    const next = [...pickedPieces, token];
    setPickedPieces(next);
    updateDraft(joinWritePieces(next.map((piece) => piece.value)));
    setModelVisible(false);
  }

  function removeGuidedPiece(index: number) {
    if (status === "correct") return;
    const next = pickedPieces.filter((_, i) => i !== index);
    setPickedPieces(next);
    updateDraft(joinWritePieces(next.map((piece) => piece.value)));
  }

  function checkAnswer() {
    if (!canCheck) return;
    if (missingRequiredTerms.length > 0) {
      setStatus("partial");
      setModelVisible(false);
      return;
    }

    if (isWriteAnswerCorrect(step, draft, requiredTerms, acceptedAnswers)) {
      setStatus("correct");
      setModelVisible(false);
      return;
    }

    setStatus("wrong");
    setModelVisible(true);
    onMistake?.(draft);
  }

  function retry() {
    if (status === "wrong") {
      setDraft("");
      setPickedPieces([]);
    }
    setStatus(null);
    setModelVisible(false);
    if (!composing) window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (status) feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [status]);

  return (
    <div>
      <Eyebrow>{isFreeReflection ? "Reflexão opcional" : "Escrita guiada"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      {step.body && <p className="mt-3 text-sm leading-6 text-ink-soft">{step.body}</p>}

      <div className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Sugestão</div>
        <p className="mt-1 text-sm leading-6 text-ink">{suggestion}</p>
      </div>

      {requiredTerms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {requiredTerms.map((term) => {
            const used = hasWriteTerm(draft, term);
            return (
              <span
                key={term}
                className={[
                  "inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium",
                  containsCjk(term) ? "hanzi text-base" : "",
                  used
                    ? "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
                    : "border-line bg-surface-2 text-ink-faint",
                ].join(" ")}
              >
                {term}
              </span>
            );
          })}
        </div>
      )}

      {composing && (
        <div className="mt-4 flex min-h-[64px] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed border-accent-soft bg-surface-2/80 p-4 shadow-inner">
          {pickedPieces.length === 0 && (
            <span className="text-sm font-medium text-ink-faint">toque nas peças para montar a resposta</span>
          )}
          {pickedPieces.map((piece, index) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => removeGuidedPiece(index)}
              disabled={status === "correct"}
              className={[engineTileClass({ active: true, cjk: isCjkText(piece.value) }), "group relative min-w-[3.5rem] overflow-visible"].join(" ")}
            >
              <ExerciseText value={piece.value} type={isCjkText(piece.value) ? "hanzi" : "pt"} speakOnClick />
            </button>
          ))}
        </div>
      )}

      {wordBank.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {composing ? "Peças sugeridas" : "Banco de peças"}
          </div>
          <div className="flex flex-wrap gap-2">
            {composing
              ? pieceTokens.map((token) => {
                  const used = usedPieceIds.has(token.id);
                  return (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => addGuidedPiece(token)}
                      disabled={used || status === "correct"}
                      className={[
                        engineTileClass({ cjk: isCjkText(token.value) }),
                        "group relative overflow-visible",
                        used ? "bg-surface-2 text-ink-faint opacity-[0.35] grayscale" : "",
                      ].join(" ")}
                    >
                      <ExerciseText value={token.value} type={isCjkText(token.value) ? "hanzi" : "pt"} speakOnClick />
                    </button>
                  );
                })
              : wordBank.map((piece, index) => (
                  <button
                    key={`${piece}-${index}`}
                    type="button"
                    onClick={() => addPiece(piece)}
                    disabled={status === "correct"}
                    className={[
                      "min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-surface-2 active:scale-[0.99] disabled:opacity-50",
                      "group relative overflow-visible",
                      containsCjk(piece) ? "hanzi text-xl" : "",
                    ].join(" ")}
                  >
                    <ExerciseText value={piece} type={containsCjk(piece) ? "hanzi" : "pt"} speakOnClick />
                  </button>
                ))}
          </div>
        </div>
      )}

      {!composing && (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          placeholder={step.placeholder}
          disabled={status === "correct"}
          rows={3}
          className="mt-4 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition focus:ring-2 focus:ring-accent/25 disabled:bg-surface-2"
        />
      )}

      {guidedPieces && (
        <button
          type="button"
          onClick={() => {
            if (composing) {
              setTypedMode(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
              return;
            }
            setTypedMode(false);
            setPickedPieces([]);
            updateDraft("");
          }}
          className="mt-2 text-xs font-semibold text-ink-faint underline-offset-2 transition hover:text-ink-soft hover:underline"
        >
          {composing ? "Prefiro digitar" : "Voltar às peças"}
        </button>
      )}

      {!hasRequiredStarter && hasDraft && (
        <p className="mt-2 text-xs font-medium text-ink-faint">
          Use pelo menos uma peça obrigatória para conferir.
        </p>
      )}

      {isFreeReflection ? (
        <Button className="mt-4 w-full" onClick={() => onDone()}>
          Continuar <IconChevron width={18} height={18} />
        </Button>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="soft" onClick={useSuggestion} disabled={status === "correct"}>
              Usar sugestão
            </Button>
            <Button variant="outline" onClick={() => setModelVisible(true)} disabled={status === "correct"}>
              Ver resposta modelo
            </Button>
          </div>

          <Button className="mt-3 w-full" disabled={!canCheck} onClick={checkAnswer}>
            Conferir
          </Button>
        </>
      )}

      {modelVisible && status !== "wrong" && status !== "correct" && (
        <div className="animate-pop mt-4 rounded-2xl border border-line bg-surface-2 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Resposta modelo
          </div>
          <p className="mt-2 text-sm leading-6 text-ink">{step.answer}</p>
        </div>
      )}

      {!isFreeReflection && !status && <SkipStepButton onSkip={onSkip} />}

      {status && (status !== "wrong" || !onMistake) && (
        <div
          ref={feedbackRef}
          className={[
            "animate-pop mt-4 rounded-2xl p-4",
            status === "correct" ? "bg-[rgb(var(--good)/0.12)] longyu-success-bloom" : "bg-accent-soft/45",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2 text-sm font-semibold",
              status === "correct" ? "text-[rgb(var(--good))]" : "text-accent",
            ].join(" ")}
          >
            {status === "correct" ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
            {status === "correct" ? "Boa! +Qi" : "Quase"}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {status === "correct"
              ? "Boa! Você usou a estrutura certa."
              : status === "partial"
              ? `Quase. Use a estrutura sugerida: ${suggestionFeedbackText(suggestion)}.`
              : `A resposta modelo é ${step.answer}. Toque nas peças para montar.`}
          </p>

          {status === "correct" ? (
            <Button variant="good" className="mt-4 w-full shadow-lift" onClick={() => onDone(true)}>
              Continuar <IconChevron width={18} height={18} />
            </Button>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="good" className="shadow-lift" onClick={retry}>
                Tentar de novo
              </Button>
              <Button variant="soft" onClick={() => setModelVisible(true)}>
                Ver resposta modelo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type EngineFeedback = "correct" | "wrong" | null;

function normalizeEngineAnswer(value: string | undefined): string {
  return normalizeWriteText(value ?? "");
}

function isCjkText(value: string | undefined): boolean {
  return containsCjk(value);
}

const LATIN_RE = /[A-Za-zÀ-ÿ]/;

// Rede de segurança de layout: mesmo que um texto maior chegue a um par/opção
// (conteúdo antigo, gerado ou de borda), ele nunca pode ser renderizado como
// hànzì gigante. Frase longa ou mistura de português + hànzì vira texto pequeno
// e truncado em vez de estourar o tile.
function isLongMixedText(value: string | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text) return false;
  if (isCjkText(text) && LATIN_RE.test(text)) return true; // PT + hànzì misturados
  if (text.length > 18) return true; // longo demais para um tile de par/opção
  if (/[.!?].*\S/.test(text) && text.split(/\s+/).filter(Boolean).length > 3) return true; // frase
  return false;
}

function shouldSpeakExercisePiece(value: string | undefined, type?: StepTextType): boolean {
  return type === "audio" || type === "hanzi" || isCjkText(value);
}

function speakExercisePiece(value: string | undefined, type?: StepTextType, rate = 0.86) {
  if (!value || !shouldSpeakExercisePiece(value, type)) return;
  speak(value, { rate });
}

type BuildPieceToken = GlossedPieceToken & {
  source: "target" | "distractor" | "bank";
};

function buildPieceToken(id: string, value: string, source: BuildPieceToken["source"]): BuildPieceToken {
  return {
    id,
    value,
    source,
  };
}

function buildPieceTokens(step: LessonStep, targetParts: string[]): BuildPieceToken[] {
  const targetQueues = new Map<string, number[]>();
  for (const [index, value] of targetParts.entries()) {
    targetQueues.set(value, [...(targetQueues.get(value) ?? []), index]);
  }

  const hasAuthoredBank = Boolean(step.bank?.length);
  const authoredBank = hasAuthoredBank ? step.bank ?? [] : targetParts;
  const tokens: BuildPieceToken[] = [];

  for (const [bankIndex, value] of authoredBank.entries()) {
    const targetQueue = targetQueues.get(value);
    const targetIndex = targetQueue?.shift();

    if (targetIndex !== undefined) {
      tokens.push(buildPieceToken(`target_${targetIndex}`, value, "target"));
    } else {
      tokens.push(buildPieceToken(`bank_${bankIndex}`, value, "bank"));
    }
  }

  const missingTargetTokens: BuildPieceToken[] = [];
  for (const [value, queue] of targetQueues.entries()) {
    for (const targetIndex of queue) {
      missingTargetTokens.push(buildPieceToken(`target_${targetIndex}`, value, "target"));
    }
  }

  if (missingTargetTokens.length > 0 && hasAuthoredBank && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn(
      `[Longyu] Banco de peças autoexpandido em "${step.title ?? step.kind}". ` +
        `Faltavam ocorrências para: ${missingTargetTokens.map((token) => token.value).join(", ")}.`
    );
  }

  const expandedTokens = insertMissingTargetTokens(tokens, missingTargetTokens);
  for (const [index, value] of (step.distractors ?? []).entries()) {
    expandedTokens.push(buildPieceToken(`distractor_${index}`, value, "distractor"));
  }

  return expandedTokens;
}

function insertMissingTargetTokens(tokens: BuildPieceToken[], missingTokens: BuildPieceToken[]): BuildPieceToken[] {
  const next = [...tokens];

  for (const token of missingTokens) {
    let insertAfter = -1;
    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (next[index].value === token.value) {
        insertAfter = index;
        break;
      }
    }

    if (insertAfter >= 0) next.splice(insertAfter + 1, 0, token);
    else next.push(token);
  }

  return next;
}

function engineTileClass({
  active,
  matched,
  wrong,
  cjk,
}: {
  active?: boolean;
  matched?: boolean;
  wrong?: boolean;
  cjk?: boolean;
}) {
  return [
    // Peças grandes: alvo de toque confortável (>= 68px) e fonte legível no mobile.
    "min-h-12 min-w-[3.25rem] rounded-2xl border px-3.5 py-2 text-center font-semibold shadow-card sm:min-h-[3.5rem] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none",
    cjk ? "hanzi text-[26px] sm:text-[30px]" : "text-[15px]",
    matched && "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))] ring-1 ring-[rgb(var(--good)/0.18)]",
    wrong && "longyu-error-shake border-transparent bg-wrong-soft text-wrong ring-1 ring-wrong/10",
    active && !matched && !wrong && "border-accent bg-accent-soft text-accent shadow-lift ring-2 ring-accent/15",
    !active && !matched && !wrong && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent-soft hover:bg-surface-2",
  ].filter(Boolean).join(" ");
}

function EngineFeedbackPanel({
  status,
  model,
  explanation,
  hadMistake,
  deferMistakeToParent = false,
  onRetry,
  onContinue,
}: {
  status: EngineFeedback;
  model?: string;
  explanation?: string;
  hadMistake: boolean;
  deferMistakeToParent?: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  if (!status) return null;
  if (status === "wrong" && deferMistakeToParent) return null;

  const correct = status === "correct";
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "animate-pop mt-4 rounded-2xl border p-3.5",
        correct ? "border-transparent bg-[rgb(var(--good)/0.12)] longyu-success-bloom" : "border-accent-soft bg-accent-soft/45",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2 text-sm font-semibold",
          correct ? "text-[rgb(var(--good))]" : "text-accent",
        ].join(" ")}
      >
        {correct ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
        {correct ? "Boa! +Qi" : "Quase"}
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {correct
          ? explanation ??
            (hadMistake
              ? "Agora ficou certo. Como houve tentativa anterior, esta parte entra para revisão."
              : "Você montou a estrutura certa.")
          : explanation ?? "A resposta certa está abaixo. Monte de novo para avançar."}
      </p>
      {correct && hadMistake && explanation && (
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          Como houve tentativa anterior, esta parte entra para revisão.
        </p>
      )}
      {model && (
        <div className="mt-3 rounded-xl bg-surface/75 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Resposta modelo
          </div>
          <div className={["mt-1 font-semibold text-ink", isCjkText(model) ? "text-2xl" : "text-sm"].join(" ")}>
            <ExerciseText value={model} type={isCjkText(model) ? "hanzi" : "pt"} speakOnClick />
          </div>
        </div>
      )}
      {correct ? (
        <Button variant="good" className="mt-4 w-full shadow-lift" onClick={onContinue}>
          Continuar <IconChevron width={18} height={18} />
        </Button>
      ) : (
        <Button variant="good" className="mt-4 w-full shadow-lift" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

function EngineActions({
  canCheck,
  onCheck,
  onSkip,
  onClear,
  canClear = false,
}: {
  canCheck: boolean;
  onCheck: () => void;
  onSkip?: () => void;
  onClear?: () => void;
  canClear?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg)/0.96)] to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-5 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pb-0">
      <div className={onClear ? "grid gap-2 sm:grid-cols-[0.8fr_1.2fr]" : ""}>
        {onClear && (
          <Button size="lg" variant="outline" className="w-full" disabled={!canClear} onClick={onClear}>
            Limpar
          </Button>
        )}
        <Button
          size="lg"
          variant={canCheck ? "good" : "outline"}
          className="w-full shadow-lift"
          disabled={!canCheck}
          onClick={onCheck}
        >
          Verificar
        </Button>
      </div>
      <SkipStepButton onSkip={onSkip} className="mt-3" />
    </div>
  );
}

function renderTypedValue(value: string, type?: StepTextType, className = "") {
  if (type === "audio") {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <IconSound width={18} height={18} />
        <ExerciseText value={value} type={containsCjk(value) ? "hanzi" : type} speakOnClick className={className || "text-[26px] sm:text-3xl"} />
      </span>
    );
  }

  // Frase longa ou português + hànzì misturado: nunca em fonte hànzì gigante.
  // Renderiza como texto pequeno, com no máximo 2 linhas, sem estourar o tile.
  // Vale mesmo para type "hanzi" — um hànzì puro e curto não cai aqui.
  if (type !== "pinyin" && isLongMixedText(value)) {
    return (
      <ExerciseText
        value={value}
        speakOnClick={isCjkText(value)}
        className={className || "block max-w-[16rem] text-[13px] font-medium leading-snug line-clamp-2"}
      />
    );
  }

  if (type === "hanzi" || containsCjk(value)) {
    return <ExerciseText value={value} type="hanzi" speakOnClick className={className || "text-[26px] sm:text-3xl"} />;
  }

  if (type === "pinyin") {
    return <ExerciseText value={value} type="pinyin" className={className || "font-serif text-lg"} />;
  }

  return <ExerciseText value={value} type={type} className={className} />;
}

// Lado de par tipo "audio": só o alto-falante enquanto não casar — o aluno
// combina de ouvido. Ao casar, o hànzì é revelado como recompensa.
function renderPairSide(value: string, type: StepTextType | undefined, matched: boolean) {
  if (type === "audio" && !matched) {
    return (
      <span className="inline-flex items-center justify-center gap-2 py-1 text-accent">
        <IconSound width={22} height={22} />
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">ouvir</span>
      </span>
    );
  }
  return renderTypedValue(value, type);
}

function PairExercise({ step, onDone, onSkip, onMistake, toneMode = false }: StepProps & { toneMode?: boolean }) {
  const soundEffects = useStore((s) => s.soundEffects);
  const pairs = useMemo(
    () => (step.pairs ?? []).map((pair, index) => ({ ...pair, id: String(index) })),
    [step.pairs]
  );
  const rightItems = useMemo(() => shuffle(pairs.map((pair) => ({
    id: pair.id,
    value: pair.right,
    type: pair.rightType,
  }))), [pairs]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, boolean>>({});
  const [wrongPair, setWrongPair] = useState<{ leftId: string; rightId: string } | null>(null);
  const [hintPairId, setHintPairId] = useState<string | null>(null);
  const [errors, setErrors] = useState(0);
  const completedRef = useRef(false);
  const complete = pairs.length > 0 && pairs.every((pair) => matches[pair.id]);
  const mistakesAllowed = Math.max(1, Math.floor(pairs.length / 2));

  function pickLeft(id: string) {
    if (matches[id] || complete) return;
    const pair = pairs.find((item) => item.id === id);
    if (pair) speakExercisePiece(pair.left, pair.leftType, toneMode ? 0.74 : 0.86);
    playSoundFx("pieceSelect", soundEffects);
    setSelectedLeft(id);
    setWrongPair(null);
  }

  function pickRight(id: string) {
    const item = rightItems.find((candidate) => candidate.id === id);
    if (item) speakExercisePiece(item.value, item.type, toneMode ? 0.74 : 0.86);
    playSoundFx("pieceSelect", soundEffects);
    if (!selectedLeft || complete || matches[id]) return;
    if (id === selectedLeft) {
      setMatches((current) => ({ ...current, [id]: true }));
      setSelectedLeft(null);
      setWrongPair(null);
      playSoundFx("success", soundEffects);
      return;
    }
    const nextErrors = errors + 1;
    const expectedPair = pairs.find((pair) => pair.id === selectedLeft);
    setErrors(nextErrors);
    setWrongPair({ leftId: selectedLeft, rightId: id });
    if (expectedPair) {
      onMistake?.(item?.value, {
        kind: "pair-match",
        pairIndex: Number(expectedPair.id),
        left: expectedPair.left,
        expectedRight: expectedPair.right,
        userAnswer: item?.value ?? "",
        leftType: expectedPair.leftType,
        rightType: expectedPair.rightType,
        selectedRightType: item?.type,
        reviewType: expectedPair.reviewType,
        reviewItemId: expectedPair.reviewItemId,
      });
    }
    if (nextErrors >= 2) setHintPairId(selectedLeft);
    playSoundFx("error", soundEffects);
    window.setTimeout(() => setWrongPair(null), 620);
  }

  useEffect(() => {
    if (!complete || completedRef.current) return;
    completedRef.current = true;
    const passed = errors === 0;
    const timer = window.setTimeout(() => onDone(passed), 520);
    return () => window.clearTimeout(timer);
  }, [complete, errors, onDone]);

  useExerciseHotkeys({
    enabled: !complete,
    mode: "pairs",
    leftCount: pairs.length,
    rightCount: rightItems.length,
    onSelectLeft: (index) => {
      const pair = pairs[index];
      if (pair) pickLeft(pair.id);
    },
    onSelectRight: (index) => {
      const item = rightItems[index];
      if (item) pickRight(item.id);
    },
  });

  const hintPair = hintPairId ? pairs.find((pair) => pair.id === hintPairId && !matches[pair.id]) : undefined;
  const matchedCount = Object.keys(matches).length;
  const title = toneMode ? "Tons em pares" : step.title ?? "Combine pares";
  const instruction = toneMode
    ? "Combine o hànzì com o tom e o pinyin corretos."
    : step.prompt ?? step.body ?? "Ligue cada item ao par correto.";

  return (
    <div>
      <div className="min-w-0">
        <Eyebrow>{toneMode ? "Tons" : "Pares"}</Eyebrow>
        <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl leading-tight text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-ink-soft">{instruction}</p>
      </div>

      <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-hidden text-xs font-semibold text-ink-faint">
        <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1">
          {matchedCount}/{pairs.length} pares
        </span>
        <span className={["shrink-0 rounded-full px-3 py-1", errors > mistakesAllowed ? "bg-wrong-soft text-wrong" : "bg-surface-2"].join(" ")}>
          {errors} {errors === 1 ? "erro" : "erros"}
        </span>
      </div>
      <KeyboardShortcutHint pairs />

      {/* Empilhado em telas muito estreitas; colunas lado a lado a partir de 480px. */}
      <div className="mt-3.5 grid grid-cols-1 gap-2 min-[480px]:grid-cols-[1fr_auto_1fr] sm:gap-3">
        <div className="grid gap-2">
          {pairs.map((pair, index) => {
            const matched = matches[pair.id];
            const wrong = wrongPair?.leftId === pair.id;
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => pickLeft(pair.id)}
                disabled={Boolean(matched) || complete}
                aria-label={pair.leftType === "audio" && !matched ? "Tocar áudio e combinar" : undefined}
                className={[
                  "relative flex items-center justify-center",
                  engineTileClass({
                    active: selectedLeft === pair.id,
                    matched,
                    wrong,
                    cjk:
                      (pair.leftType === "audio" && Boolean(matched)) ||
                      ((pair.leftType === "hanzi" || isCjkText(pair.left)) && !isLongMixedText(pair.left)),
                  }),
                ].join(" ")}
              >
                <ShortcutBadge className="shrink-0">{leftPairShortcut(index)}</ShortcutBadge>
                <span className="px-3">{renderPairSide(pair.left, pair.leftType, Boolean(matched))}</span>
                {matched && <IconCheck className="absolute right-2 top-2 text-[rgb(var(--good))]" width={16} height={16} />}
              </button>
            );
          })}
        </div>
        <div className="hidden flex-col items-center justify-center gap-2 text-ink-faint min-[480px]:flex">
          {pairs.map((pair) => (
            <div
              key={pair.id}
              className={[
                "h-8 w-px rounded-full",
                matches[pair.id] ? "bg-[rgb(var(--good))]" : "bg-line",
              ].join(" ")}
            />
          ))}
        </div>
        <div className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint min-[480px]:hidden">
          escolha o par
        </div>
        <div className="grid gap-2">
          {rightItems.map((item, index) => {
            const matched = matches[item.id];
            const wrong = wrongPair?.rightId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickRight(item.id)}
                disabled={Boolean(matched) || complete}
                aria-label={item.type === "audio" && !matched ? "Tocar áudio e combinar" : undefined}
                className={[
                  "relative flex items-center justify-center",
                  engineTileClass({
                    matched,
                    wrong,
                    cjk:
                      (item.type === "audio" && Boolean(matched)) ||
                      ((item.type === "hanzi" || isCjkText(item.value)) && !isLongMixedText(item.value)),
                  }),
                ].join(" ")}
              >
                <ShortcutBadge className="shrink-0">{rightPairShortcut(index)}</ShortcutBadge>
                <span className="px-3">{renderPairSide(item.value, item.type, Boolean(matched))}</span>
                {matched && <IconCheck className="absolute right-2 top-2 text-[rgb(var(--good))]" width={16} height={16} />}
              </button>
            );
          })}
        </div>
      </div>

      {wrongPair && (
        <p className="mt-3 rounded-xl border border-accent-soft bg-accent-soft/45 px-3 py-2 text-center text-sm font-medium text-accent">
          Ainda não. Tente outro par.
        </p>
      )}

      {hintPair && (
        <p className="mt-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-center text-sm text-ink-soft">
          Dica: <span className="font-semibold text-ink">{hintPair.left}</span> combina com{" "}
          <span className="font-semibold text-ink">{hintPair.right}</span>.
        </p>
      )}

      {!complete && <SkipStepButton onSkip={onSkip} />}

      {complete && (
        <div
          className={[
            "animate-pop mt-4 rounded-2xl p-3.5 text-center text-sm font-semibold",
            errors === 0
              ? "longyu-success-bloom bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
              : "bg-accent-soft text-accent",
          ].join(" ")}
        >
          <div className="flex items-center justify-center gap-2">
            {errors === 0 ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
            {errors === 0 ? "Pares completos" : "Pares completos, mas vamos revisar esse ponto"}
          </div>
        </div>
      )}
    </div>
  );
}

function StepMatchPairs(props: StepProps) {
  return <PairExercise {...props} />;
}

function StepTonePair(props: StepProps) {
  return <PairExercise {...props} toneMode />;
}

export function StepListenSelectLegacy({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const options = useMemo(() => shuffle([...(step.options ?? []), ...(step.distractors ?? [])]), [step.options, step.distractors]);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const answer = step.correctAnswer ?? step.answer ?? step.audioText ?? "";

  function check() {
    if (!picked) return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
    } else {
      setHadMistake(true);
      setFeedback("wrong");
      onMistake?.(picked);
    }
  }

  function retry() {
    setPicked(null);
    setFeedback(null);
  }

  return (
    <div>
      <Eyebrow>Escuta ativa</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{step.prompt ?? "Ouça e escolha a resposta certa."}</p>

      <div className="mt-5 grid gap-3 rounded-3xl bg-surface-2 p-4 text-center">
        <button
          type="button"
          onClick={() => speak(step.audioText ?? answer, { rate: 0.88 })}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent shadow-sm transition hover:scale-105 active:scale-95"
          aria-label="Ouvir"
        >
          <IconSound width={30} height={30} />
        </button>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="soft" onClick={() => speak(step.audioText ?? answer, { rate: 0.88 })}>
            Ouvir normal
          </Button>
          <Button variant="outline" onClick={() => speak(step.slowAudioText ?? step.audioText ?? answer, { rate: 0.68 })}>
            Ouvir devagar
          </Button>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2">
        {options.map((option, index) => {
          const active = picked === option;
          const correct = feedback && normalizeEngineAnswer(option) === normalizeEngineAnswer(answer);
          const wrong = feedback === "wrong" && active;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={feedback === "correct"}
              onClick={() => {
                playSoundFx("pieceSelect", soundEffects);
                setPicked(option);
                setFeedback(null);
              }}
              className={engineTileClass({ active, matched: Boolean(correct), wrong, cjk: isCjkText(option) })}
            >
              {renderTypedValue(option, isCjkText(option) ? "hanzi" : "pt")}
            </button>
          );
        })}
      </div>

      <EngineActions canCheck={Boolean(picked) && feedback !== "correct"} onCheck={check} onSkip={onSkip} />
      <EngineFeedbackPanel
        status={feedback}
        model={answer}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={retry}
        onContinue={() => onDone(!hadMistake)}
      />
    </div>
  );
}

function StepListenSelect({ step, onDone, onSkip, onMistake }: StepProps) {
  const options = useMemo(() => shuffle([...(step.options ?? []), ...(step.distractors ?? [])]), [step.options, step.distractors]);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [audioFallback, setAudioFallback] = useState(false);
  const finishTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const ttsRate = useStore((s) => s.ttsRate);
  const soundEffects = useStore((s) => s.soundEffects);
  const answer = step.correctAnswer ?? step.answer ?? step.audioText ?? "";
  const audioText = step.audioText ?? answer;
  const slowAudioText = step.slowAudioText ?? audioText;
  // Versão visual da pergunta (sem áudio): pinyin derivado do estímulo,
  // caractere a caractere — suficiente para responder de olho.
  const fallbackPinyin = useMemo(
    () =>
      [...audioText]
        .map((ch) => (isCjkText(ch) ? glossFor(ch)?.pinyin ?? "?" : ch))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    [audioText]
  );

  function playNormal() {
    speak(audioText);
  }

  function playSlow() {
    speak(slowAudioText, { rate: Math.min(ttsRate, 0.65) });
  }

  function finish(correct: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone(correct);
  }

  function check() {
    if (!picked || feedback) return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      // No modo visual o acerto vale, mas a parte de escuta vai para revisão.
      finishTimerRef.current = window.setTimeout(() => finish(!audioFallback), 520);
      return;
    }
    setFeedback("wrong");
    onMistake?.(picked);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  function retry() {
    setPicked(null);
    setFeedback(null);
  }

  // Toca o áudio automaticamente uma vez ao abrir o exercício.
  useEffect(() => {
    if (!audioText || audioFallback) return;
    return scheduleAutoSpeak(audioText, { rate: ttsRate, delayMs: 320 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioText, audioFallback]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current != null) window.clearTimeout(finishTimerRef.current);
    };
  }, []);

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      if (feedback || !options[index]) return;
      playSoundFx("pieceSelect", soundEffects);
      setPicked(options[index]);
      setFeedback(null);
    },
    onSubmit: check,
    onContinue: () => finish(!audioFallback),
  });

  return (
    <div>
      <Eyebrow>{audioFallback ? "Escuta · modo visual" : "Escuta ativa"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {audioFallback ? "Leia e escolha" : step.title ?? "Toque no que escutar"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {audioFallback
          ? "Sem áudio agora, tudo bem: responda pela leitura do pinyin. Esta parte de escuta volta depois na revisão."
          : step.prompt ?? "Toque no que escutar:"}
      </p>

      {audioFallback ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Você ouviria
          </div>
          <Pinyin text={fallbackPinyin} className="mt-2 block font-serif text-2xl" />
        </div>
      ) : (
        <div className="mt-3 grid gap-2.5 rounded-2xl border border-line bg-surface-2 p-3 text-center">
          <button
            type="button"
            onClick={playNormal}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lift ring-4 ring-accent-soft transition hover:scale-105 active:scale-95"
            aria-label="Ouvir áudio normal"
          >
            <IconSound width={34} height={34} />
          </button>
          <div>
            <Button variant="outline" size="sm" onClick={playSlow}>
              <IconSound width={16} height={16} />
              Áudio lento
            </Button>
          </div>
        </div>
      )}

      <KeyboardShortcutHint />
      <div className="mt-3.5 grid gap-2">
        {options.map((option, index) => {
          const active = picked === option;
          const correct = feedback && normalizeEngineAnswer(option) === normalizeEngineAnswer(answer);
          const wrong = feedback === "wrong" && active;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => {
                setPicked(option);
                setFeedback(null);
              }}
              className={[
                "relative flex items-center justify-center",
                engineTileClass({ active, matched: Boolean(correct), wrong, cjk: isCjkText(option) }),
              ].join(" ")}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="px-3">{renderTypedValue(option, isCjkText(option) ? "hanzi" : "pt")}</span>
              {correct && <IconCheck className="absolute right-2 top-2 text-[rgb(var(--good))]" width={16} height={16} />}
              {wrong && <IconX className="absolute right-2 top-2 text-wrong" width={16} height={16} />}
            </button>
          );
        })}
      </div>

      {feedback === "correct" && (
        <div className="animate-pop longyu-success-bloom mt-4 rounded-2xl bg-[rgb(var(--good)/0.12)] p-4 text-center text-sm font-semibold text-[rgb(var(--good))]">
          <div className="flex items-center justify-center gap-2">
            <IconCheck width={18} height={18} />
            {audioFallback ? "Boa! Esta escuta volta na revisão." : "Boa, foi esse som."}
          </div>
        </div>
      )}

      {feedback === "wrong" && !onMistake && (
        <div className="animate-pop mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <IconX width={18} height={18} />
            Quase
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {audioFallback
              ? "A resposta certa está abaixo. Compare com o pinyin e tente mais uma vez."
              : "A resposta certa está abaixo. Ouça de novo e tente mais uma vez."}
          </p>
          <div className={["mt-2 rounded-xl bg-surface/75 px-3 py-3 text-center font-semibold text-ink", isCjkText(answer) ? "hanzi text-3xl" : "text-base"].join(" ")}>
            <ExerciseText value={answer} type={isCjkText(answer) ? "hanzi" : "pt"} speakOnClick />
          </div>
          {step.explanation && <p className="mt-3 text-sm leading-6 text-ink-soft">{step.explanation}</p>}
          <Button className="mt-4 w-full shadow-lift" variant="good" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}

      {!feedback && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 grid gap-2 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg)/0.96)] to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-5 sm:static sm:mx-0 sm:grid-cols-[1fr_1fr_1.25fr] sm:bg-none sm:px-0 sm:pb-0">
          {!audioFallback ? (
            <Button
              variant="outline"
              onClick={() => {
                setAudioFallback(true);
                setPicked(null);
                setFeedback(null);
              }}
            >
              Não posso ouvir agora
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setAudioFallback(false)}>
              Voltar ao áudio
            </Button>
          )}
          {onSkip && (
            <Button variant="outline" onClick={onSkip}>
              Pular
            </Button>
          )}
          <Button
            variant={picked ? "good" : "outline"}
            className="shadow-lift"
            disabled={!picked}
            onClick={check}
          >
            Verificar
          </Button>
        </div>
      )}
    </div>
  );
}

function BuildExercise({ step, onDone, onSkip, onMistake, kindLabel }: StepProps & { kindLabel: string }) {
  const soundEffects = useStore((s) => s.soundEffects);
  const help = useMandarinHelpSettings();
  const helpDisabled = help.disabled || help.helpMode === "disabled";
  const isTranslationBuild = step.kind === "translation_build";
  const pieceJoiner = isTranslationBuild ? " " : "";
  const targetParts = step.targetParts ?? [];
  const bankTokens = useMemo(() => buildPieceTokens(step, targetParts), [step, targetParts]);
  const fallbackAnswer = targetParts.join(pieceJoiner);
  const answer = step.correctAnswer ?? step.answer ?? fallbackAnswer;
  const compareAnswer = step.kind === "hanzi_build" ? targetParts.join("") : answer;
  const promptText = step.prompt ?? (isTranslationBuild ? undefined : step.sourceText);
  const successMessage =
    step.kind === "hanzi_build" ? "Boa! Hànzì montado." : "Boa! Frase montada.";
  const [picked, setPicked] = useState<BuildPieceToken[]>([]);
  const [feedback, setFeedback] = useState<EngineFeedback | "incomplete">(null);
  const [hadMistake, setHadMistake] = useState(false);
  const requiredCount = targetParts.length;
  // Verificar habilita com pelo menos uma peça; montagem incompleta recebe
  // aviso gentil ("a ordem ainda não fechou"), não conta como erro.
  const canCheck = picked.length > 0 && feedback !== "correct";
  const built = picked.map((item) => item.value).join(pieceJoiner);
  const usedIds = new Set(picked.map((item) => item.id));
  const correctParts = targetParts.length > 0 ? targetParts : [answer];
  const locked = feedback === "correct" || feedback === "wrong";
  // Variantes pedagogicamente válidas (ex.: "这是咖啡" e "这 是 咖啡")
  // entram por step.accepts; a comparação é sempre normalizada.
  const acceptedAnswers = useMemo(
    () => uniqueStrings([compareAnswer, ...(step.accepts ?? [])]),
    [compareAnswer, step.accepts]
  );

  useExerciseHotkeys({
    enabled: true,
    mode: "builder",
    optionCount: bankTokens.length,
    isAnswered: feedback === "correct",
    hasSelection: picked.length > 0,
    onSelectOption: (index) => {
      const token = bankTokens[index];
      if (token) addPiece(token);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  function isBuiltCorrect(candidate: string): boolean {
    const normalized = normalizeEngineAnswer(candidate);
    return acceptedAnswers.some((accepted) => normalized === normalizeEngineAnswer(accepted));
  }

  function addPiece(token: BuildPieceToken) {
    if (locked || usedIds.has(token.id)) return;
    speakExercisePiece(token.value);
    playSoundFx("pieceSelect", soundEffects);
    setPicked((current) => [...current, token]);
    setFeedback(null);
  }

  function removePiece(index: number) {
    if (locked) return;
    speakExercisePiece(picked[index]?.value);
    playSoundFx("tap", soundEffects);
    setPicked((current) => current.filter((_, i) => i !== index));
    setFeedback(null);
  }

  function clearPieces() {
    if (feedback === "correct" || picked.length === 0) return;
    setPicked([]);
    setFeedback(null);
  }

  function check() {
    if (!canCheck) return;
    if (isBuiltCorrect(built)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    if (picked.length < requiredCount) {
      // Faltam peças: nudge sem punição — não desconta fôlego nem marca erro.
      setFeedback("incomplete");
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(built);
  }

  function retry() {
    setPicked([]);
    setFeedback(null);
  }

  return (
    <div>
      <Eyebrow>{kindLabel}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      {promptText && <p className="mt-2 text-sm leading-6 text-ink-soft">{promptText}</p>}
      {(step.sourceText || (!helpDisabled && (step.sourcePinyin || step.sourceMeaning))) && (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-center">
          {step.sourceText && (
            <div className={isCjkText(step.sourceText) ? "text-3xl text-ink" : "text-base font-semibold text-ink"}>
              <ExerciseText value={step.sourceText} type={isCjkText(step.sourceText) ? "hanzi" : "pt"} speakOnClick />
            </div>
          )}
          {!helpDisabled && step.sourcePinyin && <Pinyin text={step.sourcePinyin} className="mt-1 font-serif text-lg" />}
          {!helpDisabled && step.sourceMeaning && <div className="mt-1 text-sm text-ink-soft">{step.sourceMeaning}</div>}
        </div>
      )}

      <div className="my-6 flex min-h-[92px] flex-wrap items-center justify-center gap-2 rounded-[24px] border border-dashed border-accent-soft bg-surface-2/80 p-4 shadow-inner">
        {picked.length === 0 && <span className="w-full text-center text-sm font-medium text-ink-faint">toque nas peças para montar</span>}
        {picked.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => removePiece(index)}
            disabled={locked}
            className={[engineTileClass({ cjk: isCjkText(item.value), active: true }), "group relative min-w-[4rem] overflow-visible"].join(" ")}
          >
            <ExerciseText value={item.value} type={isCjkText(item.value) ? "hanzi" : "pt"} speakOnClick />
          </button>
        ))}
        {/* Linhas vazias mostram quantas peças ainda faltam para o alvo. */}
        {picked.length > 0 &&
          Array.from({ length: Math.max(0, requiredCount - picked.length) }).map((_, index) => (
            <span
              key={`slot-${index}`}
              aria-hidden
              className="flex h-14 min-w-[3.5rem] items-end justify-center rounded-[14px] border border-dashed border-line/80 pb-2"
            >
              <span className="h-0.5 w-7 rounded-full bg-line" />
            </span>
          ))}
      </div>

      <KeyboardShortcutHint />
      <div className="flex flex-wrap justify-center gap-2.5">
        {bankTokens.map((token, index) => {
          const used = usedIds.has(token.id);
          return (
            <button
              key={token.id}
              type="button"
              onClick={() => addPiece(token)}
              disabled={used || locked}
              className={[
                engineTileClass({ cjk: isCjkText(token.value) }),
                "group relative overflow-visible",
                used ? "bg-surface-2 text-ink-faint opacity-[0.35] grayscale" : "",
              ].join(" ")}
              aria-label={index < 10 ? `Peça ${shortcutKeyForIndex(index)}: ${token.value}` : token.value}
            >
              {index < 10 && <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>}
              <ExerciseText value={token.value} type={isCjkText(token.value) ? "hanzi" : "pt"} speakOnClick />
            </button>
          );
        })}
      </div>

      {feedback === "incomplete" && (
        <p className="animate-pop mt-4 rounded-xl border border-accent-soft bg-accent-soft/45 px-3 py-2 text-center text-sm font-medium text-accent">
          A ordem ainda não fechou — ainda faltam peças. Continue montando.
        </p>
      )}

      {feedback === "correct" && (
        <div className="animate-pop longyu-success-bloom mt-4 rounded-2xl border border-transparent bg-[rgb(var(--good)/0.12)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--good))]">
            <IconCheck width={18} height={18} />
            {successMessage}
            </div>
            <span className="rounded-full bg-[#B7791F]/10 px-2.5 py-1 text-xs font-semibold text-gold">+Qi</span>
          </div>
          {step.explanation && (
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              <ExerciseText value={step.explanation} speakOnClick />
            </p>
          )}
          <Button variant="good" className="mt-4 w-full shadow-lift" onClick={() => onDone(!hadMistake)}>
            Continuar <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}

      {feedback === "wrong" && !onMistake && (
        <div className="animate-pop mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <IconX width={18} height={18} />
            A ordem ainda não fechou.
          </div>
          <div className="mt-3 rounded-xl bg-surface/75 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Ordem correta
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {correctParts.map((piece, index) => (
                <span
                  key={`${piece}-${index}`}
                  className={[
                    "rounded-xl border border-line bg-surface px-3 py-2 font-semibold text-ink",
                    isCjkText(piece) ? "hanzi text-2xl" : "text-sm",
                  ].join(" ")}
                >
                  <ExerciseText value={piece} type={isCjkText(piece) ? "hanzi" : "pt"} speakOnClick />
                </span>
              ))}
            </div>
          </div>
          {step.explanation && (
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              <ExerciseText value={step.explanation} speakOnClick />
            </p>
          )}
          <Button className="mt-4 w-full shadow-lift" variant="good" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}

      {(!feedback || feedback === "incomplete") && (
        <EngineActions
          canCheck={canCheck}
          onCheck={check}
          onSkip={onSkip}
          onClear={clearPieces}
          canClear={picked.length > 0}
        />
      )}
    </div>
  );
}

function StepSentenceBuild(props: StepProps) {
  return <BuildExercise {...props} kindLabel="Monte a frase" />;
}

function StepTranslationBuild(props: StepProps) {
  return <BuildExercise {...props} kindLabel="Traduza com peças" />;
}

function StepHanziBuild(props: StepProps) {
  // Novo formato: carta visual de montagem (fragments/components/complete).
  const builder = getHanziBuilder(props.step.builderId);
  if (builder) {
    return (
      <HanziBuilderExercise
        builder={builder}
        externalRetry={Boolean(props.onMistake)}
        onWrong={props.onMistake}
        onCorrect={(firstTry) => props.onDone(firstTry)}
      />
    );
  }
  // Formato legado: montagem por peças de texto.
  return <BuildExercise {...props} kindLabel="Construa o hànzì" />;
}

function StepFillBlank({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const answer = step.blankAnswer ?? step.correctAnswer ?? "";
  const model = step.correctAnswer ?? `${step.sentenceBefore ?? ""}${answer}${step.sentenceAfter ?? ""}`;
  const bank = step.bank ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);

  function pickPiece(piece: string) {
    if (feedback === "correct") return;
    speakExercisePiece(piece);
    playSoundFx("pieceSelect", soundEffects);
    setPicked(piece);
    setFeedback(null);
  }

  function check() {
    if (!picked) return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
    } else {
      setHadMistake(true);
      setFeedback("wrong");
      onMistake?.(picked);
      if (!onMistake) playSoundFx("error", soundEffects);
    }
  }

  function retry() {
    setPicked(null);
    setFeedback(null);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: bank.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      const piece = bank[index];
      if (piece) pickPiece(piece);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>Complete a lacuna</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      {step.prompt && <p className="mt-2 text-sm leading-6 text-ink-soft">{step.prompt}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 p-4">
        {step.sentenceBefore && (
          <span className="hanzi text-3xl text-ink">
            <ExerciseText value={step.sentenceBefore} type="hanzi" speakOnClick />
          </span>
        )}
        <span
          className={[
            "flex min-h-14 min-w-20 items-center justify-center rounded-2xl border-2 border-dashed px-4 font-semibold",
            picked ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-faint",
            picked && isCjkText(picked) ? "hanzi text-3xl" : "text-sm",
          ].join(" ")}
        >
          {picked ? <ExerciseText value={picked} type={isCjkText(picked) ? "hanzi" : "pt"} speakOnClick /> : "lacuna"}
        </span>
        {step.sentenceAfter && (
          <span className="hanzi text-3xl text-ink">
            <ExerciseText value={step.sentenceAfter} type="hanzi" speakOnClick />
          </span>
        )}
      </div>

      <KeyboardShortcutHint />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {bank.map((piece, index) => (
          <button
            key={`${piece}-${index}`}
            type="button"
            onClick={() => pickPiece(piece)}
            disabled={feedback === "correct"}
            className={[engineTileClass({ active: picked === piece, cjk: isCjkText(piece) }), "relative"].join(" ")}
            aria-label={`Opção ${shortcutKeyForIndex(index)}: ${piece}`}
          >
            <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
            <ExerciseText value={piece} type={isCjkText(piece) ? "hanzi" : "pt"} speakOnClick />
          </button>
        ))}
      </div>

      <EngineActions canCheck={Boolean(picked) && feedback !== "correct"} onCheck={check} onSkip={onSkip} />
      <EngineFeedbackPanel
        status={feedback}
        model={model}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={retry}
        onContinue={() => onDone(!hadMistake)}
      />
    </div>
  );
}

function StepDialogueChoice({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const options = useMemo(() => shuffle(step.options ?? []), [step.options]);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const answer = step.correctAnswer ?? step.answer ?? "";
  const dialoguePrompt = step.dialoguePrompt ?? step.prompt ?? "";
  const promptTestsPinyinOrTone = hintWouldRevealAnswer(step);
  const autoSpeakPrompt = autoSpeakTextForDialoguePrompt(step, dialoguePrompt);
  useAutoSpeak(autoSpeakPrompt, Boolean(autoSpeakPrompt), { rate: 0.86 });

  function pickOption(option: string) {
    if (feedback === "correct") return;
    speakExercisePiece(option);
    playSoundFx("pieceSelect", soundEffects);
    setPicked(option);
    setFeedback(null);
  }

  function check() {
    if (!picked) return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
    } else {
      setHadMistake(true);
      setFeedback("wrong");
      onMistake?.(picked);
      if (!onMistake) playSoundFx("error", soundEffects);
    }
  }

  function retry() {
    setPicked(null);
    setFeedback(null);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      const option = options[index];
      if (option) pickOption(option);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>Escolha no diálogo</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>

      <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3.5">
        {step.speaker && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{step.speaker}</div>
        )}
        <p className="text-base font-medium leading-7 text-ink">
          <ExerciseText
            value={dialoguePrompt}
            type={isCjkText(dialoguePrompt) ? "hanzi" : "pt"}
            speakOnClick={!promptTestsPinyinOrTone}
            disabled={promptTestsPinyinOrTone}
          />
        </p>
      </div>

      <KeyboardShortcutHint />
      <div className="mt-3.5 grid gap-2">
        {options.map((option, index) => {
          const active = picked === option;
          const correct = feedback && normalizeEngineAnswer(option) === normalizeEngineAnswer(answer);
          const wrong = feedback === "wrong" && active;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={feedback === "correct"}
              onClick={() => pickOption(option)}
              className={[engineTileClass({ active, matched: Boolean(correct), wrong, cjk: isCjkText(option) }), "relative flex items-center gap-2.5"].join(" ")}
              aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="min-w-0 flex-1">
                <ExerciseText value={option} type={isCjkText(option) ? "hanzi" : "pt"} speakOnClick />
              </span>
            </button>
          );
        })}
      </div>

      <EngineActions canCheck={Boolean(picked) && feedback !== "correct"} onCheck={check} onSkip={onSkip} />
      <EngineFeedbackPanel
        status={feedback}
        model={answer}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={retry}
        onContinue={() => onDone(!hadMistake)}
      />
    </div>
  );
}

function StepRecognize({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const char = charById[step.charId!];
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const options = useMemo(() => {
    const distractors = shuffle(CHARACTERS.filter((c) => c.id !== char.id)).slice(0, 3);
    return shuffle([char, ...distractors].map((c) => c.meaningPt));
  }, [char]);

  function selectOption(option: string) {
    if (answered) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelected(option);
  }

  function answerOption(option: string) {
    if (answered) return;
    playSoundFx(option === char.meaningPt ? "success" : "pieceSelect", soundEffects);
    setSelected(option);
    setAnswered(option);
    if (option !== char.meaningPt) onMistake?.(option);
  }

  function submitSelected() {
    if (!selected || answered) return;
    answerOption(selected);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: answered != null && (answered === char.meaningPt || !onMistake),
    hasSelection: Boolean(selected),
    onSelectOption: (index) => {
      const option = options[index];
      if (option) selectOption(option);
    },
    onSubmit: submitSelected,
    onContinue: () => {
      if (answered) onDone(answered === char.meaningPt);
    },
  });

  return (
    <div className="text-center">
      <Eyebrow>O que significa?</Eyebrow>
      <div className="my-4">
        <MandarinText
          hanzi={char.hanzi}
          pinyin={char.pinyin}
          size="lg"
          audio
          displayMode="hanzi_only"
          align="center"
        />
      </div>
      <KeyboardShortcutHint />
      <div className="grid gap-2 text-left">
        {options.map((o, index) => {
          const state = answered == null ? (o === selected ? "selected" : "idle") : o === char.meaningPt ? "right" : o === answered ? "wrong" : "idle";
          return (
            <button
              key={o}
              disabled={answered != null}
              onClick={() => answerOption(o)}
              aria-label={`Opção ${shortcutKeyForIndex(index)}: ${o}`}
              className={[
                "relative flex min-h-12 items-center gap-2.5 rounded-xl border px-4 py-2.5 transition",
                state === "idle" && "border-line hover:bg-surface-2",
                state === "selected" && "border-accent bg-accent-soft text-accent",
                state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
                state === "wrong" && "border-transparent bg-wrong-soft",
              ].filter(Boolean).join(" ")}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="min-w-0 flex-1">{o}</span>
              {state === "right" && <IconCheck className="text-[rgb(var(--good))]" />}
              {state === "wrong" && <IconX className="text-wrong" />}
            </button>
          );
        })}
      </div>
      {answered == null && <SkipStepButton onSkip={onSkip} />}
      {answered != null && (answered === char.meaningPt || !onMistake) && (
        <AnswerFeedback
          correct={answered === char.meaningPt}
          hanzi={char.hanzi}
          pinyin={char.pinyin}
          meaning={char.meaningPt}
          hint={char.mnemonicPt}
          onContinue={() => onDone(answered === char.meaningPt)}
        />
      )}
    </div>
  );
}

function StepDecompose({ step, onDone }: StepProps) {
  const char = charById[step.charId!];
  return (
    <div>
      <Eyebrow>Desmonte</Eyebrow>
      <div className="my-4 flex justify-center rounded-2xl bg-surface-2 p-6">
        <DecompositionCard char={char} />
      </div>
      <ContinueBtn onClick={() => onDone()} />
    </div>
  );
}

// "O que é hànzì?": um exemplo por vez (木 → 日 → 月 → 人), em vez de empilhar
// todos os cartões numa lista gigante. Cada slide mostra caractere grande, som,
// ideia curta e 2–3 peças; ao avançar, o caractere entra na revisão.
function StepHanziEvolution({ step, onDone }: StepProps) {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const [index, setIndex] = useState(0);
  const models = (step.charIds ?? [])
    .map((charId) => HANZI_EVOLUTIONS[charId])
    .filter((model): model is NonNullable<typeof model> => Boolean(model));

  if (models.length === 0) {
    return (
      <div>
        <Eyebrow>Entenda hànzì</Eyebrow>
        <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title ?? "O que é hànzì?"}</h2>
        <ContinueBtn onClick={() => onDone()} />
      </div>
    );
  }

  const total = models.length;
  const safeIndex = Math.min(index, total - 1);
  const model = models[safeIndex];
  const isLast = safeIndex >= total - 1;
  const explanation = HANZI_CONCEPT_EXPLANATIONS[model.charId] ?? model.insight;

  function advance() {
    // Viu, ouviu e reconheceu a peça: entra na revisão espaçada antes de avançar.
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: "char",
      itemId: model.charId,
      track: "hanzi",
      domain: "forma",
      grade: "good",
    });
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  }

  return (
    <div>
      <Eyebrow>Entenda hànzì</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title ?? "O que é hànzì?"}</h2>
      {step.body && <p className="mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>}

      <HanziConceptSlide
        key={model.charId}
        model={model}
        explanation={explanation}
        index={safeIndex}
        total={total}
        onNext={advance}
        nextLabel={isLast ? "Praticar montando um hànzì" : "Próximo exemplo"}
      />
    </div>
  );
}

function StepFlashcard({ step, onDone }: StepProps) {
  const name = useStudentFirstName();
  const baseChunk = chunkById[step.chunkId!];
  const chunk = step.chunkId === "wojiao" && name
    ? {
        ...baseChunk,
        hanzi: `我叫 ${name}`,
        pinyin: `wǒ jiào ${name}`,
        meaningPt: `Meu nome é ${name}.`,
        literalPt: `eu chamo ${name}`,
      }
    : baseChunk;
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="text-center">
      <Eyebrow>Frase útil</Eyebrow>
      <div className="my-4 flex flex-col items-center gap-3">
        <MandarinText
          hanzi={chunk.hanzi}
          pinyin={chunk.pinyin}
          meaning={revealed ? chunk.meaningPt : undefined}
          size="lg"
          audio
          align="center"
        />
        {revealed ? (
          <div className="animate-pop">
            {chunk.literalPt && <div className="text-sm text-ink-faint">literal: {chunk.literalPt}</div>}
          </div>
        ) : (
          <Button variant="soft" onClick={() => setRevealed(true)}>Mostrar significado</Button>
        )}
      </div>
      {revealed && <ContinueBtn onClick={() => onDone()} />}
    </div>
  );
}

function StepMicroread({ step, onDone }: StepProps) {
  const lines = step.lines ?? [];
  return (
    <div>
      <Eyebrow>Leia</Eyebrow>
      <p className="mt-2 text-sm text-ink-soft">Leia cada linha no formato escolhido nas configurações.</p>
      <p className="-mt-1 mb-3 text-xs text-ink-faint">
        Passe o mouse (ou toque) num caractere para ver o significado.
      </p>
      <div className="my-4 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-4">
            <MandarinText
              hanzi={l.hanzi}
              pinyin={l.pinyin}
              meaning={l.pt}
              size="md"
              audio
              autoPlay={i === 0}
            />
          </div>
        ))}
      </div>
      <ContinueBtn onClick={() => onDone()} label="Concluir" />
    </div>
  );
}

// Fallback seguro: exercício quebrado nunca aparece — o aluno segue adiante
// sem punição e o problema fica registrado no console em dev.
function BrokenStepFallback({ onDone }: { onDone: (correct?: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center">
      <Eyebrow>Exercício pulado</Eyebrow>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Este passo não passou na validação de conteúdo e foi pulado para não travar sua lição.
        Nada foi descontado do seu progresso.
      </p>
      <ContinueBtn onClick={() => onDone()} />
      <div className="mt-3 flex justify-center">
        <FeedbackButton
          context={{
            screen: "exercício pulado no player",
            route: typeof window !== "undefined" ? window.location.pathname : "",
            activityProblem: true,
            exerciseKind: "broken_step",
          }}
          variant="ghost"
          size="sm"
          label="Reportar este exercício"
        />
      </div>
    </div>
  );
}

const PINYIN_TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu;

function optionHasToneMark(value: string | undefined): boolean {
  return PINYIN_TONE_MARK_RE.test(value ?? "");
}

// Pergunta avaliada em que a própria dica entregaria a resposta: identificar o
// pinyin ou o tom de um hànzì exibido no enunciado. Nesses casos a ajuda de
// leitura é desligada para não revelar o alvo — passar o mouse no hànzì mostra
// apenas "Sem ajuda nesta pergunta." em vez do pinyin/significado.
function hintWouldRevealAnswer(step: LessonStep): boolean {
  if (step.kind !== "dialogue_choice" && step.kind !== "listen_select") return false;
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""} ${step.speaker ?? ""}`.toLocaleLowerCase(
    "pt-BR"
  );
  if (label.includes("pinyin") || label.includes("acento") || label.includes("tom")) return true;
  const options = [step.correctAnswer, step.answer, ...(step.options ?? [])];
  const optionsArePinyin = options.filter(optionHasToneMark).length >= 2;
  if (!optionsArePinyin) return false;
  return label.includes("qual") || label.includes("escolha") || label.includes("combine");
}

function hasInstructionalLatin(text: string): boolean {
  return /[A-Za-zÀ-ÿ]{2,}/.test(text);
}

/** Só falas reais em mandarim entram no autoplay — enunciados em PT ficam mudos. */
export function autoSpeakTextForDialoguePrompt(step: LessonStep, dialoguePrompt: string): string | undefined {
  if (hintWouldRevealAnswer(step)) return undefined;
  const text = dialoguePrompt.trim();
  if (!text || !isCjkText(text)) return undefined;
  if (hasInstructionalLatin(text)) return undefined;
  return text;
}

export function StepRenderer({ step, onDone, onSkip, onMistake }: StepProps) {
  const name = useStudentFirstName();
  const personalizedStep = useMemo(() => personalizeStep(step, name), [step, name]);
  const validation = useMemo(() => validateExercise(personalizedStep), [personalizedStep]);
  const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  const [progressiveUnlocked, setProgressiveUnlocked] = useState(false);
  const stepHelpMode =
    personalizedStep.helpMode === "progressive" && progressiveUnlocked
      ? "sentence"
      : personalizedStep.helpMode ?? "sentence";
  const handleMistake = useCallback(
    (answer?: string, payload?: PairMistakePayload) => {
      if (personalizedStep.helpMode === "progressive") setProgressiveUnlocked(true);
      onMistake?.(answer, payload);
    },
    [onMistake, personalizedStep.helpMode]
  );

  useEffect(() => {
    setProgressiveUnlocked(false);
  }, [personalizedStep]);

  if (isDev && validation.warnings.length > 0) {
    console.warn(
      `[Longyu] Avisos no passo "${personalizedStep.title ?? personalizedStep.kind}": ${validation.warnings.join("; ")}`
    );
  }
  if (!validation.valid) {
    if (isDev) {
      console.warn(
        `[Longyu] Exercício inválido pulado (${personalizedStep.kind}): ${validation.errors.join("; ")}`,
        personalizedStep
      );
    }
    return <BrokenStepFallback onDone={onDone} />;
  }

  const rendered = (() => {
    switch (personalizedStep.kind) {
      case "intro": return <StepIntro step={personalizedStep} onDone={onDone} />;
      case "listen": return <StepListen step={personalizedStep} onDone={onDone} />;
      case "tone": return <StepTone step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "comprehend": return <StepComprehend step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "produce": return <StepProduce step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "write": return <StepWrite step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "recognize": return <StepRecognize step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "decompose": return <StepDecompose step={personalizedStep} onDone={onDone} />;
      case "hanzi_evolution": return <StepHanziEvolution step={personalizedStep} onDone={onDone} />;
      case "flashcard": return <StepFlashcard step={personalizedStep} onDone={onDone} />;
      case "microread": return <StepMicroread step={personalizedStep} onDone={onDone} />;
      case "match_pairs": return <StepMatchPairs step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "listen_select": return <StepListenSelect step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "sentence_build": return <StepSentenceBuild step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "translation_build": return <StepTranslationBuild step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "fill_blank": return <StepFillBlank step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "dialogue_choice": return <StepDialogueChoice step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "conversation_scene": return <ConversationSceneStep step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "hanzi_build": return <StepHanziBuild step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "tone_pair": return <StepTonePair step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "image_choice": return <StepImageChoice step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      default: return null;
    }
  })();

  return (
    <MandarinHelpProvider
      helpMode={stepHelpMode}
      disabled={
        personalizedStep.isNoHint ||
        personalizedStep.helpMode === "disabled" ||
        hintWouldRevealAnswer(personalizedStep)
      }
    >
      {rendered}
    </MandarinHelpProvider>
  );
}
