import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LessonStep, StepTextType } from "../../data/journey";
import type { ConversationNode } from "../../data/conversationScenes";
import { CHARACTERS, charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { diagnoseError, isUnexplainedProduction } from "../../data/errorDiagnosis";
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
import { seededShuffleAvoidingOrder } from "../../lib/seededShuffle";
import { useStore } from "../../lib/store";
import { Button, cx } from "../../components/ui/primitives";
import { ExerciseText, containsCjk } from "../../components/hanzi/ExerciseText";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { MandarinHelpProvider, useMandarinHelpSettings } from "../../components/hanzi/helpMode";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { DecompositionCard } from "../../components/hanzi/DecompositionCard";
import { HanziConceptSlide } from "../../components/hanzi/HanziConceptSlide";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";
import { getHanziBuilder } from "../../data/hanziBuilder";
import { type PatternSlot } from "../../data/productionTasks";
import { conceptForSlot, formatConceptLabel, resolveSlotLabel } from "../../data/structuralConcepts";
import {
  clampProductionHelpLevel,
  nextProductionHelpLevel,
  productionHelpLevelLabel,
  unlockProductionHelpAfterMistake,
  type ProductionHelpLevel,
} from "../../data/productionHelp";
import { trackPedagogyEvent } from "../../services/pedagogyEvents";
import {
  AssemblyHintBanner,
  PieceAssemblyBank,
  PieceAssemblyBoard,
  PieceAssemblyTray,
} from "./PieceAssembly";
import { buildAssemblyFeedback } from "./buildAssemblyFeedback";
import { IconCheck, IconX, IconChevron, IconSound, IconFlame } from "../../components/ui/Icon";
import { PronunciationPractice } from "./PronunciationPractice";
import { FeedbackButton } from "../../components/feedback/FeedbackButton";
import { validateExercise } from "./exerciseValidation";
import { REPAIR_STRATEGY_LABELS, type RepairStrategy } from "../../data/productionTasks";
import {
  ensureMicPermission,
  isRecognitionAvailable,
  isSecureMicContext,
  recognizeOnce,
  speechErrorMessage,
  type RecognizeHandle,
} from "../../lib/speech";
import { noteToneHintUse } from "../../lib/lessonSessionMetrics";
import { StepImageChoice } from "./StepImageChoice";
import { StepCompareWithImage } from "./StepCompareWithImage";
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
  /** Scaffolding progressivo usado na produção/transferência. */
  helpLevel?: number;
  helpRequests?: number;
  initialHelpLevel?: number;
}

export interface StepProps {
  step: LessonStep;
  onDone: (correct?: boolean, meta?: StepDoneMeta) => void;
  onSkip?: () => void;
  onMistake?: (answer?: string, payload?: PairMistakePayload) => void;
  /**
   * Produção: o aluno escreveu uma tentativa bem formada que o motor não sabe
   * julgar. Não é erro — não custa estrela, não entra no SRS nem no perfil de
   * fraqueza. Fica registrado para auditoria e para o corpus crescer.
   */
  onUnrecognized?: (answer: string) => void;
  /** Lição atual — resolve rótulos de estrutura (intuitivo → técnico). */
  lessonId?: string;
  /** Seed da tentativa (PED-015) — muda a ordem das peças sem reshuffle em rerender. */
  attemptSeed?: string;
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

/** CTA sticky na base da região da atividade (mobile + desktop).
 * O shell do LessonPlayer já acompanha `visualViewport` (teclado/barras);
 * aqui só preservamos safe-area — sem somar o inset do teclado de novo. */
function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const scroller = bar?.closest<HTMLElement>("[data-lesson-activity-scroll]");
    if (!bar || !scroller) return undefined;
    let frame = 0;

    const updateReservedSpace = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(bar.getBoundingClientRect().height);
        if (height > 0) scroller.style.setProperty("--lesson-sticky-actions-height", `${height}px`);
      });
    };

    updateReservedSpace();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateReservedSpace);
    observer?.observe(bar);
    window.visualViewport?.addEventListener("resize", updateReservedSpace);
    window.addEventListener("orientationchange", updateReservedSpace);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", updateReservedSpace);
      window.removeEventListener("orientationchange", updateReservedSpace);
      scroller.style.removeProperty("--lesson-sticky-actions-height");
    };
  }, []);

  return (
    <div
      ref={barRef}
      data-lesson-sticky-actions
      className={cx(
        "sticky bottom-0 z-20 -mx-4 mt-auto bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg)/0.96)] to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-5",
        className
      )}
    >
      {children}
    </div>
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
    <StickyActionBar>
      <Button className="w-full animate-pop shadow-lift" onClick={onClick}>
        {label}
        <IconChevron width={18} height={18} aria-hidden="true" />
      </Button>
    </StickyActionBar>
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
    // interações também precisam trocar "Matheus/Matheus" (e "Lin" legado) pelo nome.
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
    audioSequence: step.audioSequence?.map((audio) => personalizeValue(audio, name) ?? audio),
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
    acceptedTargetParts: step.acceptedTargetParts?.map((parts) =>
      parts.map((part) => personalizeValue(part, name) ?? part)
    ),
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
          displayMode={step.hanziMode === "pinyin_first" ? "pinyin_only" : undefined}
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
  const [hintLevel, setHintLevel] = useState(0);
  const [listenCount, setListenCount] = useState(0);
  const answer = step.tone as ToneN;
  const meaning = glossFor(step.hanzi!)?.pt;
  const basePinyin = pinyinWithoutToneMark(step.pinyin);
  const toneChoices = (step.toneChoices?.length
    ? step.toneChoices
    : ([1, 2, 3, 4] as ToneN[])
  ).filter((t, index, all): t is ToneN => all.indexOf(t) === index) as ToneN[];
  const contrastOnly = toneChoices.length <= 2;
  // PED-005: no guiado, significado fica escondido ate errar / pedir dica.
  const showMeaning = !guided || hintLevel >= 1 || picked != null;
  const showCurves = !guided || contrastOnly || hintLevel >= 1 || (picked != null && picked !== answer);

  function pick(t: ToneN) {
    if (picked) return;
    setSelectedTone(t);
    playSoundFx(t === answer ? "success" : "pieceSelect", soundEffects);
    setPicked(t);
    if (t !== answer) {
      onMistake?.(`${t} tom`);
      // Apos o primeiro erro: libera comparacao visual + ouvir de novo.
      setHintLevel((level) => Math.max(level, 1));
    }
  }

  function selectTone(t: ToneN) {
    if (picked) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelectedTone(t);
  }

  function play(rate = 0.85) {
    setListenCount((n) => n + 1);
    speak(step.hanzi!, { rate });
  }

  useEffect(() => {
    if (picked != null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [picked]);

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: toneChoices.length,
    isAnswered: picked != null && (picked === answer || !onMistake),
    hasSelection: selectedTone != null,
    onSelectOption: (index) => {
      const tone = toneChoices[index];
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
      <Eyebrow>{guided ? (contrastOnly ? "Dois tons" : "Ouvido tonal") : "Qual é o tom?"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">
        {contrastOnly ? "Ouça e escolha entre dois tons" : "Ouça e escolha o tom"}
      </h2>

      <div className="mx-auto my-3 grid max-w-md gap-3 sm:my-4 sm:max-w-xl sm:grid-cols-[112px_1fr] sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => play(0.85)}
            className="mx-auto flex h-14 w-14 flex-col items-center justify-center rounded-full bg-accent-soft text-accent shadow-sm ring-4 ring-accent-soft/40 transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
            aria-label="Ouvir"
          >
            <IconSound width={26} height={26} />
            <span className="mt-1 text-[11px] font-semibold">
              {listenCount > 0 ? `${listenCount}x` : "Ouvir"}
            </span>
          </button>
          {(listenCount > 0 || picked != null) && (
            <button
              type="button"
              onClick={() => play(0.55)}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-ink-soft"
            >
              Ouvir devagar
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-surface-2/80 p-3 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {guided ? "Foque no contorno" : "Dica · sem entregar"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="hanzi text-3xl text-ink">{step.hanzi}</span>
                {basePinyin && (
                  <span className="font-serif text-xl text-ink-soft">{basePinyin}</span>
                )}
              </div>
              {showMeaning && meaning && <div className="mt-1 text-sm text-ink-soft">{meaning}</div>}
            </div>
            <div className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-faint">
              {contrastOnly ? `${toneChoices.length} opções` : "pinyin sem tom"}
            </div>
          </div>

          {showCurves && (
            <div className={["mt-3 grid gap-2", toneChoices.length <= 2 ? "grid-cols-2" : "grid-cols-4"].join(" ")}>
              {toneChoices.map((t) => (
                <div
                  key={t}
                  className={[
                    "rounded-xl bg-surface px-2 py-2 text-center transition",
                    hintLevel >= 2 && t === answer ? "ring-2 ring-accent/40" : "",
                  ].join(" ")}
                >
                  <ToneCurve tone={t} size={13} />
                  <div className="mt-0.5 text-[11px] font-medium text-ink-soft">{t}º tom</div>
                </div>
              ))}
            </div>
          )}

          {hintLevel >= 2 ? (
            <div className="mt-3 rounded-xl bg-surface px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Resposta explicada
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {step.pinyin && <Pinyin text={step.pinyin} className="font-serif text-xl" />}
                <span className="text-sm font-medium text-ink">{TONE_NAMES[answer]}</span>
              </div>
              <div className="mt-1 text-sm text-ink-soft">Escute se o som {TONE_LISTENING_TIPS[answer]}.</div>
            </div>
          ) : (
            <Button
              variant="soft"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                noteToneHintUse();
                setHintLevel(2);
              }}
            >
              {picked != null && picked !== answer ? "Comparar contornos" : "Mostrar dica"}
            </Button>
          )}
        </div>
      </div>

      <KeyboardShortcutHint />
      <div className={["grid gap-2 sm:gap-3", toneChoices.length <= 2 ? "grid-cols-2" : "grid-cols-4"].join(" ")}>
        {toneChoices.map((t, index) => {
          const state =
            picked == null
              ? selectedTone === t
                ? "selected"
                : "idle"
              : t === answer
                ? "right"
                : t === picked
                  ? "wrong"
                  : "idle";
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
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Opção ${index + 1}: ${t}º tom`}
            >
              <ShortcutBadge className="shrink-0">{index + 1}</ShortcutBadge>
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
            <span className="text-sm font-medium text-ink-faint">Toque nas peças abaixo</span>
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
            Verificar
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

function normalizeDictationAnswer(value: string, mode: LessonStep["dictationMode"]): string {
  if (mode !== "pinyin") return normalizeWriteText(value);
  return numericPinyinToDiacritics(value)
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[，。！？、,.!?;:：；"“”'‘’()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** Ditado Dragão digitado: o modelo só aparece depois de um erro confirmado. */
function StepDragonDictation({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const ttsRate = useStore((s) => s.ttsRate);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const [playbacks, setPlaybacks] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const answer = step.answer ?? step.correctAnswer ?? "";
  const accepted = useMemo(() => uniqueStrings([answer, ...(step.accepts ?? [])]), [answer, step.accepts]);
  const playbackLimit = step.playbackLimit ?? Number.POSITIVE_INFINITY;
  const canPlay = playbacks < playbackLimit;
  const modeLabel = step.dictationMode === "pinyin" ? "pinyin com os tons" : "hànzì";

  function playAudio() {
    if (!canPlay || !step.audioText) return;
    setPlaybacks((count) => count + 1);
    speak(step.audioText, { rate: step.dictationMode === "immersion" ? ttsRate : Math.min(ttsRate, 0.82) });
  }

  function check() {
    if (!draft.trim() || feedback === "correct") return;
    const normalized = normalizeDictationAnswer(draft, step.dictationMode);
    if (accepted.some((candidate) => normalizeDictationAnswer(candidate, step.dictationMode) === normalized)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(draft);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  function retry() {
    setDraft("");
    setFeedback(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "builder",
    optionCount: 0,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(draft.trim()),
    onSelectOption: () => undefined,
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>Ditado Dragão</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">
        {step.title ?? "Ouça e escreva"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Ouça a fala e digite em {modeLabel}. A resposta fica escondida até você tentar.
      </p>

      <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-center">
        <button
          type="button"
          onClick={playAudio}
          disabled={!canPlay || feedback === "correct"}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lift transition active:scale-95 disabled:opacity-40"
          aria-label="Ouvir ditado"
        >
          <IconSound width={30} height={30} />
        </button>
        <p className="mt-2 text-xs text-ink-faint">
          {Number.isFinite(playbackLimit)
            ? `${Math.max(0, playbackLimit - playbacks)} reprodução restante`
            : "Você pode repetir antes de responder"}
        </p>
      </div>

      <textarea
        ref={inputRef}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (feedback !== "correct") setFeedback(null);
        }}
        placeholder={step.dictationMode === "pinyin" ? "Digite o pinyin com os tons…" : "Digite os hànzì…"}
        disabled={feedback === "correct"}
        rows={2}
        autoCapitalize="none"
        autoCorrect="off"
        className="mt-4 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition focus:ring-2 focus:ring-accent/25 disabled:bg-surface-2"
      />

      <EngineActions canCheck={Boolean(draft.trim()) && feedback !== "correct"} onCheck={check} onSkip={onSkip} />
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

type EngineFeedback = "correct" | "wrong" | "unrecognized" | null;

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
  causeFeedback,
  hadMistake,
  deferMistakeToParent = false,
  onRetry,
  onContinue,
}: {
  status: EngineFeedback;
  model?: string;
  explanation?: string;
  /** Frase curta da causa linguística — prioridade sobre explanation no erro. */
  causeFeedback?: string;
  hadMistake: boolean;
  deferMistakeToParent?: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  if (!status) return null;
  if (status === "wrong" && deferMistakeToParent) return null;

  const correct = status === "correct";
  // "Não reconheci" não é erro: o motor está admitindo o limite dele, não
  // apontando o do aluno. Por isso não usa o X nem a cor de erro — a diferença
  // visual é o que impede a mensagem de ser lida como reprovação.
  const unrecognized = status === "unrecognized";
  const wrongCopy = causeFeedback?.trim() || explanation || "Veja o modelo e tente de novo.";
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "animate-pop mt-4 rounded-2xl border p-3.5",
        correct
          ? "border-transparent bg-[rgb(var(--good)/0.12)] longyu-success-bloom"
          : unrecognized
            ? "border-line bg-surface-2"
            : "border-accent-soft bg-accent-soft/45",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2 text-sm font-semibold",
          correct ? "text-[rgb(var(--good))]" : unrecognized ? "text-ink-soft" : "text-accent",
        ].join(" ")}
      >
        {correct ? <IconCheck width={18} height={18} /> : unrecognized ? null : <IconX width={18} height={18} />}
        {correct ? "Boa! +Qi" : unrecognized ? "Não reconheci essa forma" : "Quase"}
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {correct
          ? explanation ??
            (hadMistake
              ? "Certo agora — esta parte entra na revisão."
              : "Estrutura certa.")
          : unrecognized
            ? "Não entendi essa forma — não contou como erro. Exemplo:"
            : wrongCopy}
      </p>
      {model && (
        <div className="mt-3 rounded-xl bg-surface/75 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Modelo
          </div>
          <div className={["mt-1 font-semibold text-ink", isCjkText(model) ? "text-2xl" : "text-sm"].join(" ")}>
            <ExerciseText
              value={model}
              type={isCjkText(model) ? "hanzi" : "pt"}
              speakOnClick
              helpMode="disabled"
            />
          </div>
        </div>
      )}
      {correct ? (
        <StickyActionBar>
          <Button variant="good" className="w-full shadow-lift" onClick={onContinue}>
            Continuar <IconChevron width={18} height={18} />
          </Button>
        </StickyActionBar>
      ) : (
        <StickyActionBar>
          <Button variant="good" className="w-full shadow-lift" onClick={onRetry}>
            Tentar de novo
          </Button>
        </StickyActionBar>
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
    <StickyActionBar>
      <div className={onClear ? "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2" : ""}>
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
    </StickyActionBar>
  );
}

function renderTypedValue(value: string, type?: StepTextType, className = "") {
  if (type === "audio") {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <IconSound width={18} height={18} />
        <ExerciseText
          value={value}
          type={containsCjk(value) ? "hanzi" : type}
          speakOnClick
          helpMode="disabled"
          className={className || "text-[26px] sm:text-3xl"}
        />
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
        helpMode="disabled"
        className={className || "block max-w-[16rem] text-[13px] font-medium leading-snug line-clamp-2"}
      />
    );
  }

  if (type === "hanzi" || containsCjk(value)) {
    return (
      <ExerciseText
        value={value}
        type="hanzi"
        speakOnClick
        helpMode="disabled"
        className={className || "text-[26px] sm:text-3xl"}
      />
    );
  }

  if (type === "pinyin") {
    return <ExerciseText value={value} type="pinyin" className={className || "pinyin text-lg"} />;
  }

  return <ExerciseText value={value} type={type} className={className} helpMode="disabled" />;
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
          ? "Sem áudio — responda pelo pinyin. A escuta volta na revisão."
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
              ? "Compare com o modelo e tente de novo."
              : "Ouça de novo e tente outra vez."}
          </p>
          <div className={["mt-2 rounded-xl bg-surface/75 px-3 py-3 text-center font-semibold text-ink", isCjkText(answer) ? "hanzi text-3xl" : "text-base"].join(" ")}>
            <ExerciseText value={answer} type={isCjkText(answer) ? "hanzi" : "pt"} speakOnClick helpMode="disabled" />
          </div>
          {step.explanation && <p className="mt-3 text-sm leading-6 text-ink-soft">{step.explanation}</p>}
          <Button className="mt-4 w-full shadow-lift" variant="good" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}

      {!feedback && (
        <StickyActionBar className="grid gap-2 sm:grid-cols-[1fr_1fr_1.25fr]">
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
        </StickyActionBar>
      )}
    </div>
  );
}

/** Compara dois estímulos sem revelar hànzì ou pinyin antes da resposta. */
function StepAudioSameDifferent({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const ttsRate = useStore((s) => s.ttsRate);
  const audios = step.audioSequence ?? [];
  const options = step.options ?? ["Iguais", "Diferentes"];
  const answer = step.correctAnswer ?? "";
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);

  function check() {
    if (!picked || feedback === "correct") return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(picked);
    if (!onMistake) playSoundFx("error", soundEffects);
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
      if (option && feedback !== "correct") setPicked(option);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>Ouvido de dragão</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">
        {step.title ?? "Os dois áudios são iguais?"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Escute A e B. Compare a pronúncia completa antes de responder.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {audios.map((audio, index) => (
          <button
            key={`${audio}-${index}`}
            type="button"
            onClick={() => speak(audio, { rate: Math.min(ttsRate, 0.82) })}
            className="rounded-2xl border border-line bg-surface-2 p-5 text-center font-semibold text-ink shadow-card transition hover:border-accent-soft"
            aria-label={`Ouvir áudio ${index === 0 ? "A" : "B"}`}
          >
            <IconSound width={28} height={28} className="mx-auto text-accent" />
            <span className="mt-2 block">Áudio {index === 0 ? "A" : "B"}</span>
          </button>
        ))}
      </div>
      <KeyboardShortcutHint />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => setPicked(option)}
            disabled={feedback === "correct"}
            className={[engineTileClass({ active: picked === option }), "relative"].join(" ")}
          >
            <ShortcutBadge>{shortcutKeyForIndex(index)}</ShortcutBadge>
            <span className="ml-2">{option}</span>
          </button>
        ))}
      </div>
      <EngineActions canCheck={Boolean(picked) && feedback !== "correct"} onCheck={check} onSkip={onSkip} />
      <EngineFeedbackPanel
        status={feedback}
        model={feedback === "wrong" ? step.explanation : undefined}
        explanation={feedback === "correct" ? step.explanation : undefined}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={retry}
        onContinue={() => onDone(!hadMistake)}
      />
    </div>
  );
}

function BuildExercise({ step, onDone, onSkip, onMistake, kindLabel, lessonId, attemptSeed }: StepProps & { kindLabel: string }) {
  const soundEffects = useStore((s) => s.soundEffects);
  const help = useMandarinHelpSettings();
  const helpDisabled = help.disabled || help.helpMode === "disabled";
  const isTranslationBuild = step.kind === "translation_build";
  const pieceJoiner = isTranslationBuild ? " " : "";
  const targetParts = step.targetParts ?? [];
  const acceptedPartSequences = useMemo(
    () => [targetParts, ...(step.acceptedTargetParts ?? [])].filter((parts) => parts.length > 0),
    [step.acceptedTargetParts, targetParts]
  );
  const bankTokens = useMemo(() => {
    const tokens = buildPieceTokens(
      { ...step, bank: uniqueStrings([...(step.bank ?? []), ...acceptedPartSequences.flat()]) },
      targetParts
    );
    const seed =
      attemptSeed ??
      `${lessonId ?? "lesson"}:${step.kind}:${step.correctAnswer ?? ""}:${(step.bank ?? []).join("|")}`;
    return seededShuffleAvoidingOrder(tokens, seed, targetParts, (token) => token.value);
  }, [acceptedPartSequences, attemptSeed, lessonId, step, targetParts]);
  const fallbackAnswer = targetParts.join(pieceJoiner);
  const answer = step.correctAnswer ?? step.answer ?? fallbackAnswer;
  const compareAnswer = step.kind === "hanzi_build" ? targetParts.join("") : answer;
  const audioFirst =
    step.pedagogyVariant === "dragon_dictation" || step.pedagogyVariant === "sentence_lab_audio";
  const hideSource =
    audioFirst || step.pedagogyVariant === "sentence_lab_no_translation";
  const promptText = step.prompt ?? (isTranslationBuild || hideSource ? undefined : step.sourceText);
  const successMessage =
    step.kind === "hanzi_build" ? "Boa! Hànzì montado." : "Boa! Frase montada.";
  const [picked, setPicked] = useState<BuildPieceToken[]>([]);
  const [feedback, setFeedback] = useState<EngineFeedback | "incomplete">(null);
  const [hadMistake, setHadMistake] = useState(false);
  const [assemblyHint, setAssemblyHint] = useState<string | null>(null);
  const [matchPrefix, setMatchPrefix] = useState(0);
  const allowedCounts = useMemo(
    () => uniqueStrings(acceptedPartSequences.map((parts) => String(parts.length))).map(Number),
    [acceptedPartSequences]
  );
  const requiredCount =
    allowedCounts.filter((count) => count >= picked.length).sort((a, b) => a - b)[0] ??
    Math.max(...allowedCounts, targetParts.length);
  // Verificar habilita com pelo menos uma peça; montagem incompleta recebe
  // aviso gentil, não conta como erro.
  const canCheck = picked.length > 0 && feedback !== "correct";
  const built = picked.map((item) => item.value).join(pieceJoiner);
  const usedIds = new Set(picked.map((item) => item.id));
  const correctParts = targetParts.length > 0 ? targetParts : [answer];
  const locked = feedback === "correct" || feedback === "wrong";
  const showWrongMarks = feedback === "wrong";
  const wrongIndexes = useMemo(() => {
    if (!showWrongMarks) return new Set<number>();
    const wrong = new Set<number>();
    picked.forEach((piece, index) => {
      if (correctParts[index] !== piece.value) wrong.add(index);
    });
    return wrong;
  }, [showWrongMarks, picked, correctParts]);
  // Variantes pedagogicamente válidas (ex.: "这是咖啡" e "这 是 咖啡")
  // entram por step.accepts; a comparação é sempre normalizada.
  const acceptedAnswers = useMemo(
    () => uniqueStrings([compareAnswer, ...(step.accepts ?? []), ...acceptedPartSequences.map((parts) => parts.join(pieceJoiner))]),
    [acceptedPartSequences, compareAnswer, pieceJoiner, step.accepts]
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
    setAssemblyHint(null);
    setMatchPrefix(0);
  }

  function removePiece(index: number) {
    if (locked) return;
    speakExercisePiece(picked[index]?.value);
    playSoundFx("tap", soundEffects);
    setPicked((current) => current.filter((_, i) => i !== index));
    setFeedback(null);
    setAssemblyHint(null);
    setMatchPrefix(0);
  }

  function clearPieces() {
    if (feedback === "correct" || picked.length === 0) return;
    setPicked([]);
    setFeedback(null);
    setAssemblyHint(null);
    setMatchPrefix(0);
  }

  function check() {
    if (!canCheck) return;
    if (isBuiltCorrect(built)) {
      setFeedback("correct");
      setAssemblyHint(null);
      playSoundFx("success", soundEffects);
      return;
    }
    const hint = buildAssemblyFeedback({
      picked: picked.map((item) => item.value),
      target: correctParts,
      requiredCount,
      kind: step.kind,
    });
    setMatchPrefix(hint.prefixMatch);
    setAssemblyHint(hint.message);
    if (!allowedCounts.includes(picked.length) && picked.length < Math.max(...allowedCounts)) {
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
    setAssemblyHint(null);
    setMatchPrefix(0);
  }

  return (
    <div data-sentence-build>
      <Eyebrow>{kindLabel}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">{step.title}</h2>
      {promptText && <p className="mt-2 text-sm leading-6 text-ink-soft">{promptText}</p>}
      {audioFirst && step.audioText && (
        <button
          type="button"
          onClick={() => speak(step.audioText!, { rate: 0.8 })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent-soft bg-accent-soft/45 px-4 py-4 font-semibold text-accent shadow-card"
        >
          <IconSound width={22} height={22} /> Ouvir a frase
        </button>
      )}
      {!hideSource && (step.sourceText || (!helpDisabled && (step.sourcePinyin || step.sourceMeaning))) && (
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

      <PieceAssemblyBoard
        trayLabel="Sua resposta"
        bankLabel="Peças para usar"
        tray={
          <PieceAssemblyTray
            pieces={picked}
            emptySlots={Math.max(0, requiredCount - picked.length)}
            locked={locked}
            wrongIndexes={wrongIndexes}
            matchPrefix={matchPrefix}
            showWrong={showWrongMarks}
            emptyHint="Toque nas peças abaixo para montar aqui"
            onRemove={removePiece}
          />
        }
        bank={
          <>
            <KeyboardShortcutHint />
            <PieceAssemblyBank
              pieces={bankTokens}
              usedIds={usedIds}
              locked={locked}
              onAdd={(piece) => {
                const token = bankTokens.find((item) => item.id === piece.id);
                if (token) addPiece(token);
              }}
              showShortcuts
              shortcutLabel={shortcutKeyForIndex}
            />
          </>
        }
        hint={
          (feedback === "incomplete" || feedback === "wrong") && assemblyHint ? (
            <AssemblyHintBanner message={assemblyHint} tone="accent" />
          ) : null
        }
      />

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
        <div className="animate-pop mt-4 rounded-2xl border border-line bg-surface-2 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <IconX width={18} height={18} />
            {assemblyHint ?? "Quase — tente outra montagem."}
          </div>
          <p className="mt-2 text-sm leading-5 text-ink-soft">
            As peças destacadas em verde estão no lugar. Ajuste só o restante — ou limpe e monte de novo.
          </p>
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
  const labels: Partial<Record<NonNullable<LessonStep["pedagogyVariant"]>, string>> = {
    dragon_dictation: "Ditado Dragão",
    sentence_lab_distractors: "Monte · com intrusos",
    sentence_lab_no_translation: "Monte · sem tradução",
    sentence_lab_audio: "Monte · por áudio",
    sentence_lab_repair: "Monte · conserte a frase",
  };
  const label = props.step.pedagogyVariant ? labels[props.step.pedagogyVariant] : undefined;
  return <BuildExercise {...props} kindLabel={label ?? "Monte a frase"} />;
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
  const variantLabel: Partial<Record<NonNullable<LessonStep["pedagogyVariant"]>, string>> = {
    meaning_odd_one_out: "Qual não pertence?",
    meaning_spot_error: "Encontre o erro",
    meaning_intention_match: "Combine a intenção",
  };
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
      <Eyebrow>{(step.pedagogyVariant ? variantLabel[step.pedagogyVariant] : undefined) ?? "Escolha no diálogo"}</Eyebrow>
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
                <ExerciseText
                  value={option}
                  type={isCjkText(option) ? "hanzi" : "pt"}
                  helpMode="disabled"
                />
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

// ————————————————————————————————————————————————————————————————
// Motores de percepção e sentido
//
// Quatro engines que cobram o MESMO vocabulário por caminhos diferentes:
// discriminar som, escrever o que ouviu, agrupar por sentido e julgar
// estrutura. Conteúdo em src/data/perceptionDrills.ts.
// ————————————————————————————————————————————————————————————————

/** Botão de áudio rotulado (A / B) usado no par mínimo. */
function DiscriminationAudioButton({
  label,
  text,
  disabled,
  onPlay,
}: {
  label: string;
  text: string;
  disabled?: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled}
      aria-label={`Ouvir som ${label}`}
      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-accent-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lift ring-4 ring-accent-soft">
        <IconSound width={26} height={26} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        Som {label}
      </span>
      <span className="sr-only">{text}</span>
    </button>
  );
}

/**
 * Par mínimo: "iguais ou diferentes?". O aluno decide ANTES de ver qualquer
 * escrita — é ouvido puro. Só depois de responder aparecem os dois hànzì, o
 * contraste e por que ele engana quem fala português.
 */
function StepAudioDiscrimination({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const ttsRate = useStore((s) => s.ttsRate);
  const answer = (step.correctAnswer ?? step.answer ?? "different") as "same" | "different";
  const audioA = step.audioText ?? "";
  const audioB = step.audioTextB ?? audioA;
  const [picked, setPicked] = useState<"same" | "different" | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const reveal = step.pairReveal ?? [];

  const playBoth = useCallback(() => {
    speak(audioA, { rate: Math.min(ttsRate, 0.8) });
    // O segundo som entra depois do primeiro terminar; sem isso a TTS
    // atropela e o par vira um borrão.
    return scheduleAutoSpeak(audioB, { rate: Math.min(ttsRate, 0.8), delayMs: 1100 });
  }, [audioA, audioB, ttsRate]);

  useEffect(() => {
    const cancel = playBoth();
    return cancel;
  }, [playBoth]);

  const options: { value: "same" | "different"; label: string }[] = [
    { value: "same", label: "Iguais" },
    { value: "different", label: "Diferentes" },
  ];

  function check() {
    if (!picked || feedback === "correct") return;
    if (picked === answer) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(picked);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      if (feedback === "correct" || !options[index]) return;
      setPicked(options[index].value);
      setFeedback(null);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>Ouvido fino</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {step.title ?? "Estes dois sons são iguais?"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {step.prompt ?? "Ouça os dois e decida. Não tem escrita nesta pergunta — só ouvido."}
      </p>

      <div className="mt-3 flex gap-3">
        <DiscriminationAudioButton
          label="A"
          text={audioA}
          onPlay={() => speak(audioA, { rate: Math.min(ttsRate, 0.8) })}
        />
        <DiscriminationAudioButton
          label="B"
          text={audioB}
          onPlay={() => speak(audioB, { rate: Math.min(ttsRate, 0.8) })}
        />
      </div>
      <div className="mt-2 text-center">
        <Button variant="outline" size="sm" onClick={playBoth}>
          <IconSound width={16} height={16} />
          Ouvir os dois de novo
        </Button>
      </div>

      <KeyboardShortcutHint />
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {options.map((option, index) => {
          const active = picked === option.value;
          const correct = feedback === "correct" && option.value === answer;
          const wrong = feedback === "wrong" && active;
          return (
            <button
              key={option.value}
              type="button"
              disabled={feedback === "correct"}
              onClick={() => {
                setPicked(option.value);
                setFeedback(null);
              }}
              className={["relative flex items-center justify-center", engineTileClass({ active, matched: correct, wrong })].join(" ")}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="px-3">{option.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && reveal.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {step.contrastLabel ? `Contraste · ${step.contrastLabel}` : "Os dois sons"}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {reveal.map((side, index) => (
              <div key={`${side.hanzi}-${index}`} className="rounded-xl bg-surface/75 px-3 py-2 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Som {index === 0 ? "A" : "B"}
                </div>
                <div className="hanzi mt-1 text-3xl font-semibold text-ink">
                  <ExerciseText value={side.hanzi} type="hanzi" speakOnClick helpMode="disabled" />
                </div>
                <Pinyin text={side.pinyin} className="mt-1 block text-sm" />
                <div className="mt-0.5 text-xs text-ink-soft">{side.meaningPt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EngineFeedbackPanel
        status={feedback}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={() => {
          setPicked(null);
          setFeedback(null);
          playBoth();
        }}
        onContinue={() => onDone(!hadMistake)}
      />

      {feedback !== "correct" && (
        <EngineActions canCheck={Boolean(picked)} onCheck={check} onSkip={onSkip} />
      )}
    </div>
  );
}

/**
 * Ditado. Três canais para a MESMA frase: montar com peças, escrever pinyin
 * ou escrever hànzì. No modo imersão o áudio toca uma vez só, em velocidade
 * natural — é o degrau que aproxima da rua.
 */
function StepDictation({ step, onDone, onSkip, onMistake, lessonId, attemptSeed }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const ttsRate = useStore((s) => s.ttsRate);
  // Escrever hànzì exige teclado chinês, que muita gente não tem no celular.
  // Quem não puder digitar monta com peças — a escuta continua sendo cobrada,
  // que é o ponto do ditado.
  const [blocksFallback, setBlocksFallback] = useState(false);
  const authoredMode = step.dictationMode ?? "blocks";
  const canFallbackToBlocks = authoredMode === "hanzi" && (step.targetParts?.length ?? 0) > 0;
  const mode = blocksFallback && canFallbackToBlocks ? "blocks" : authoredMode;
  const audioText = step.audioText ?? step.hanzi ?? "";
  const targetParts = useMemo(() => step.targetParts ?? [], [step.targetParts]);
  const writtenAnswer = step.correctAnswer ?? step.answer ?? targetParts.join("");
  const bankTokens = useMemo(() => {
    const tokens = buildPieceTokens(step, targetParts);
    const seed = attemptSeed ?? `${lessonId ?? "dict"}:${writtenAnswer}:${(step.bank ?? []).join("|")}`;
    return seededShuffleAvoidingOrder(tokens, seed, targetParts, (token) => token.value);
  }, [attemptSeed, lessonId, step, targetParts, writtenAnswer]);
  const singlePlayback = Boolean(step.singlePlayback);

  const [picked, setPicked] = useState<BuildPieceToken[]>([]);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const [plays, setPlays] = useState(0);

  const acceptedAnswers = useMemo(
    () => uniqueStrings([writtenAnswer, ...(step.accepts ?? [])]),
    [writtenAnswer, step.accepts]
  );
  const built = picked.map((item) => item.value).join("");
  const usedIds = new Set(picked.map((item) => item.id));
  const locked = feedback === "correct";
  // No modo imersão a reprodução acaba; nos demais o aluno repete à vontade —
  // repetir áudio não é cola, é como o ouvido se constrói.
  const playsLeft = singlePlayback ? Math.max(0, 1 - plays) : Infinity;

  const play = useCallback(
    (slow = false) => {
      if (playsLeft <= 0) return;
      setPlays((current) => current + 1);
      speak(audioText, { rate: slow ? Math.min(ttsRate, 0.6) : singlePlayback ? 1 : ttsRate });
    },
    [audioText, playsLeft, singlePlayback, ttsRate]
  );

  useEffect(() => {
    if (!audioText || singlePlayback) return;
    return scheduleAutoSpeak(audioText, { rate: ttsRate, delayMs: 320 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioText, singlePlayback]);

  function matches(candidate: string): boolean {
    const normalized = normalizeEngineAnswer(candidate);
    return acceptedAnswers.some((accepted) => normalized === normalizeEngineAnswer(accepted));
  }

  const canCheck =
    !locked && (mode === "blocks" ? picked.length > 0 : typed.trim().length > 0);

  function check() {
    if (!canCheck) return;
    const candidate = mode === "blocks" ? built : typed;
    if (matches(candidate)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(candidate);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  function retry() {
    setPicked([]);
    setTyped("");
    setFeedback(null);
  }

  const modeLabel =
    mode === "blocks" ? "Ouça e monte" : mode === "pinyin" ? "Ouça e escreva o pinyin" : "Ouça e escreva o hànzì";
  const modeHint =
    mode === "blocks"
      ? "Toque nas peças na ordem em que você ouvir."
      : mode === "pinyin"
        ? "Escreva o que ouviu em pinyin. Acentos são opcionais."
        : "Escreva o que ouviu em hànzì.";

  return (
    <div>
      <Eyebrow>{singlePlayback ? "Ditado · imersão" : "Ditado"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {step.title ?? modeLabel}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{step.prompt ?? modeHint}</p>

      <div className="mt-3 grid gap-2.5 rounded-2xl border border-line bg-surface-2 p-3 text-center">
        <button
          type="button"
          onClick={() => play(false)}
          disabled={playsLeft <= 0}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lift ring-4 ring-accent-soft transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Ouvir o ditado"
        >
          <IconSound width={34} height={34} />
        </button>
        {singlePlayback ? (
          <div className="text-xs text-ink-soft">
            {playsLeft > 0 ? "Velocidade natural — você ouve uma vez só." : "Reprodução usada. Escreva o que pegou."}
          </div>
        ) : (
          <div>
            <Button variant="outline" size="sm" onClick={() => play(true)}>
              <IconSound width={16} height={16} />
              Áudio lento
            </Button>
          </div>
        )}
      </div>

      {mode === "blocks" ? (
        <>
          <div className="mt-3.5 min-h-[3.75rem] rounded-2xl border border-dashed border-line bg-surface-2 p-2.5">
            {picked.length === 0 ? (
              <p className="py-2 text-center text-sm text-ink-faint">Monte aqui o que você ouviu.</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {picked.map((token, index) => (
                  <button
                    key={token.id}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      setPicked((current) => current.filter((_, i) => i !== index));
                      setFeedback(null);
                    }}
                    className={engineTileClass({ active: true, cjk: isCjkText(token.value) })}
                  >
                    {token.value}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            {bankTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                disabled={locked || usedIds.has(token.id)}
                onClick={() => {
                  if (locked || usedIds.has(token.id)) return;
                  playSoundFx("pieceSelect", soundEffects);
                  setPicked((current) => [...current, token]);
                  setFeedback(null);
                }}
                className={[
                  engineTileClass({ cjk: isCjkText(token.value) }),
                  usedIds.has(token.id) && "opacity-30",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {token.value}
              </button>
            ))}
          </div>
        </>
      ) : (
        <input
          value={typed}
          disabled={locked}
          onChange={(event) => {
            setTyped(event.target.value);
            setFeedback(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") check();
          }}
          placeholder={mode === "pinyin" ? "ex.: wo yao cha" : "ex.: 我要茶"}
          aria-label={modeLabel}
          className={[
            "mt-3.5 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-center font-semibold text-ink shadow-card outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15",
            mode === "hanzi" ? "hanzi text-2xl" : "text-lg",
          ].join(" ")}
        />
      )}

      {canFallbackToBlocks && !locked && (
        <div className="mt-2.5 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBlocksFallback((current) => !current);
              setPicked([]);
              setTyped("");
              setFeedback(null);
            }}
          >
            {blocksFallback ? "Voltar a digitar hànzì" : "Não tenho teclado chinês"}
          </Button>
        </div>
      )}

      <EngineFeedbackPanel
        status={feedback}
        model={feedback === "wrong" || hadMistake ? (step.hanzi ?? writtenAnswer) : undefined}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={retry}
        onContinue={() => onDone(!hadMistake)}
      />

      {!locked && (
        <EngineActions
          canCheck={canCheck}
          onCheck={check}
          onSkip={onSkip}
          onClear={mode === "blocks" ? () => setPicked([]) : undefined}
          canClear={picked.length > 0}
        />
      )}
    </div>
  );
}

/** Escolha simples com explicação — base de odd_one_out e spot_error. */
function MeaningChoiceExercise({
  step,
  onDone,
  onSkip,
  onMistake,
  eyebrow,
  fallbackTitle,
  fallbackPrompt,
  layout,
  lessonId,
  attemptSeed,
  showOptionMeta,
}: StepProps & {
  eyebrow: string;
  fallbackTitle: string;
  fallbackPrompt: string;
  layout: "grid" | "stack";
  showOptionMeta?: boolean;
}) {
  const soundEffects = useStore((s) => s.soundEffects);
  const answer = step.correctAnswer ?? step.answer ?? "";
  // PED-012/015: odd_one_out já vem com ordem seeded; não reembaralhar ao acaso.
  const options = useMemo(() => {
    const raw = [...(step.options ?? [])];
    if (step.kind === "odd_one_out") return raw;
    const seed = attemptSeed ?? `${lessonId ?? "x"}:${step.kind}:${answer}:${raw.join("|")}`;
    return seededShuffleAvoidingOrder(raw, seed, [answer]);
  }, [answer, attemptSeed, lessonId, step.kind, step.options]);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const metaEnabled = Boolean(showOptionMeta && step.optionMeta);

  function check() {
    if (!picked || feedback === "correct") return;
    if (normalizeEngineAnswer(picked) === normalizeEngineAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(picked);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: options.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      if (feedback === "correct" || !options[index]) return;
      speakExercisePiece(options[index]);
      setPicked(options[index]);
      setFeedback(null);
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {step.title ?? fallbackTitle}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{step.prompt ?? fallbackPrompt}</p>

      <KeyboardShortcutHint />
      <div className={["mt-3.5 grid gap-2", layout === "grid" ? "sm:grid-cols-2" : ""].join(" ")}>
        {options.map((option, index) => {
          const active = picked === option;
          const correct = feedback === "correct" && normalizeEngineAnswer(option) === normalizeEngineAnswer(answer);
          const wrong = feedback === "wrong" && active;
          const meta = step.optionMeta?.[option];
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={feedback === "correct"}
              onClick={() => {
                speakExercisePiece(option);
                setPicked(option);
                setFeedback(null);
              }}
              className={[
                "relative flex flex-col items-center justify-center gap-0.5",
                engineTileClass({ active, matched: correct, wrong, cjk: isCjkText(option) }),
              ].join(" ")}
            >
              <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
              <span className="px-3">{renderTypedValue(option, isCjkText(option) ? "hanzi" : "pt")}</span>
              {metaEnabled && meta?.pinyin && (
                <span className="px-2 text-[11px] font-normal text-ink-faint">{meta.pinyin}</span>
              )}
              {metaEnabled && meta?.meaningPt && (step.oddOneOutLevel ?? 1) === 1 && (
                <span className="px-2 text-[11px] font-normal text-ink-soft">{meta.meaningPt}</span>
              )}
              {correct && <IconCheck className="absolute right-2 top-2 text-[rgb(var(--good))]" width={16} height={16} />}
              {wrong && <IconX className="absolute right-2 top-2 text-wrong" width={16} height={16} />}
            </button>
          );
        })}
      </div>

      <EngineFeedbackPanel
        status={feedback}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={() => {
          setPicked(null);
          setFeedback(null);
        }}
        onContinue={() => onDone(!hadMistake)}
      />

      {feedback !== "correct" && (
        <EngineActions canCheck={Boolean(picked)} onCheck={check} onSkip={onSkip} />
      )}
    </div>
  );
}

/** "Qual não pertence?" — cobra sentido e categoria, não tradução decorada. */
function StepOddOneOut(props: StepProps) {
  return (
    <MeaningChoiceExercise
      {...props}
      eyebrow="Sentido"
      fallbackTitle="Qual não pertence?"
      fallbackPrompt="Três palavras são do mesmo grupo. Toque na que sobra."
      layout="grid"
      showOptionMeta
    />
  );
}

/**
 * "Qual frase faz isso?" — as duas são compreensíveis; só uma está certa.
 * O aluno julga estrutura, e a correção entrega a regra em uma frase.
 */
function StepSpotError(props: StepProps) {
  return (
    <MeaningChoiceExercise
      {...props}
      eyebrow="Estrutura"
      fallbackTitle="Qual frase faz isso?"
      fallbackPrompt="As duas parecem certas. Só uma funciona."
      layout="stack"
    />
  );
}

// ————————————————————————————————————————————————————————————————
// Produção sem apoio, transferência e reparo (onda 2).
//
// A tela destes três motores é definida pelo que ela não tem: nenhum banco de
// peças, nenhuma alternativa, nenhuma tradução do alvo. Só a situação em
// português e um campo vazio. O modelo aparece depois da tentativa — nunca
// antes, senão o exercício vira cópia.
// ————————————————————————————————————————————————————————————————

/** Campo de resposta livre — fala é alternativa, não competição com o input. */
function FreeAnswerField({
  value,
  onChange,
  disabled,
  placeholder,
  onSubmit,
  speechAsAlternative = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  placeholder: string;
  onSubmit: () => void;
  /** Se true, o mic vira link discreto em vez de botão ao lado do campo. */
  speechAsAlternative?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const handleRef = useRef<RecognizeHandle | null>(null);
  const speechSupported = isRecognitionAvailable() && isSecureMicContext();

  useEffect(() => () => handleRef.current?.stop(), []);

  function stopListening() {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }

  async function startListening() {
    if (disabled) return;
    if (listening) {
      stopListening();
      return;
    }
    setMicError(null);
    const permission = await ensureMicPermission();
    if (permission !== "granted") {
      setMicError(speechErrorMessage(permission === "denied" ? "not-allowed" : "unsupported"));
      return;
    }
    setListening(true);
    handleRef.current = recognizeOnce(
      (transcript) => {
        setListening(false);
        handleRef.current = null;
        if (transcript) onChange(transcript);
      },
      (code) => {
        setListening(false);
        handleRef.current = null;
        setMicError(speechErrorMessage(code));
      },
      { lang: "zh-CN" }
    );
  }

  return (
    <div className={speechAsAlternative ? "mt-2" : "mt-3.5"}>
      <textarea
        value={value}
        lang="zh-CN"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onFocus={(event) => {
          const target = event.currentTarget;
          window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            if (composing || event.nativeEvent.isComposing) return;
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        rows={2}
        placeholder={placeholder}
        aria-label="Sua resposta"
        className="w-full resize-none rounded-2xl border border-line bg-surface-2 p-3.5 text-lg text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
      />
      {speechAsAlternative ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {speechSupported ? (
            <button
              type="button"
              disabled={disabled}
              onClick={startListening}
              aria-pressed={listening}
              className="text-xs font-medium text-ink-mute underline decoration-line underline-offset-2 transition hover:text-ink disabled:opacity-50"
            >
              {listening ? "Ouvindo… toque para parar" : "Ou falar a resposta"}
            </button>
          ) : null}
          <span className="text-xs text-ink-faint">Vale hànzì ou pinyin.</span>
        </div>
      ) : (
        <>
          {speechSupported && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                variant={listening ? "soft" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={startListening}
                aria-pressed={listening}
              >
                <IconSound width={16} height={16} />
                {listening ? "Ouvindo… toque para parar" : "Falar"}
              </Button>
              <span className="text-xs text-ink-faint">Vale hànzì ou pinyin.</span>
            </div>
          )}
          {!speechSupported && <p className="mt-2 text-xs text-ink-faint">Vale hànzì ou pinyin.</p>}
        </>
      )}
      {micError && <p className="mt-2 text-xs text-ink-soft">{micError}</p>}
    </div>
  );
}

type PatternPiece = { text: string; hole: boolean; slot?: PatternSlot };

/**
 * Quebra o padrão visual (ex.: 你要 ___ 吗？) em peças alinhadas aos slots
 * quando o trecho fixo tem 1 caractere por papel consecutivo.
 */
function decomposePatternPieces(patternPt: string | undefined, slots?: PatternSlot[]): PatternPiece[] {
  if (!patternPt) return [];
  const parts = patternPt.split(/(___)/);
  const pieces: PatternPiece[] = [];
  let slotIndex = 0;

  for (const part of parts) {
    if (part === "___") {
      const slot = slots?.[slotIndex++];
      pieces.push({ text: "___", hole: true, slot });
      continue;
    }

    const glyphs = Array.from(part.replace(/[?\s。？，,！!．.、]/g, ""));
    if (!glyphs.length) continue;

    if (!slots?.length) {
      pieces.push({ text: glyphs.join(""), hole: false });
      continue;
    }

    let run = 0;
    while (slotIndex + run < slots.length && !slots[slotIndex + run]?.hole) run += 1;

    if (run <= 0) {
      pieces.push({ text: glyphs.join(""), hole: false });
      continue;
    }

    if (glyphs.length === run) {
      for (let i = 0; i < run; i += 1) {
        pieces.push({ text: glyphs[i] ?? "", hole: false, slot: slots[slotIndex++] });
      }
      continue;
    }

    if (glyphs.length > run) {
      for (let i = 0; i < run - 1; i += 1) {
        pieces.push({ text: glyphs[i] ?? "", hole: false, slot: slots[slotIndex++] });
      }
      pieces.push({
        text: glyphs.slice(run - 1).join(""),
        hole: false,
        slot: slots[slotIndex++],
      });
      continue;
    }

    pieces.push({ text: glyphs.join(""), hole: false, slot: slots[slotIndex] });
    slotIndex += run;
  }

  return pieces;
}

/** Scaffold da estrutura: rótulos sobem intuitivo → pareado → técnico. */
function PatternSlotScaffold({
  slots,
  patternPt,
  lessonId,
  frameId,
}: {
  slots?: PatternSlot[];
  patternPt?: string;
  lessonId?: string;
  frameId?: string;
}) {
  const labelFor = (slot: PatternSlot) =>
    resolveSlotLabel(slot, { lessonId, frameId, patternPt, hole: slot.hole });

  return (
    <div className="mt-2" data-production-scaffold-pattern data-concept-lesson={lessonId ?? ""}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Estrutura</div>
      {patternPt && (
        <p className="mt-1.5 font-serif text-base font-semibold text-ink">
          <span className="hanzi">{patternPt}</span>
        </p>
      )}
      {slots && slots.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-production-slot-labels>
          {slots.map((slot, index) => (
            <div key={`${slot.role}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-ink-faint/70" aria-hidden>·</span>}
              <span
                className={[
                  "inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide",
                  slot.hole
                    ? "border border-dashed border-accent/50 bg-accent-soft/50 text-accent"
                    : "border border-line bg-surface text-ink-soft",
                ].join(" ")}
                data-slot-role={slot.role}
              >
                {labelFor(slot)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Breakdown sob demanda: peças do padrão + rótulos (intuitivos até o termo técnico estar pronto). */
function StructureHowItWorks({
  patternPt,
  slots,
  lessonId,
  frameId,
  forceOpen = false,
}: {
  patternPt?: string;
  slots?: PatternSlot[];
  lessonId?: string;
  frameId?: string;
  /** Nível 2+: estrutura já expandida (ainda pode recolher). */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(forceOpen);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  const pieces = useMemo(() => decomposePatternPieces(patternPt, slots), [patternPt, slots]);
  if (!patternPt && !slots?.length) return null;

  return (
    <div className="mt-2" data-production-scaffold>
      {!forceOpen ? (
        <button
          type="button"
          className="text-left text-xs font-semibold text-ink-mute underline decoration-line underline-offset-2 transition hover:text-ink"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ocultar como a frase funciona" : "Ver como a frase funciona"}
        </button>
      ) : (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Estrutura</p>
      )}
      {open ? (
        <div
          className="mt-2 rounded-2xl border border-line/70 bg-white/55 px-3 py-3"
          data-production-scaffold-pattern
          data-concept-lesson={lessonId ?? ""}
        >
          <div className="flex flex-wrap items-end gap-1.5" data-production-slot-labels>
            {(pieces.length > 0
              ? pieces
              : (slots ?? []).map((slot) => ({
                  text: slot.hole ? "___" : "·",
                  hole: Boolean(slot.hole),
                  slot,
                }))
            ).map((piece, index) => {
              const slot = piece.slot;
              const label = slot
                ? formatConceptLabel(conceptForSlot(slot, { frameId, patternPt }), lessonId)
                : undefined;
              return (
                <div key={`${piece.text}-${index}`} className="min-w-[2.75rem] text-center">
                  <div
                    className={[
                      "hanzi rounded-xl px-2.5 py-2 text-lg font-semibold leading-none",
                      piece.hole
                        ? "border border-dashed border-gold/55 bg-[rgb(var(--gold)/0.08)] text-gold"
                        : "border border-line bg-surface-2 text-ink",
                    ].join(" ")}
                    data-slot-role={slot?.role}
                  >
                    {piece.text}
                  </div>
                  {label ? (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.06em] text-ink-mute">
                      {label}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** free_production e transfer_task compartilham a mesma mecânica. */
function StepFreeProduction({ step, onDone, onSkip, onMistake, onUnrecognized, lessonId }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const isTransfer = step.kind === "transfer_task";
  const isOpen = Boolean(step.productionOpen);
  const model = step.correctAnswer ?? step.answer ?? "";
  const acceptedAnswers = useMemo(
    () => uniqueStrings([model, ...(step.accepts ?? [])]),
    [model, step.accepts]
  );
  const initialHelp = clampProductionHelpLevel(step.productionHelpInitial ?? (isTransfer ? 0 : isOpen ? 0 : 1));
  const softCeiling = clampProductionHelpLevel(step.productionHelpCeiling ?? (isTransfer ? 2 : isOpen ? 1 : 3));
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const [localMistakes, setLocalMistakes] = useState(0);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [causeFeedback, setCauseFeedback] = useState<string | undefined>(undefined);
  const [helpLevel, setHelpLevel] = useState<ProductionHelpLevel>(initialHelp);
  const [unlockedMax, setUnlockedMax] = useState<ProductionHelpLevel>(softCeiling);
  const [helpRequests, setHelpRequests] = useState(0);
  const [buildPicked, setBuildPicked] = useState<string[]>([]);
  const locked = feedback === "correct";

  const otherAnswers = useMemo(() => {
    const shown = new Set([normalizeEngineAnswer(accepted ?? model)]);
    const list: string[] = [];
    for (const example of step.productionExamples ?? []) {
      const key = normalizeEngineAnswer(example.hanzi);
      if (!example.hanzi || shown.has(key)) continue;
      shown.add(key);
      list.push(example.hanzi);
    }
    return list.slice(0, 4);
  }, [step.productionExamples, accepted, model]);

  const buildBank = step.productionHelpBuildBank ?? [];
  const vocabHints = step.productionHelpVocab ?? [];
  const showPattern = helpLevel >= 1 && Boolean(step.patternPt);
  const showStructure = helpLevel >= 2 && Boolean(step.patternPt || step.patternSlots?.length);
  const showVocab = helpLevel >= 3 && vocabHints.length > 0 && !isOpen;
  const showBuild = helpLevel >= 4 && buildBank.length >= 2 && !isOpen;
  const canRequestMore = nextProductionHelpLevel(helpLevel, unlockedMax) != null;

  function finishDone(correct: boolean) {
    onDone(correct, {
      helpLevel,
      helpRequests,
      initialHelpLevel: initialHelp,
    });
  }

  function requestMoreHelp() {
    const next = nextProductionHelpLevel(helpLevel, unlockedMax);
    if (next == null) return;
    setHelpLevel(next);
    setHelpRequests((count) => count + 1);
    void trackPedagogyEvent({
      eventType: "production_help_requested",
      lessonId,
      exerciseKind: step.kind,
      metadata: {
        helpLevel: next,
        previousHelpLevel: helpLevel,
        initialHelpLevel: initialHelp,
        unlockedMax,
        productionAssist: step.productionAssist ?? null,
        frameId: step.productionFrameId ?? null,
        firstOfStructure: step.productionHelpFirstOfStructure ?? false,
      },
    });
  }

  function registerLocalMistake() {
    const nextCount = localMistakes + 1;
    setLocalMistakes(nextCount);
    setHadMistake(true);
    const nextUnlock = unlockProductionHelpAfterMistake({
      unlockedMax,
      mistakeCount: nextCount,
      softCeiling,
    });
    setUnlockedMax(nextUnlock);
  }

  function check() {
    const candidate = showBuild && buildPicked.length > 0 ? buildPicked.join("") : draft.trim();
    if (!candidate || locked) return;
    const normalized = normalizeEngineAnswer(candidate);
    if (acceptedAnswers.some((value) => normalizeEngineAnswer(value) === normalized)) {
      setAccepted(candidate);
      setFeedback("correct");
      setCauseFeedback(undefined);
      playSoundFx("success", soundEffects);
      return;
    }

    const diagnosis = diagnoseError({
      kind: step.kind,
      expected: model,
      given: candidate,
      hasCommunicativeGoal: true,
    });
    if (isUnexplainedProduction(diagnosis, candidate)) {
      setFeedback("unrecognized");
      setCauseFeedback(undefined);
      playSoundFx("tap", soundEffects);
      onUnrecognized?.(candidate);
      return;
    }

    registerLocalMistake();
    setCauseFeedback(diagnosis.feedbackPt);
    setFeedback("wrong");
    onMistake?.(candidate);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  const answerPlaceholder = isTransfer
    ? "hànzì ou pinyin"
    : isOpen
      ? "Escreva o que você diria…"
      : step.patternPt
        ? `Complete: ${step.patternPt}`
        : "hànzì ou pinyin";

  const helpMeta = (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1"
      data-production-help-level={helpLevel}
      data-production-help-unlocked={unlockedMax}
    >
      {canRequestMore ? (
        <button
          type="button"
          onClick={requestMoreHelp}
          className="text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-2 transition hover:decoration-accent"
          data-production-help-request
        >
          Preciso de uma dica
        </button>
      ) : null}
      {hadMistake && canRequestMore ? (
        <span className="text-xs text-ink-mute">Mais ajuda liberada após o erro</span>
      ) : null}
      {helpLevel > initialHelp ? (
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Ajuda · {productionHelpLevelLabel(helpLevel)}
        </span>
      ) : null}
    </div>
  );

  const feedbackPanel = (
    <EngineFeedbackPanel
      status={feedback}
      model={
        feedback === "wrong" || feedback === "unrecognized" || hadMistake || (!isOpen && locked)
          ? model
          : undefined
      }
      explanation={step.explanation}
      causeFeedback={causeFeedback}
      hadMistake={hadMistake}
      deferMistakeToParent={Boolean(onMistake)}
      onRetry={() => {
        setDraft("");
        setBuildPicked([]);
        setFeedback(null);
        setCauseFeedback(undefined);
      }}
      onContinue={() => finishDone(!hadMistake)}
    />
  );

  const otherAnswersPanel =
    feedback !== null && otherAnswers.length > 0 ? (
      <div className="animate-pop mt-3 rounded-2xl border border-line bg-surface-2 p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isOpen ? "Outras respostas que valiam" : "Isto também valia"}
        </div>
        <ul className="mt-2 grid gap-1.5">
          {otherAnswers.map((answer) => (
            <li key={answer} className="hanzi text-lg text-ink">
              <ExerciseText value={answer} type="hanzi" speakOnClick helpMode="disabled" />
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const answerSection = (
    <section className="mt-4" data-production-answer>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {showBuild ? "Monte a frase" : "Responda"}
      </div>
      {showBuild ? (
        <div className="mt-2" data-production-help-build>
          <div className="mb-2 flex min-h-[3rem] flex-wrap gap-1.5 rounded-2xl border border-line bg-surface-2 p-2.5">
            {buildPicked.length === 0 ? (
              <span className="text-sm text-ink-faint">Toque nas peças</span>
            ) : (
              buildPicked.map((piece, index) => (
                <button
                  key={`${piece}-${index}`}
                  type="button"
                  className="hanzi rounded-xl border border-line bg-white px-2.5 py-1.5 text-lg font-semibold text-ink"
                  onClick={() => setBuildPicked((prev) => prev.filter((_, i) => i !== index))}
                  disabled={locked}
                >
                  {piece}
                </button>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {buildBank.map((piece, index) => {
              const used = buildPicked.filter((p) => p === piece).length;
              const available = buildBank.filter((p) => p === piece).length;
              const disabled = locked || used >= available;
              return (
                <button
                  key={`${piece}-bank-${index}`}
                  type="button"
                  disabled={disabled}
                  className="hanzi rounded-xl border border-line bg-surface px-2.5 py-1.5 text-lg font-semibold text-ink disabled:opacity-35"
                  onClick={() => {
                    setBuildPicked((prev) => [...prev, piece]);
                    if (feedback !== "correct") setFeedback(null);
                  }}
                >
                  {piece}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Ainda pode digitar se preferir.</p>
          <FreeAnswerField
            value={draft}
            onChange={(next) => {
              setDraft(next);
              if (feedback !== "correct") setFeedback(null);
            }}
            disabled={locked}
            placeholder={answerPlaceholder}
            onSubmit={check}
            speechAsAlternative
          />
        </div>
      ) : (
        <FreeAnswerField
          value={draft}
          onChange={(next) => {
            setDraft(next);
            if (feedback !== "correct") setFeedback(null);
          }}
          disabled={locked}
          placeholder={answerPlaceholder}
          onSubmit={check}
          speechAsAlternative
        />
      )}
    </section>
  );

  if (isTransfer) {
    return (
      <div
        data-production-step={step.kind}
        data-production-assist={step.productionAssist ?? "guided"}
        data-production-help-initial={initialHelp}
        className="mx-auto w-full max-w-lg"
      >
        <Eyebrow>Transferência</Eyebrow>

        <section
          className="mt-3 rounded-2xl border border-accent-soft bg-accent-soft/40 px-3.5 py-3"
          data-production-situation
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Situação</div>
          <p className="mt-1 text-base font-medium leading-6 text-ink sm:text-[1.05rem]">
            {step.situationPt ?? step.prompt}
          </p>
        </section>

        {step.transferAnchorHanzi ? (
          <section className="mt-3" data-production-learned>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Você já conhece
            </div>
            <p className="mt-1 hanzi text-2xl leading-tight text-ink sm:text-[1.7rem]">
              <ExerciseText value={step.transferAnchorHanzi} type="hanzi" speakOnClick />
            </p>
            {step.transferAnchorPinyin ? (
              <Pinyin text={step.transferAnchorPinyin} className="mt-0.5 block text-sm text-ink-soft" />
            ) : null}
            {step.transferTransformHint && helpLevel >= 1 ? (
              <div
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft"
                data-production-transform-hint
              >
                <span className="hanzi text-base text-ink">{step.transferTransformHint.from}</span>
                <span aria-hidden>→</span>
                <span className="hanzi text-base text-ink">{step.transferTransformHint.to}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {showPattern ? (
          <section className="mt-3.5" data-production-goal>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Use este padrão
            </div>
            <p className="mt-1 hanzi text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[1.7rem]">
              {step.patternPt}
            </p>
            {step.productionAssist === "question" ? (
              <p className="sr-only" data-production-question-hint>
                Monte a frase e feche com 吗 no final.
              </p>
            ) : null}
            {showStructure ? (
              <StructureHowItWorks
                patternPt={step.patternPt}
                slots={step.patternSlots}
                lessonId={lessonId}
                frameId={step.productionFrameId}
                forceOpen
              />
            ) : null}
          </section>
        ) : (
          <p className="mt-2 text-sm text-ink-soft" data-production-goal>
            Escreva o que a situação pede.
          </p>
        )}

        {showVocab ? (
          <section className="mt-3" data-production-help-vocab>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Palavras úteis
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-2">
              {vocabHints.map((item) => (
                <li
                  key={item.hanzi}
                  className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5"
                >
                  <span className="hanzi text-base font-semibold text-ink">{item.hanzi}</span>
                  {item.pinyin ? <span className="ml-1.5 text-xs text-ink-soft">{item.pinyin}</span> : null}
                  {item.meaningPt ? (
                    <span className="mt-0.5 block text-[11px] text-ink-mute">{item.meaningPt}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {answerSection}
        {!locked ? helpMeta : null}
        {feedbackPanel}
        {otherAnswersPanel}

        {!locked && (
          <EngineActions
            canCheck={(showBuild ? buildPicked.length > 0 : false) || draft.trim().length > 0}
            onCheck={check}
            onSkip={onSkip}
          />
        )}
      </div>
    );
  }

  return (
    <div
      data-production-step={step.kind}
      data-production-assist={step.productionAssist ?? (isOpen ? "open" : undefined)}
      data-production-help-initial={initialHelp}
    >
      <Eyebrow>{isOpen ? "Você escolhe" : "Produção livre"}</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {step.title ?? (isOpen ? "Diga do seu jeito" : "Sua vez de produzir")}
      </h2>

      <div
        className="mt-3.5 rounded-2xl border border-accent-soft bg-accent-soft/45 p-3.5"
        data-production-situation
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Situação</div>
        <p className="mt-1 text-base font-medium leading-6 text-ink">{step.situationPt ?? step.prompt}</p>
        {isOpen && step.productionHintPt ? (
          <p className="mt-1.5 text-sm leading-5 text-ink-soft" data-production-goal>
            {step.productionHintPt}
          </p>
        ) : showPattern ? (
          <span className="sr-only" data-production-goal>
            Use o padrão e escreva a frase.
          </span>
        ) : (
          <span className="sr-only" data-production-goal>
            Escreva a frase completa.
          </span>
        )}
      </div>

      {showPattern ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Use este padrão
          </div>
          <p className="mt-1 hanzi text-xl font-semibold text-ink">{step.patternPt}</p>
          {showStructure ? (
            <StructureHowItWorks
              patternPt={step.patternPt}
              slots={step.patternSlots}
              lessonId={lessonId}
              frameId={step.productionFrameId}
              forceOpen
            />
          ) : !isOpen ? (
            <div data-production-scaffold>
              <PatternSlotScaffold
                slots={step.patternSlots}
                patternPt={undefined}
                lessonId={lessonId}
                frameId={step.productionFrameId}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showVocab ? (
        <section className="mt-3" data-production-help-vocab>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Palavras úteis
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {vocabHints.map((item) => (
              <li key={item.hanzi} className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5">
                <span className="hanzi text-base font-semibold text-ink">{item.hanzi}</span>
                {item.meaningPt ? (
                  <span className="mt-0.5 block text-[11px] text-ink-mute">{item.meaningPt}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {answerSection}
      {!locked ? helpMeta : null}
      {feedbackPanel}
      {otherAnswersPanel}

      {!locked && (
        <EngineActions
          canCheck={(showBuild ? buildPicked.length > 0 : false) || draft.trim().length > 0}
          onCheck={check}
          onSkip={onSkip}
        />
      )}
    </div>
  );
}

/**
 * Reparo conversacional em duas fases: primeiro o aluno escolhe o MOVIMENTO
 * (repetir, simplificar, pedir de novo, assumir que não entendeu) e só depois
 * produz a fala. Escolher a estratégia certa e não conseguir dizê-la são
 * falhas diferentes — por isso as duas fases existem.
 */
function StepConversationRepair({ step, onDone, onSkip, onMistake }: StepProps) {
  const soundEffects = useStore((s) => s.soundEffects);
  const strategies = useMemo(() => step.repairStrategyOptions ?? [], [step.repairStrategyOptions]);
  const model = step.correctAnswer ?? step.answer ?? "";
  const acceptedAnswers = useMemo(
    () => uniqueStrings([model, ...(step.accepts ?? [])]),
    [model, step.accepts]
  );
  const [pickedStrategy, setPickedStrategy] = useState<RepairStrategy | null>(null);
  const [strategyLocked, setStrategyLocked] = useState(false);
  const [strategyMissed, setStrategyMissed] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<EngineFeedback>(null);
  const [hadMistake, setHadMistake] = useState(false);
  const locked = feedback === "correct";

  function chooseStrategy(strategy: RepairStrategy) {
    if (strategyLocked) return;
    setPickedStrategy(strategy);
    if (strategy === step.repairStrategy) {
      setStrategyLocked(true);
      playSoundFx("success", soundEffects);
      return;
    }
    setStrategyMissed(true);
    setHadMistake(true);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  function check() {
    const candidate = draft.trim();
    if (!candidate || locked) return;
    const normalized = normalizeEngineAnswer(candidate);
    if (acceptedAnswers.some((accepted) => normalizeEngineAnswer(accepted) === normalized)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    setHadMistake(true);
    setFeedback("wrong");
    onMistake?.(candidate);
    if (!onMistake) playSoundFx("error", soundEffects);
  }

  return (
    <div>
      <Eyebrow>Reparo</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold sm:text-xl text-ink">
        {step.title ?? "A conversa travou"}
      </h2>

      <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          A pessoa diz
        </div>
        <div className="mt-1 hanzi text-2xl text-ink">
          <ExerciseText value={step.repairNpcHanzi ?? ""} type="hanzi" speakOnClick />
        </div>
        {step.repairNpcPinyin && <Pinyin text={step.repairNpcPinyin} className="mt-0.5 text-sm" />}
        {step.repairNpcPt && <p className="mt-1 text-sm text-ink-soft">{step.repairNpcPt}</p>}
      </div>

      <p className="mt-3.5 text-sm leading-6 text-ink-soft">{step.prompt}</p>
      <div className="mt-2 grid gap-2">
        {strategies.map((strategy) => {
          const chosen = pickedStrategy === strategy;
          const isRight = strategy === step.repairStrategy;
          const tone = strategyLocked && isRight ? "good" : chosen && !isRight ? "wrong" : chosen ? "active" : "idle";
          return (
            <button
              key={strategy}
              type="button"
              disabled={strategyLocked}
              onClick={() => chooseStrategy(strategy)}
              className={[
                "rounded-2xl border p-3 text-left text-sm font-medium transition",
                tone === "good"
                  ? "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
                  : tone === "wrong"
                    ? "border-accent-soft bg-accent-soft/45 text-accent"
                    : tone === "active"
                      ? "border-accent bg-surface-2 text-ink"
                      : "border-line bg-surface-2 text-ink hover:border-accent-soft",
                strategyLocked ? "cursor-default" : "",
              ].join(" ")}
            >
              {REPAIR_STRATEGY_LABELS[strategy]}
            </button>
          );
        })}
      </div>
      {strategyMissed && !strategyLocked && (
        <p className="mt-2 text-sm text-accent">
          Esse movimento não resolve aqui. Leia de novo o que a pessoa disse e escolha outro.
        </p>
      )}

      {strategyLocked && (
        <>
          <div className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Agora diga</div>
            <p className="mt-1 text-base leading-6 text-ink">
              {REPAIR_STRATEGY_LABELS[step.repairStrategy ?? "repeat"]} — em mandarim, sem alternativas.
            </p>
          </div>
          <FreeAnswerField
            value={draft}
            onChange={(next) => {
              setDraft(next);
              if (feedback !== "correct") setFeedback(null);
            }}
            disabled={locked}
            placeholder="Escreva em hànzì ou pinyin…"
            onSubmit={check}
          />
        </>
      )}

      <EngineFeedbackPanel
        status={feedback}
        model={feedback === "wrong" || hadMistake || locked ? model : undefined}
        explanation={step.explanation}
        hadMistake={hadMistake}
        deferMistakeToParent={Boolean(onMistake)}
        onRetry={() => {
          setDraft("");
          setFeedback(null);
        }}
        onContinue={() => onDone(!hadMistake)}
      />

      {!locked && strategyLocked && (
        <EngineActions canCheck={draft.trim().length > 0} onCheck={check} onSkip={onSkip} />
      )}
      {!strategyLocked && <SkipStepButton onSkip={onSkip} className="mt-4" />}
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

export function StepRenderer({ step, onDone, onSkip, onMistake, onUnrecognized, lessonId, attemptSeed }: StepProps) {
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
    if (personalizedStep.pedagogyVariant === "audio_same_different") {
      return <StepAudioSameDifferent step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
    }
    if (personalizedStep.pedagogyVariant === "dragon_dictation" && personalizedStep.kind === "write") {
      return <StepDragonDictation step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
    }
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
      case "sentence_build":
        return (
          <StepSentenceBuild
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "translation_build":
        return (
          <StepTranslationBuild
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "fill_blank": return <StepFillBlank step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "dialogue_choice": return <StepDialogueChoice step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "conversation_scene": return <ConversationSceneStep step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "hanzi_build":
        return (
          <StepHanziBuild
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "tone_pair": return <StepTonePair step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "image_choice": return <StepImageChoice step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "compare_with_image": return <StepCompareWithImage step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "audio_discrimination": return <StepAudioDiscrimination step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
      case "dictation":
        return (
          <StepDictation
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "odd_one_out":
        return (
          <StepOddOneOut
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "spot_error":
        return (
          <StepSpotError
            step={personalizedStep}
            onDone={onDone}
            onSkip={onSkip}
            onMistake={handleMistake}
            lessonId={lessonId}
            attemptSeed={attemptSeed}
          />
        );
      case "free_production":
      case "transfer_task": return <StepFreeProduction step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} onUnrecognized={onUnrecognized} lessonId={lessonId} />;
      case "conversation_repair": return <StepConversationRepair step={personalizedStep} onDone={onDone} onSkip={onSkip} onMistake={handleMistake} />;
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
