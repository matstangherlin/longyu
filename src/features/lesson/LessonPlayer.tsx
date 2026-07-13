import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, getLesson, type LessonStep, type Skill, type StepKind } from "../../data/journey";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import { canAccessLesson } from "../../lib/journeyUnlocks";
import { canStartLesson, canUseUnlimitedRetry, useIsPro } from "../../lib/proAccess";
import {
  DAILY_GOAL_PER_TRACK,
  useStore,
  type ActivityErrorRecord,
  type ActivityErrorSkill,
  type ActivityReviewTarget,
  type LessonAttemptRecord,
  type LessonMistakeRecord,
  type LessonStar,
  type MistakeSourceSkill,
  type RewardGrant,
  type Track,
} from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import type { ReviewDomain } from "../../lib/srs";
import { buildMissionViews, isMissionActionable, MONTHLY_GOAL, type MissionView } from "../../data/missions";
import {
  BREATH_LIVES,
  BREATH_RECOVERY_QI,
  DAILY_GOAL_QI,
  LESSON_BASE_XP,
  LESSON_NO_SKIP_QI,
  LESSON_THREE_STAR_QI,
  LESSON_THREE_STAR_XP_BONUS,
  MODULE_REVIEW_PASS_ACCURACY,
  PRO_LESSON_QI_BONUS,
  RETRY_QUESTION_QI,
} from "../../data/economy";
import { speak } from "../../lib/tts";
import { playSoundFx } from "../../lib/soundFx";
import { Card, Button, ProgressBar } from "../../components/ui/primitives";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { IconCheck, IconChevron, IconFlame, IconHanzi, IconLibrary, IconRefresh, IconShield, IconSound, IconStar, IconTarget, IconX } from "../../components/ui/Icon";
import { Mascot } from "../../components/brand/Mascot";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { StepRenderer, type PairMistakePayload } from "./steps";
import { DragonBreathMeter, LessonFocusHeader } from "./LessonFocusHeader";
import {
  completedLessonStagesFromRoundStep,
  type LessonTask,
  lessonRoundProgressForStep,
  type LessonRoundStep,
  lessonRoundStepsFor,
  lessonTasksFor,
} from "./lessonTasks";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import { useProOffer } from "../../hooks/useProOffer";
import { leagueXpKeyLesson } from "../../lib/leagueXpKeys";
import { requiredToneTrainerPackForLesson, toneTrainerPackCompleted } from "../../data/toneTrainer";
import { enrichMatchPairsStep } from "../../data/adaptivePairs";
import { buildImmediateRemediationExercise, normalizeRemediationAnswer } from "./immediateRemediation";
import { getPendingAttemptReview } from "./lessonAttemptReview";
import { installLessonRecoveryDebugHelpers } from "./lessonRecoveryDebug";
import { canCompleteLesson, computeLessonStars as lessonStars, requiredStarsForLesson } from "./lessonStarRules";

const SKILL_TRACK: Record<Skill, Track> = {
  som: "som",
  fala: "fala",
  hanzi: "hanzi",
  leitura: "leitura",
  sistema: "hanzi",
};

const GRADED_STEP_KINDS: StepKind[] = [
  "tone",
  "comprehend",
  "produce",
  "recognize",
  "write",
  "match_pairs",
  "listen_select",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "conversation_scene",
  "hanzi_build",
  "tone_pair",
  "image_choice",
];

function isGradedStep(step: LessonStep): boolean {
  return GRADED_STEP_KINDS.includes(step.kind) && !(step.kind === "write" && step.mode === "free_reflection");
}

const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const charById = new Map(CHARACTERS.map((char) => [char.id, char]));

interface LessonMistake {
  prompt: string;
  correction: string;
  detail?: string;
}

type LessonReviewTarget = ActivityReviewTarget;

interface ActivityError extends ActivityErrorRecord {
  type: StepKind | "pair-match";
  step: LessonStep;
}

type ErrorReviewMode = "idle" | "offer" | "review" | "summary" | "dismissed" | "recovered";

function lessonRecoveryDebugPanelEnabled(): boolean {
  const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("longyu:lesson-recovery-debug") === "1";
  } catch {
    return false;
  }
}

function LessonRecoveryDevPanel({
  lessonId,
  stars,
  pendingErrors,
  recoveredErrors,
  nextUnlockLabel,
}: {
  lessonId: string;
  stars: number;
  pendingErrors: number;
  recoveredErrors: number;
  nextUnlockLabel: string;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-dashed border-accent-soft bg-surface-2 px-3 py-2 text-left text-xs text-ink-soft">
      <div className="font-semibold text-ink">DEV revisão da lição</div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <span>
          lessonId: <code className="text-ink">{lessonId}</code>
        </span>
        <span>estrelas: {stars}/3</span>
        <span>erros pendentes: {pendingErrors}</span>
        <span>erros recuperados: {recoveredErrors}</span>
        <span className="sm:col-span-2">próxima lição: {nextUnlockLabel}</span>
      </div>
    </div>
  );
}

function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}

function findChunkByText(text: string | undefined) {
  if (!text) return undefined;
  const normalized = normalizeHanzi(text);
  return CHUNKS.find((chunk) => normalizeHanzi(chunk.hanzi) === normalized);
}

function charsInText(text: string | undefined) {
  if (!text) return [];
  return [...normalizeHanzi(text)]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
}

function correctionForStep(step: LessonStep): LessonMistake {
  if (step.kind === "tone") {
    return {
      prompt: step.hanzi ? `Tom de ${step.hanzi}` : "Tom",
      correction: `${step.tone}º tom`,
      detail: step.pinyin,
    };
  }
  if (step.kind === "comprehend") {
    return {
      prompt: step.hanzi ?? "Compreensão",
      correction: step.answer ?? "Reveja a resposta correta",
      detail: step.pinyin,
    };
  }
  if (step.kind === "produce") {
    return {
      prompt: step.pt ?? "Produção",
      correction: step.target?.join("") ?? "Reveja a ordem correta",
    };
  }
  if (step.kind === "recognize") {
    const char = CHARACTERS.find((candidate) => candidate.id === step.charId);
    return {
      prompt: char?.hanzi ?? "Caractere",
      correction: char?.meaningPt ?? "Reveja o significado",
      detail: char?.pinyin,
    };
  }
  if (step.kind === "write") {
    return {
      prompt: step.title ?? "Resposta curta",
      correction: step.answer ?? "Compare com a resposta modelo",
    };
  }
  if (step.kind === "match_pairs" || step.kind === "tone_pair") {
    return {
      prompt: step.title ?? "Combine os pares",
      correction: step.pairs?.map((pair) => `${pair.left} = ${pair.right}`).join(" | ") ?? "Revise os pares corretos",
      detail: step.explanation,
    };
  }
  if (
    step.kind === "listen_select" ||
    step.kind === "sentence_build" ||
    step.kind === "translation_build" ||
    step.kind === "fill_blank" ||
    step.kind === "dialogue_choice" ||
    step.kind === "conversation_scene" ||
    step.kind === "hanzi_build" ||
    step.kind === "image_choice"
  ) {
    return {
      prompt:
        step.prompt ??
        step.dialoguePrompt ??
        step.checkpoint?.prompt ??
        step.title ??
        "Exercício",
      correction:
        step.correctAnswer ??
        step.checkpoint?.correctAnswer ??
        step.answer ??
        step.blankAnswer ??
        step.targetParts?.join("") ??
        "Revise a resposta correta",
      detail: step.explanation ?? step.checkpoint?.explanation,
    };
  }
  return {
    prompt: step.title ?? "Atividade",
    correction: step.answer ?? step.pt ?? "Reveja este ponto na próxima tentativa",
  };
}

function LessonSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-line bg-surface-2 px-3 py-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1.5 truncate font-serif text-lg font-semibold text-ink sm:text-xl">{value}</div>
    </div>
  );
}

// Chip compacto para as métricas do fim de lição (XP, Qi, precisão, estrelas).
// Substitui os cards grandes: a mesma informação em uma linha, estilo app.
function MetricChip({
  value,
  label,
  icon,
  tone = "neutral",
}: {
  value: string;
  label?: string;
  icon?: ReactNode;
  tone?: "neutral" | "accent" | "good" | "gold";
}) {
  const toneClass = {
    neutral: "border-line bg-surface-2 text-ink",
    accent: "border-accent-soft bg-accent-soft/60 text-accent",
    good: "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
    gold: "border-[#B7791F]/25 bg-[#B7791F]/[0.1] text-gold",
  }[tone];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-card",
        toneClass,
      ].join(" ")}
    >
      {icon}
      <span className="font-serif tabular-nums">{value}</span>
      {label && <span className="text-xs font-medium opacity-80">{label}</span>}
    </span>
  );
}

function CollapsibleInfoCard({
  title,
  defaultOpen = false,
  compactLabel,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  compactLabel?: string;
  children: ReactNode;
}) {
  return (
    <details
      className="rounded-[20px] border border-line bg-surface/85 p-3 text-left shadow-card"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
        <span>{title}</span>
        <span className="text-xs font-medium text-ink-faint">{compactLabel ?? "Toque para expandir"}</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function progressSaveLabel(
  authMode: "local" | "cloud_pending" | "cloud",
  syncStatus: ReturnType<typeof useStore.getState>["cloudSyncState"]["status"]
): string {
  if (authMode === "cloud") {
    if (syncStatus === "pending" || syncStatus === "loading") return "Sincronizando progresso...";
    if (syncStatus === "error") return "Progresso local seguro";
    return "Progresso salvo na nuvem";
  }
  return "Progresso salvo neste dispositivo";
}

function roundKindSet(step: LessonRoundStep, stage?: LessonTask): Set<StepKind> {
  return new Set([...(step.exercises ?? []), ...(stage?.stepKinds ?? []), step.kind]);
}

function roundSummary(step: LessonRoundStep, stage?: LessonTask): string {
  const kinds = roundKindSet(step, stage);
  const hasOldVocabulary = Boolean(step.reusesPreviousVocabulary?.length);
  const hasTone = kinds.has("tone") || kinds.has("tone_pair");
  const hasPinyin = hasTone || kinds.has("dialogue_choice") || kinds.has("listen_select");
  const hasHanzi = kinds.has("hanzi_build") || kinds.has("recognize") || kinds.has("decompose") || kinds.has("hanzi_evolution");
  const hasAssembly = kinds.has("sentence_build") || kinds.has("translation_build") || kinds.has("fill_blank") || kinds.has("produce");

  if (step.lessonStageId === "consolidation") {
    if (hasTone && hasOldVocabulary) return "Vamos misturar tons e palavras que você já viu.";
    if (hasHanzi && hasOldVocabulary) return "Vamos reconhecer hànzì junto com conteúdo antigo.";
    if (hasOldVocabulary) return "Revisão rápida com palavras que já apareceram.";
    return "Vamos fixar o ponto principal antes de seguir.";
  }
  if (hasTone && hasOldVocabulary) return "Vamos misturar tons e palavras que você já viu.";
  if (hasTone) return "Escute o contorno e ligue som, tom e pinyin.";
  if (hasPinyin) return "Use o pinyin como ponte para reconhecer o som.";
  if (hasHanzi) return "Observe a forma e conecte hànzì, som e sentido.";
  if (hasAssembly) return "Monte a frase em pedaços curtos.";
  if (kinds.has("dialogue_choice") || kinds.has("conversation_scene")) return "Escolha a resposta que combina com a situação.";
  if (kinds.has("microread")) return "Leia um trecho curto e procure o sentido geral.";
  return "Pratique este ponto em uma rodada curta.";
}

const VICTORY_TITLES = [
  "A jornada continua!",
  "Etapa concluída!",
  "Seu dragão ficou mais forte!",
  "Você dominou mais um passo!",
  "Mandarim ficando mais claro!",
];

const STREAK_MILESTONES = [3, 7, 14, 30];
const DRAGON_BREATH_LIVES = BREATH_LIVES;
const BREATH_RECOVERY_QI_COST = BREATH_RECOVERY_QI;
const RETRY_COST_QI = RETRY_QUESTION_QI;

type FinishReason = "completed" | "out_of_lives";

function totalToday(today: Record<Track, number>): number {
  return today.som + today.fala + today.hanzi + today.leitura;
}

function rewardLabel(reward: RewardGrant): string {
  if (reward.type === "qi") return `Qi do Dragão x${reward.amount}`;
  if (reward.type === "dragonPearl") return `Pérolas do Dragão x${reward.amount}`;
  if (reward.type === "streakShield") return `Escudo de sequência x${reward.amount}`;
  return reward.source;
}

function rewardIcon(reward: RewardGrant): string {
  if (reward.type === "qi") return "气";
  if (reward.type === "dragonPearl") return "珠";
  if (reward.type === "streakShield") return "盾";
  return "章";
}

function nextStreakMilestone(streak: number): number {
  return STREAK_MILESTONES.find((mark) => mark > streak) ?? 30;
}

function dayCountLabel(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function uniqueLessonReviewTargets(targets: LessonReviewTarget[]): LessonReviewTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.type}:${target.itemId}:${target.domain}:${target.track}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function textReviewTargets(text: string | undefined, domain: ReviewDomain, track: Track): LessonReviewTarget[] {
  const targets: LessonReviewTarget[] = [];
  const chunk = findChunkByText(text);
  if (chunk) targets.push({ type: "chunk", itemId: chunk.id, domain, track });
  for (const char of charsInText(text)) targets.push({ type: "char", itemId: char.id, domain, track });
  return targets;
}

function reviewTargetsForMistake(step: LessonStep, track: Track): LessonReviewTarget[] {
  const targets: LessonReviewTarget[] = [];
  const addText = (text: string | undefined, domain: ReviewDomain, sourceTrack: Track = track) => {
    targets.push(...textReviewTargets(text, domain, sourceTrack));
  };

  if (step.kind === "tone") {
    addText(step.hanzi, "som", "som");
    addText(step.hanzi, "pinyin", "som");
  }
  if (step.kind === "comprehend") addText(step.hanzi ?? step.answer, "significado");
  if (step.kind === "produce") {
    const text = step.target?.join("");
    addText(text, "uso");
    addText(text, "fala");
  }
  if (step.kind === "recognize" && step.charId) {
    targets.push({ type: "char", itemId: step.charId, domain: "significado", track });
  }
  if (step.kind === "write") {
    if (step.chunkId) {
      targets.push({ type: "chunk", itemId: step.chunkId, domain: "uso", track });
      targets.push({ type: "chunk", itemId: step.chunkId, domain: "significado", track });
    }
    addText(step.answer, "uso");
  }
  if (step.kind === "match_pairs" || step.kind === "tone_pair") {
    const domain: ReviewDomain = step.kind === "tone_pair" ? "som" : "significado";
    const sourceTrack: Track = step.kind === "tone_pair" ? "som" : track;
    for (const pair of step.pairs ?? []) {
      if (pair.reviewType && pair.reviewItemId) {
        targets.push({ type: pair.reviewType, itemId: pair.reviewItemId, domain, track: sourceTrack });
      }
      addText(pair.left, domain, sourceTrack);
      addText(pair.right, domain, sourceTrack);
    }
  }
  if (step.kind === "listen_select") {
    addText(step.audioText ?? step.correctAnswer, "som", "som");
    addText(step.audioText ?? step.correctAnswer, "pinyin", "som");
    addText(step.correctAnswer, "significado");
  }
  if (step.kind === "image_choice") {
    const hanzi = step.targetHanzi ?? step.hanzi;
    const mode = step.imageChoiceMode;
    if (mode === "listen_and_choose_image" || mode === "choose_pinyin") {
      addText(hanzi, "som", "som");
      addText(hanzi, "pinyin", "som");
    }
    if (mode === "choose_hanzi" || mode === "choose_image" || mode === "listen_and_choose_image") {
      addText(hanzi, "forma", "hanzi");
    }
    addText(hanzi, "significado");
  }
  if (step.kind === "dialogue_choice" && isPinyinOrToneChoiceStep(step)) {
    const source = step.sourceText ?? step.hanzi ?? step.audioText;
    addText(source, "pinyin", "som");
    addText(source, "som", "som");
  }
  if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "dialogue_choice" || step.kind === "conversation_scene") {
    const text = step.correctAnswer ?? step.checkpoint?.correctAnswer ?? step.answer ?? step.targetParts?.join("");
    addText(text, "uso");
    addText(text, "fala");
    if (step.kind === "conversation_scene") {
      for (const line of step.lines ?? []) addText(line.hanzi, "uso");
    }
  }
  if (step.kind === "fill_blank") {
    addText(step.correctAnswer ?? step.answer ?? `${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`, "uso");
  }
  if (step.kind === "hanzi_build") {
    addText(step.correctAnswer ?? step.answer, "forma", "hanzi");
    addText(step.targetParts?.join(""), "forma", "hanzi");
  }

  return uniqueLessonReviewTargets(targets);
}

function activityErrorSkillForStep(step: LessonStep): ActivityErrorSkill {
  if (step.kind === "tone" || step.kind === "listen_select" || step.kind === "tone_pair") return "som";
  if (step.kind === "image_choice") {
    const mode = step.imageChoiceMode;
    if (mode === "choose_pinyin" || mode === "listen_and_choose_image") return "pinyin";
    if (mode === "choose_hanzi" || mode === "choose_image") return "forma";
    return "significado";
  }
  if (step.kind === "dialogue_choice" && isPinyinOrToneChoiceStep(step)) return "pinyin";
  if (step.kind === "recognize" || step.kind === "decompose" || step.kind === "hanzi_build") return "forma";
  if (step.kind === "comprehend" || step.kind === "match_pairs") return "significado";
  if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "produce" || step.kind === "fill_blank" || step.kind === "dialogue_choice" || step.kind === "conversation_scene") return "uso";
  if (step.kind === "microread") return "leitura";
  if (step.kind === "write") return "uso";
  return "fala";
}

function sourceSkillForActivitySkill(skill: ActivityErrorSkill, lessonSkill: Skill): MistakeSourceSkill {
  if (skill === "som") return "som";
  if (skill === "fala") return "fala";
  if (skill === "pinyin") return "pinyin";
  if (skill === "leitura") return "leitura";
  if (skill === "forma" || skill === "hanzi") return "hanzi";
  if (lessonSkill === "som") return "som";
  if (lessonSkill === "fala") return "fala";
  if (lessonSkill === "hanzi") return "hanzi";
  if (lessonSkill === "leitura") return "leitura";
  return "grammar";
}

function displayTextHasHanzi(value: string | undefined): boolean {
  return Boolean(value && charsInText(value).length > 0);
}

function hasPinyinToneMark(value: string | undefined): boolean {
  return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu.test(value ?? "");
}

function isPinyinOrToneChoiceStep(step: LessonStep): boolean {
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""}`.toLocaleLowerCase("pt-BR");
  const options = [step.correctAnswer, step.answer, step.pinyin, step.sourcePinyin, ...(step.options ?? [])];
  return (
    label.includes("pinyin") ||
    label.includes("acento") ||
    (label.includes("tom") && options.some(hasPinyinToneMark)) ||
    options.filter(hasPinyinToneMark).length >= 2
  );
}

function errorHanziForStep(step: LessonStep): string | undefined {
  if (step.hanzi) return step.hanzi;
  if (step.charId) return charById.get(step.charId)?.hanzi;
  if (step.kind === "conversation_scene") {
    const lineHanzi = step.lines?.map((line) => line.hanzi).filter(Boolean).join(" / ");
    if (lineHanzi) return lineHanzi;
  }
  if (displayTextHasHanzi(step.sourceText)) return step.sourceText;
  if (displayTextHasHanzi(step.correctAnswer)) return step.correctAnswer;
  if (displayTextHasHanzi(step.answer)) return step.answer;
  const target = step.target?.join("") ?? step.targetParts?.join("");
  return displayTextHasHanzi(target) ? target : undefined;
}

function errorPinyinForStep(step: LessonStep): string | undefined {
  if (step.pinyin) return step.pinyin;
  if (step.sourcePinyin) return step.sourcePinyin;
  if (step.charId) return charById.get(step.charId)?.pinyin;
  const hanzi = errorHanziForStep(step);
  const chunk = findChunkByText(hanzi);
  if (chunk?.pinyin) return chunk.pinyin;
  const chars = charsInText(hanzi);
  if (chars.length > 0) return chars.map((char) => char.pinyin).join(" ");
  return undefined;
}

function errorMeaningForStep(step: LessonStep, correction: LessonMistake): string | undefined {
  if (step.sourceMeaning) return step.sourceMeaning;
  if (step.pt) return step.pt;
  if (step.kind === "comprehend") return correction.correction;
  const hanzi = errorHanziForStep(step);
  const chunk = findChunkByText(hanzi);
  if (chunk) return chunk.meaningPt;
  const chars = charsInText(hanzi);
  if (chars.length === 1) return chars[0].meaningPt;
  return undefined;
}

function errorTokensForStep(step: LessonStep): string[] {
  const values = [
    step.hanzi,
    step.sourceText,
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    step.audioText,
    step.charId ? charById.get(step.charId)?.hanzi : undefined,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ];
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const clean = normalizeHanzi(value);
    if (clean) tokens.add(clean);
    for (const char of charsInText(value)) tokens.add(char.hanzi);
  }
  return [...tokens].slice(0, 12);
}

function mistakeReasonForStep(step: LessonStep): string {
  if (step.kind === "tone" || step.kind === "tone_pair") return "Confusão de tom ou contorno sonoro.";
  if (step.kind === "listen_select") return "Confusão ao reconhecer o áudio.";
  if (step.kind === "dialogue_choice" && isPinyinOrToneChoiceStep(step)) return "Confusão de pinyin ou acento tonal.";
  if (step.kind === "match_pairs") return "Par de significado ou forma não consolidado.";
  if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "produce") {
    return "Ordem ou montagem da frase ainda instável.";
  }
  if (step.kind === "fill_blank") return "Chunk de uso ainda não automatizado.";
  if (step.kind === "recognize" || step.kind === "hanzi_build") return "Reconhecimento visual do hànzì ainda frágil.";
  if (step.kind === "image_choice") return "Associação visual com hànzì, pinyin ou significado ainda instável.";
  if (step.kind === "comprehend" || step.kind === "dialogue_choice" || step.kind === "conversation_scene") {
    return step.kind === "conversation_scene"
      ? "Resposta da conversa ainda insegura — revise a fala no contexto."
      : "Significado em contexto ainda incerto.";
  }
  return "Ponto precisa voltar em outro formato.";
}

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function isPairMistakePayload(payload: unknown): payload is PairMistakePayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload as PairMistakePayload).kind === "pair-match" &&
      (payload as PairMistakePayload).left &&
      (payload as PairMistakePayload).expectedRight
  );
}

function splitPairAnswer(value: string | undefined): { pinyin?: string; meaning?: string } {
  const raw = value?.trim();
  if (!raw) return {};
  const parts = raw.split("·").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { pinyin: parts[0], meaning: parts.slice(1).join(" · ") };
  return { meaning: raw };
}

function firstCharInfo(text: string | undefined) {
  const [char] = charsInText(text);
  return char;
}

function pairExpectedMeaning(payload: PairMistakePayload): string {
  return splitPairAnswer(payload.expectedRight).meaning ?? payload.expectedRight;
}

function pairUserAnswerMeaning(payload: PairMistakePayload): string {
  return splitPairAnswer(payload.userAnswer).meaning ?? payload.userAnswer;
}

function pairPinyin(payload: PairMistakePayload): string | undefined {
  return splitPairAnswer(payload.expectedRight).pinyin ?? firstCharInfo(payload.left)?.pinyin;
}

function pairExplanation(payload: PairMistakePayload): string {
  const char = firstCharInfo(payload.left);
  if (char?.mnemonicPt) return char.mnemonicPt;
  const meaning = pairExpectedMeaning(payload);
  if (payload.left === "木") return "木 representa uma árvore. Ele também aparece como componente em 林 e 森.";
  if (payload.left === "人") return "人 representa uma pessoa e aparece em palavras sobre gente, como 巴西人.";
  if (payload.left === "口") return "口 lembra uma boca ou abertura e aparece em caracteres ligados à fala.";
  if (payload.left === "水") return "水 representa água; como componente, costuma apontar para líquido.";
  if (payload.left === "火") return "火 representa fogo, calor ou luz.";
  if (payload.left === "山") return "山 representa montanha.";
  if (payload.left === "日") return "日 representa sol ou dia.";
  if (payload.left === "月") return "月 pode significar lua ou mês.";
  return `${payload.left} significa ${meaning}.`;
}

function ImmediateErrorReviewOffer({
  count,
  correct,
  total,
  canRecover,
  onStart,
  onLater,
}: {
  count: number;
  correct: number;
  total: number;
  canRecover: boolean;
  onStart: () => void;
  onLater: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-xl flex-col pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <section className="flex flex-1 flex-col rounded-[30px] border border-accent-soft bg-surface px-5 py-6 text-center shadow-lift sm:p-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconRefresh width={30} height={30} />
        </div>
        <div className="mx-auto mt-5 inline-flex rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold text-ink">
          Você acertou {correct} de {total}
        </div>
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink">
          {canRecover
            ? `Você errou ${count} ${count === 1 ? "item" : "itens"}. Corrija agora para recuperar 3 estrelas.`
            : `Você errou ${count} ${count === 1 ? "item" : "itens"}. Quer revisar agora?`}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-soft">
          A correção usa exatamente o que você errou nesta tentativa.
        </p>
        {canRecover && (
          <div className="mt-5 rounded-2xl border border-accent-soft bg-accent-soft/45 px-4 py-3 text-sm font-medium text-accent">
            Corrija todos para recuperar a 3ª estrela e liberar a próxima lição.
          </div>
        )}
        <div className="mt-auto grid gap-2 pt-6">
          <Button size="lg" className="w-full shadow-lift" onClick={onStart}>
            Revisar erros agora <IconChevron width={18} height={18} />
          </Button>
          <Button variant="outline" className="w-full" onClick={onLater}>
            Continuar com 2 estrelas
          </Button>
        </div>
      </section>
    </div>
  );
}

function ImmediateErrorReviewSummary({
  corrected,
  remaining,
  canRetryLesson,
  onReviewAgain,
  onContinue,
  onRetryLesson,
}: {
  corrected: number;
  remaining: number;
  canRetryLesson: boolean;
  onReviewAgain: () => void;
  onContinue: () => void;
  onRetryLesson: () => void;
}) {
  const stillMissing = remaining > 0;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-xl flex-col pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <section className="flex flex-1 flex-col rounded-[30px] border border-line bg-surface px-5 py-6 text-center shadow-lift sm:p-7">
        <div
          className={[
            "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
            stillMissing ? "bg-accent-soft text-accent" : "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
          ].join(" ")}
        >
          {stillMissing ? <IconRefresh width={30} height={30} /> : <IconCheck width={30} height={30} />}
        </div>
        <h1 className="mt-5 font-serif text-3xl font-semibold text-ink">
          {stillMissing ? "Ainda falta revisar" : "Erros corrigidos!"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {stillMissing
            ? `Você ainda pode voltar e corrigir seus erros para buscar 3 estrelas. Falta${remaining === 1 ? "" : "m"} ${remaining} ${remaining === 1 ? "erro" : "erros"}.`
            : "Você corrigiu tudo desta tentativa."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <LessonSummaryStat label="Corrigidos" value={`${corrected}`} />
          <LessonSummaryStat label="Ainda revisar" value={`${remaining}`} />
        </div>
        <div className="mt-auto grid gap-2 pt-6">
          {stillMissing && (
            <Button size="lg" className="w-full shadow-lift" onClick={onReviewAgain}>
              <IconRefresh width={17} height={17} /> Tentar revisão novamente
            </Button>
          )}
          {canRetryLesson && (
            <Button variant="outline" className="w-full" onClick={onRetryLesson}>
              <IconRefresh width={17} height={17} /> Refazer lição
            </Button>
          )}
          <Button
            variant={stillMissing ? "outline" : "primary"}
            size={stillMissing ? undefined : "lg"}
            className="w-full"
            onClick={onContinue}
          >
            {stillMissing ? "Continuar com 2 estrelas" : "Continuar jornada"}
            <IconChevron width={18} height={18} />
          </Button>
        </div>
      </section>
    </div>
  );
}

function ErrorReviewQuestion({
  error,
  index,
  total,
  onCorrect,
  onNeedsMoreReview,
  onNext,
}: {
  error: ActivityError;
  index: number;
  total: number;
  onCorrect: (error: ActivityError) => void;
  onNeedsMoreReview: (error: ActivityError) => void;
  onNext: () => void;
}) {
  // Correção central: fiel ao erro real da tentativa atual.
  const exercise = useMemo(() => buildImmediateRemediationExercise(error), [error]);
  const answer = exercise.answer;
  const options = exercise.options ?? [];
  const pieces = exercise.pieces ?? [];
  const isBuild = exercise.kind === "build";
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedPieces, setPickedPieces] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const answeredRef = useRef(false);
  const answered = feedback !== null;
  const pinyinWouldCueAnswer = exercise.kind === "tone" || exercise.kind === "listen" || error.type === "tone_pair";
  const showPromptPinyin = Boolean(exercise.displayPinyin && (!pinyinWouldCueAnswer || answered));
  const remainingForRecovery = total - index;

  useEffect(() => {
    setSelected(null);
    setPickedPieces([]);
    setFeedback(null);
    answeredRef.current = false;
  }, [error.id]);

  const builtAnswer = pickedPieces.join(exercise.pieceJoin);
  const answerDisplay = exercise.answerDisplay ?? exercise.answer;
  const displayIsHanzi = displayTextHasHanzi(exercise.display);

  function checkChoice(value: string) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setSelected(value);
    const correct = normalizeRemediationAnswer(value) === normalizeRemediationAnswer(answer);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) onCorrect(error);
    else onNeedsMoreReview(error);
  }

  function checkBuild() {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const correct = normalizeRemediationAnswer(builtAnswer) === normalizeRemediationAnswer(answer);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) onCorrect(error);
    else onNeedsMoreReview(error);
  }

  function playReviewAudio() {
    speak(exercise.audioText ?? error.hanzi ?? error.correctAnswer, { rate: 0.86 });
  }

  return (
    <Card className="flex min-h-[calc(100dvh-6.25rem)] flex-col p-4 sm:min-h-0 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          Erro {index + 1} de {total}
        </span>
        <span className="text-xs font-semibold text-ink-faint">{error.skill}</span>
      </div>
      <ProgressBar value={index} max={total} className="mt-3 h-2.5" />
      <div className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft">
        {remainingForRecovery === 1
          ? "Último erro para tentar recuperar a 3ª estrela."
          : `Faltam ${remainingForRecovery} erros para tentar recuperar a 3ª estrela.`}
      </div>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">{exercise.prompt}</h1>

      {exercise.kind === "blank" ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-center">
          <div className="hanzi text-2xl leading-relaxed text-ink">
            {exercise.blankBefore}
            <span className="mx-1 inline-block min-w-[2.5rem] border-b-2 border-dashed border-accent align-baseline text-accent">
              ?
            </span>
            {exercise.blankAfter}
          </div>
        </div>
      ) : exercise.display ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-center">
          {displayIsHanzi ? (
            <div className="hanzi text-4xl text-ink">{exercise.display}</div>
          ) : (
            <div className="text-base font-medium leading-6 text-ink">{exercise.display}</div>
          )}
          {showPromptPinyin && (
            <Pinyin text={exercise.displayPinyin ?? ""} className="mt-1 block font-serif text-lg text-accent" />
          )}
          {exercise.kind === "listen" && (
            <Button variant="soft" className="mt-3" onClick={playReviewAudio}>
              <IconSound width={17} height={17} /> Ouvir novamente
            </Button>
          )}
        </div>
      ) : exercise.kind === "listen" ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-center">
          <Button variant="soft" onClick={playReviewAudio}>
            <IconSound width={17} height={17} /> Ouvir novamente
          </Button>
        </div>
      ) : null}

      {isBuild ? (
        <>
          <div className="mt-5 flex min-h-[78px] flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-accent-soft bg-surface-2 p-3">
            {pickedPieces.length === 0 ? (
              <span className="text-sm font-medium text-ink-faint">toque nas peças</span>
            ) : (
              pickedPieces.map((piece, pieceIndex) => (
                <button
                  key={`${piece}-${pieceIndex}`}
                  type="button"
                  className="min-h-11 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
                  onClick={() => setPickedPieces((items) => items.filter((_, itemIndex) => itemIndex !== pieceIndex))}
                  disabled={answered}
                >
                  {piece}
                </button>
              ))
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {pieces.map((piece, pieceIndex) => (
              <button
                key={`${piece}-${pieceIndex}`}
                type="button"
                className="min-h-12 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-40"
                onClick={() => setPickedPieces((items) => [...items, piece])}
                disabled={answered}
              >
                {piece}
              </button>
            ))}
          </div>
          <Button className="mt-5 w-full" disabled={pickedPieces.length === 0 || answered} onClick={checkBuild}>
            Verificar
          </Button>
        </>
      ) : (
        <div className="mt-5 grid gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => checkChoice(option)}
              className={[
                "min-h-12 rounded-2xl border px-4 text-left text-sm font-semibold transition",
                selected === option && feedback === "correct"
                  ? "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
                  : selected === option && feedback === "wrong"
                  ? "border-transparent bg-wrong-soft text-wrong"
                  : "border-line bg-surface text-ink hover:bg-surface-2",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div
          className={[
            "mt-5 rounded-2xl border px-4 py-3 text-left text-sm",
            feedback === "correct" ? "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]" : "border-accent-soft bg-accent-soft/45 text-ink-soft",
          ].join(" ")}
        >
          <div className="font-semibold">{feedback === "correct" ? "Corrigido!" : "Ainda precisa de revisão."}</div>
          <div className="mt-1">
            Correto: <span className="font-semibold text-ink">{answerDisplay}</span>
            {exercise.displayPinyin || error.pinyin ? (
              <>
                <span className="text-ink-faint"> · </span>
                <Pinyin text={exercise.displayPinyin ?? error.pinyin ?? ""} className="text-ink-faint" />
              </>
            ) : null}
            {exercise.meaningPt ? <span className="text-ink-faint"> · {exercise.meaningPt}</span> : null}
          </div>
          {exercise.explanation && <div className="mt-1 text-ink-soft">{exercise.explanation}</div>}
        </div>
      )}

      <Button className="mt-auto w-full shadow-lift" size="lg" disabled={!feedback} onClick={onNext}>
        {index + 1 >= total ? "Ver resultado" : "Próximo erro"} <IconChevron width={18} height={18} />
      </Button>
    </Card>
  );
}

function ImmediateErrorReviewSession({
  errors,
  onCorrect,
  onNeedsMoreReview,
  onDone,
}: {
  errors: ActivityError[];
  onCorrect: (error: ActivityError) => void;
  onNeedsMoreReview: (error: ActivityError) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = errors[index];

  if (!current) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <ErrorReviewQuestion
        error={current}
        index={index}
        total={errors.length}
        onCorrect={onCorrect}
        onNeedsMoreReview={onNeedsMoreReview}
        onNext={() => {
          if (index + 1 >= errors.length) onDone();
          else setIndex((value) => value + 1);
        }}
      />
    </div>
  );
}

function MissionUpdateCard({ mission }: { mission: MissionView }) {
  const pct = Math.round((mission.progress / Math.max(1, mission.goal)) * 100);
  const stateLabel = mission.claimed
    ? "Resgatada"
    : mission.complete
      ? "Missão concluída"
      : `${pct}%`;

  return (
    <div className="longyu-reward-rise rounded-[22px] border border-line bg-surface/90 px-4 py-3 text-left shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{mission.title}</div>
          <div className="mt-1 text-xs text-ink-faint">
            {mission.progress}/{mission.goal}
          </div>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
            mission.complete && !mission.claimed
              ? "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
              : "bg-accent-soft text-accent",
          ].join(" ")}
        >
          {stateLabel}
        </span>
      </div>
      <ProgressBar value={mission.progress} max={mission.goal} className="mt-3 h-2" />
    </div>
  );
}

interface NextFocusSuggestion {
  title: string;
  desc: string;
  to: string;
  cta: string;
}

// Próxima recomendação ao fim da sessão, na ordem que mais destrava a Jornada:
// erros pendentes > tons fracos > hànzì fracos > próxima lição > revisão.
function buildNextFocus({
  remainingErrorCount,
  toneErrorCount,
  hanziErrorCount,
  nextLessonTitle,
}: {
  remainingErrorCount: number;
  toneErrorCount: number;
  hanziErrorCount: number;
  nextLessonTitle?: string;
}): NextFocusSuggestion {
  if (remainingErrorCount > 0) {
    return {
      title: "Corrigir os erros de hoje",
      desc: `${remainingErrorCount} ${remainingErrorCount === 1 ? "erro pendente" : "erros pendentes"} desta sessão entraram na revisão.`,
      to: "/revisao",
      cta: "Revisar agora",
    };
  }
  if (toneErrorCount > 0 && toneErrorCount >= hanziErrorCount) {
    return {
      title: "Reforçar tons",
      desc: "Os tons foram seu ponto mais frágil hoje. Uma rodada curta no Pinyin Lab firma o ouvido.",
      to: "/pinyin",
      cta: "Treinar tons",
    };
  }
  if (hanziErrorCount > 0) {
    return {
      title: "Reforçar hànzì",
      desc: "Monte de novo os caracteres que falharam para fixar forma e significado.",
      to: "/hanzi",
      cta: "Praticar hànzì",
    };
  }
  if (nextLessonTitle) {
    return {
      title: `Próxima lição: ${nextLessonTitle}`,
      desc: "Você está pronto para avançar na Jornada.",
      to: "/jornada",
      cta: "Continuar Jornada",
    };
  }
  return {
    title: "Revisão do dia",
    desc: "Traga de volta frases e caracteres antes que enfraqueçam.",
    to: "/revisao",
    cta: "Revisar",
  };
}

export function LessonPlayer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const foundLesson = lessonId ? getLesson(lessonId) : undefined;

  const completeLesson = useStore((s) => s.completeLesson);
  const addChest = useStore((s) => s.addChest);
  const completedLessons = useStore((s) => s.completedLessons);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const learnedChars = useStore((s) => s.learnedChars);
  const hanziBuilderProgress = useStore((s) => s.hanziBuilderProgressByChar);
  // Pro efetivo (assinatura real OU preview local) — nunca só o preview.
  const isPremium = useIsPro();
  const toneTrainer = useStore((s) => s.toneTrainer);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const cloudSyncState = useStore((s) => s.cloudSyncState);
  const today = useStore((s) => s.today);
  const streak = useStore((s) => s.streak);
  const streakShields = useStore((s) => s.streakShields);
  const badges = useStore((s) => s.badges);
  const rewardHistory = useStore((s) => s.rewardHistory);
  const claimReward = useStore((s) => s.claimReward);
  const grantLessonReward = useStore((s) => s.grantLessonReward);
  const points = useStore((s) => s.points);
  const spendQi = useStore((s) => s.spendQi);
  const soundEffects = useStore((s) => s.soundEffects);
  const lessonTaskProgress = useStore((s) => s.lessonTaskProgress);
  const setLessonTaskProgress = useStore((s) => s.setLessonTaskProgress);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const inventory = useStore((s) => s.inventory);
  const useInventoryItem = useStore((s) => s.useInventoryItem);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const markActivityErrorCorrected = useStore((s) => s.markActivityErrorCorrected);
  const recordActivityErrorReviewAttempt = useStore((s) => s.recordActivityErrorReviewAttempt);
  const setCurrentLessonAttempt = useStore((s) => s.setCurrentLessonAttempt);
  const finishLessonAttempt = useStore((s) => s.finishLessonAttempt);
  const recordLessonMistake = useStore((s) => s.recordLessonMistake);
  const markMistakeRecovered = useStore((s) => s.markMistakeRecovered);
  const recentActivityErrors = useStore((s) => s.recentActivityErrors);
  const srs = useStore((s) => s.srs);
  const lessonStarsById = useStore((s) => s.lessonStarsById);
  const lessonAttemptsById = useStore((s) => s.lessonAttemptsById);
  const missionAggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const weeklyMissions = useStore((s) => s.weeklyMissions);
  const monthlyMission = useStore((s) => s.monthlyMission);

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [lives, setLives] = useState(DRAGON_BREATH_LIVES);
  const [finished, setFinished] = useState(false);
  const [finishReason, setFinishReason] = useState<FinishReason | null>(null);
  const [answerStreak, setAnswerStreak] = useState(0);
  const [streakBurst, setStreakBurst] = useState(0);
  const [correctBurst, setCorrectBurst] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<LessonMistake[]>([]);
  const [activityErrors, setActivityErrors] = useState<ActivityError[]>([]);
  const [errorReviewMode, setErrorReviewMode] = useState<ErrorReviewMode>("idle");
  const [correctedErrorIds, setCorrectedErrorIds] = useState<string[]>([]);
  // Estrela recuperada: o aluno corrigiu TODOS os erros da tentativa atual.
  const [recovered, setRecovered] = useState(false);
  const [reviewItemsAdded, setReviewItemsAdded] = useState(0);
  const [lessonReward, setLessonReward] = useState(0);
  const [lessonXp, setLessonXp] = useState(0);
  const [postLessonXpTotal, setPostLessonXpTotal] = useState(0);
  // Resumo pedagógico da sessão: o que de fato foi praticado nesta rodada.
  const [sessionSummary, setSessionSummary] = useState<{
    phrases: number;
    newPhrases: number;
    hanzi: number;
    tones: number;
  } | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [postLessonView, setPostLessonView] = useState<"victory" | "streak">("victory");
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  // Recompensas (Qi/pérola/medalha) resgatadas no próprio card de vitória.
  const [claimedRewardCards, setClaimedRewardCards] = useState(false);
  const [proPaywallKind, setProPaywallKind] = useState<ProPaywallKind | null>(null);
  const contextualOffer = useProOffer();
  const [entryChecked, setEntryChecked] = useState(false);
  const [energyBlocked, setEnergyBlocked] = useState(false);
  // Erro aguardando decisão do aluno (abre o painel de retry e pausa o avanço).
  const [pendingMistake, setPendingMistake] = useState<LessonMistake | null>(null);
  // A tentativa atual veio de um retry pago (Qi/Pro): o erro anterior não conta.
  const [retryProtected, setRetryProtected] = useState(false);
  // Penalidade (fôlego + perfeição) já aplicada neste step — não cobrar de novo.
  const [currentStepPenaltyApplied, setCurrentStepPenaltyApplied] = useState(false);
  // Remonta o step atual quando o aluno paga para tentar de novo.
  const [stepAttempt, setStepAttempt] = useState(0);
  const currentStepHadMistakeRef = useRef(false);
  const skippedStepsRef = useRef(0);
  const retryUsesRef = useRef(0);
  const recoveryUsesRef = useRef(0);
  // Tons acertados nesta tentativa (contados no acerto real, não inferidos):
  // alimenta o resumo da sessão e a missão diária de tons sem creditar steps
  // não respondidos (out_of_lives) nem sofrer com a poda do histórico de erros.
  const toneHitsRef = useRef(0);
  const mistakeReviewTargetsRef = useRef<LessonReviewTarget[]>([]);
  const activityErrorsRef = useRef<ActivityError[]>([]);
  const attemptIdRef = useRef<string | null>(null);
  const attemptStartedAtRef = useRef<number>(Date.now());
  const recordedMistakeStepRef = useRef<number | null>(null);
  const recordedPairMistakesRef = useRef<Set<string>>(new Set());
  // Garante que a recuperação da tentativa rode uma única vez (sem duplicar
  // conclusão, XP/Qi, missão ou baú).
  const recoveryAppliedRef = useRef(false);
  const pendingReviewRestoredRef = useRef(false);
  const requiredTonePack = foundLesson ? requiredToneTrainerPackForLesson(foundLesson.id) : undefined;
  const toneLocked = Boolean(
    foundLesson &&
    !completedLessons.includes(foundLesson.id) &&
    requiredTonePack &&
    !toneTrainerPackCompleted(toneTrainer, requiredTonePack.id)
  );
  const startAccess = foundLesson
    ? canStartLesson(foundLesson.id, { isPremium, completedLessons, lessonStarsById })
    : undefined;
  const adaptiveLesson = useMemo(
    () =>
      foundLesson
        ? (() => {
            const enrichedSteps = foundLesson.steps.map((step) =>
              enrichMatchPairsStep(step, {
                currentLessonId: foundLesson.id,
                phaseOrder: foundLesson.phaseOrder,
                completedLessons,
                learnedChunks,
                learnedChars,
              })
            );
            return {
              ...foundLesson,
              steps: lessonRoundStepsFor(
                { ...foundLesson, steps: enrichedSteps },
                {
                  completedLessons,
                  learnedChunks,
                  learnedChars,
                  hanziBuilderProgress,
                  recentErrors: recentActivityErrors.filter((error) => !error.correctedAt),
                  srs,
                }
              ),
            };
          })()
        : undefined,
    [completedLessons, foundLesson, hanziBuilderProgress, learnedChars, learnedChunks, recentActivityErrors, srs]
  );

  useEffect(() => {
    if (!foundLesson) return undefined;
    return installLessonRecoveryDebugHelpers(() => {
      const state = useStore.getState();
      return {
        lessonId: foundLesson.id,
        lessonStarsById: state.lessonStarsById,
        activityErrors: activityErrorsRef.current,
        correctedErrorIds,
        recentActivityErrors: state.recentActivityErrors,
        currentLessonAttempt: state.currentLessonAttempt,
      };
    });
  }, [correctedErrorIds, foundLesson]);

  useEffect(() => {
    if (!foundLesson || toneLocked || entryChecked || energyBlocked) return;
    if (startAccess && !startAccess.allowed) return;
    if (foundLesson.premium && !canAccessLesson(foundLesson.id, isPremium)) return;
    const sessionKey = `longyu-energy:lesson:${foundLesson.id}:${todayKey()}`;
    const alreadyInSession = window.sessionStorage.getItem(sessionKey) === "1";
    const alreadyStarted = completedLessons.includes(foundLesson.id) || (lessonTaskProgress[foundLesson.id] ?? 0) > 0;
    if (alreadyInSession || alreadyStarted) {
      setEntryChecked(true);
      return;
    }
    if (!consumeCharge("lesson", `consume:lesson:${foundLesson.id}:${todayKey()}`)) {
      setEnergyBlocked(true);
      setProPaywallKind("energy");
      playSoundFx("blocked", soundEffects);
      return;
    }
    window.sessionStorage.setItem(sessionKey, "1");
    setEntryChecked(true);
  }, [completedLessons, consumeCharge, energyBlocked, entryChecked, foundLesson, isPremium, lessonTaskProgress, soundEffects, startAccess, toneLocked]);

  useEffect(() => {
    if (!foundLesson || !entryChecked || finished || pendingReviewRestoredRef.current) return;
    const pending = getPendingAttemptReview(foundLesson.id, lessonAttemptsById, foundLesson);
    if (!pending) return;
    pendingReviewRestoredRef.current = true;
    attemptIdRef.current = pending.attemptId;
    attemptStartedAtRef.current = pending.attempt.startedAt;
    const restoredErrors = pending.errors.flatMap((error) => {
      if (!error.step) return [];
      return [
        {
          ...error,
          type: (error.type ?? "comprehend") as ActivityError["type"],
          step: error.step,
        },
      ];
    });
    if (restoredErrors.length === 0) {
      pendingReviewRestoredRef.current = false;
      return;
    }
    activityErrorsRef.current = restoredErrors;
    setActivityErrors(activityErrorsRef.current);
    setCorrect(pending.correctCount);
    setCorrectedErrorIds(pending.alreadyRecoveredIds);
    setFinishReason("completed");
    setFinished(true);
    setPostLessonView("victory");
    setErrorReviewMode("offer");
    setRecovered(false);
    recoveryAppliedRef.current = false;
  }, [entryChecked, finished, foundLesson, lessonAttemptsById]);

  useEffect(() => {
    if (!foundLesson || !adaptiveLesson || !entryChecked || finished) return;
    if (pendingReviewRestoredRef.current) return;
    if (attemptIdRef.current?.startsWith(`${foundLesson.id}:`)) return;
    const startedAt = Date.now();
    attemptStartedAtRef.current = startedAt;
    attemptIdRef.current = `${foundLesson.id}:${startedAt}`;
    setCurrentLessonAttempt({
      id: attemptIdRef.current,
      lessonId: foundLesson.id,
      startedAt,
      finishedAt: 0,
      totalQuestions: adaptiveLesson.steps.filter(isGradedStep).length,
      correctCount: 0,
      mistakes: [],
      recoveredMistakes: [],
      finalStars: 0,
    });
  }, [adaptiveLesson, entryChecked, finished, foundLesson, setCurrentLessonAttempt]);

  if (!foundLesson || !adaptiveLesson) return <Navigate to="/jornada" replace />;
  const lesson = adaptiveLesson;
  const total = lesson.steps.length;
  const lessonTasks = lessonTasksFor(lesson);
  const graded = lesson.steps.filter(isGradedStep).length;
  const hasUnlimitedLives = canUseUnlimitedRetry({ isPremium });
  const showRecoveryDebugPanel = lessonRecoveryDebugPanelEnabled();
  const recoveryDebugErrors = showRecoveryDebugPanel
    ? activityErrorsRef.current.filter((error) => error.lessonId === lesson.id)
    : [];
  const recoveryDebugRecovered = recoveryDebugErrors.filter((error) => correctedErrorIds.includes(error.id)).length;
  const lessonIndex = ALL_LESSONS.findIndex((item) => item.id === lesson.id);
  const nextLesson = lessonIndex >= 0 ? ALL_LESSONS[lessonIndex + 1] : undefined;
  const debugCompletedLessons =
    recovered && !completedLessons.includes(lesson.id) ? [...completedLessons, lesson.id] : completedLessons;
  const debugLessonStarsById = recovered ? { ...lessonStarsById, [lesson.id]: 3 as LessonStar } : lessonStarsById;
  const nextUnlockDecision = nextLesson
    ? canStartLesson(nextLesson.id, {
        isPremium,
        completedLessons: debugCompletedLessons,
        lessonStarsById: debugLessonStarsById,
      })
    : undefined;
  const recoveryDebugPanel = showRecoveryDebugPanel ? (
    <LessonRecoveryDevPanel
      lessonId={lesson.id}
      stars={debugLessonStarsById[lesson.id] ?? 0}
      pendingErrors={Math.max(0, recoveryDebugErrors.length - recoveryDebugRecovered)}
      recoveredErrors={recoveryDebugRecovered}
      nextUnlockLabel={
        nextLesson
          ? `${nextLesson.title}: ${nextUnlockDecision?.allowed ? "liberada" : "bloqueada"}${
              nextUnlockDecision?.allowed ? "" : ` (${nextUnlockDecision?.reason ?? "sem motivo informado"})`
            }`
          : "não há próxima lição"
      }
    />
  ) : null;

  if (startAccess && !startAccess.allowed) {
    const premiumBlocked = startAccess.reasonCode === "premium_required";
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <div className="rounded-2xl bg-accent-soft px-4 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          {premiumBlocked ? "Longyu Pro" : "Jornada"}
        </div>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{startAccess.reason}</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => (premiumBlocked ? setProPaywallKind("content") : navigate("/jornada"))}>
          {premiumBlocked ? "Ver opções Pro" : "Continuar na jornada"}
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/jornada")}>
          Voltar
        </Button>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  if (toneLocked && requiredTonePack) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <div className="rounded-2xl bg-accent-soft px-4 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Treino de tons
        </div>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Conclua "{requiredTonePack.shortTitle}" com nota mínima {requiredTonePack.minimumCorrect}/{requiredTonePack.requiredRounds} para liberar esta etapa.
        </p>
        <Card className="mt-6 w-full p-5 text-left text-sm text-ink-soft">
          <div className="font-semibold text-ink">{requiredTonePack.title}</div>
          <p className="mt-2 leading-6">{requiredTonePack.focus}</p>
        </Card>
        <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/som")}>
          Abrir treino de tons
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/jornada")}>
          Voltar à jornada
        </Button>
      </div>
    );
  }

  function rememberMistakeTargets(step: LessonStep) {
    const nextTargets = [
      ...mistakeReviewTargetsRef.current,
      ...reviewTargetsForMistake(step, SKILL_TRACK[lesson.skill]),
    ];
    mistakeReviewTargetsRef.current = uniqueLessonReviewTargets(nextTargets);
  }

  function taskIdForStep(stepIndex: number): string {
    const { stageIndex } = lessonRoundProgressForStep(lesson.steps, stepIndex, lessonTasks.length);
    return lessonTasks[stageIndex]?.id ?? `${lesson.id}:stage:unknown`;
  }

  function reviewTargetsForPairMistake(payload: PairMistakePayload, track: Track): LessonReviewTarget[] {
    const sourceTrack: Track = payload.leftType === "audio" || lesson.skill === "som" ? "som" : track;
    const domain: ReviewDomain = payload.leftType === "audio" ? "som" : "significado";
    const targets: LessonReviewTarget[] = [];
    if (payload.reviewType && payload.reviewItemId) {
      targets.push({ type: payload.reviewType, itemId: payload.reviewItemId, domain, track: sourceTrack });
    }
    targets.push(...textReviewTargets(payload.left, domain, sourceTrack));
    return uniqueLessonReviewTargets(targets);
  }

  function createPairMatchActivityError(step: LessonStep, stepIndex: number, payload: PairMistakePayload): ActivityError {
    const expected = pairExpectedMeaning(payload);
    const selected = pairUserAnswerMeaning(payload);
    const hanzi = displayTextHasHanzi(payload.left) ? payload.left : undefined;
    const pinyin = pairPinyin(payload);
    const targets = reviewTargetsForPairMistake(payload, SKILL_TRACK[lesson.skill]);
    const id = `${lesson.id}:${stepIndex}:pair-match:${payload.pairIndex}:${Date.now()}`;
    return {
      id,
      lessonId: lesson.id,
      moduleId: lesson.unitId,
      phaseId: lesson.phaseId,
      taskId: taskIdForStep(stepIndex),
      questionId: `${lesson.id}:${stepIndex}:pair:${payload.left}`,
      exerciseId: `${lesson.id}:${stepIndex}:pair:${payload.left}`,
      type: "pair-match",
      prompt: hanzi ? `O que significa ${hanzi}?` : `Combine ${payload.left}`,
      correctAnswer: expected,
      selectedAnswer: selected || "Resposta incorreta",
      topic: step.title ?? step.prompt ?? lesson.title,
      tokens: uniqueNonEmpty([payload.left, expected, selected, pinyin]),
      hanzi,
      pinyin,
      meaningPt: expected,
      pairLeft: payload.left,
      pairExpectedRight: payload.expectedRight,
      pairSelectedRight: payload.userAnswer,
      pairLeftType: payload.leftType,
      pairRightType: payload.rightType,
      pairSelectedRightType: payload.selectedRightType,
      explanation: pairExplanation(payload),
      mistakeReason: "Par específico confundido no exercício de combinar.",
      timestamp: Date.now(),
      wrongCount: 1,
      correctionAttempts: 0,
      correctedSuccessDates: [],
      skill: payload.leftType === "audio" || step.kind === "tone_pair" ? "som" : "significado",
      step,
      targets,
    };
  }

  function createActivityError(step: LessonStep, stepIndex: number, selectedAnswer?: string): ActivityError {
    const correction = correctionForStep(step);
    const targets = reviewTargetsForMistake(step, SKILL_TRACK[lesson.skill]);
    const id = `${lesson.id}:${stepIndex}:${step.kind}:${Date.now()}`;
    const sceneContext =
      step.kind === "conversation_scene"
        ? (step.lines ?? [])
            .map((line) => {
              const speaker = step.characters?.find((character) => character.id === line.speakerId)?.name ?? line.speakerId;
              return `${speaker}: ${line.hanzi}`;
            })
            .join(" · ")
        : undefined;
    return {
      id,
      lessonId: lesson.id,
      moduleId: lesson.unitId,
      phaseId: lesson.phaseId,
      taskId: taskIdForStep(stepIndex),
      questionId: `${lesson.id}:${stepIndex}:${step.kind}`,
      exerciseId: `${lesson.id}:${stepIndex}`,
      type: step.kind,
      prompt: sceneContext ? `${correction.prompt} (cena: ${sceneContext})` : correction.prompt,
      correctAnswer: correction.correction,
      selectedAnswer: selectedAnswer?.trim() || "Resposta incorreta",
      topic: step.title ?? step.prompt ?? lesson.title,
      tokens: errorTokensForStep(step),
      hanzi: errorHanziForStep(step),
      pinyin: errorPinyinForStep(step),
      meaningPt: errorMeaningForStep(step, correction),
      explanation:
        step.explanation ??
        step.checkpoint?.explanation ??
        correction.detail ??
        (correction.correction ? `Sugestão: ${correction.correction}` : undefined),
      mistakeReason: mistakeReasonForStep(step),
      timestamp: Date.now(),
      wrongCount: 1,
      correctionAttempts: 0,
      correctedSuccessDates: [],
      skill: activityErrorSkillForStep(step),
      step,
      targets,
    };
  }

  function persistableActivityError({ step, ...record }: ActivityError): ActivityErrorRecord {
    void step;
    return record;
  }

  function lessonMistakeFromActivityError(error: ActivityError): LessonMistakeRecord {
    return {
      id: error.id,
      lessonId: error.lessonId,
      questionId: error.questionId,
      exerciseType: error.type,
      prompt: error.prompt,
      expectedAnswer: error.correctAnswer,
      userAnswer: error.selectedAnswer,
      explanation: error.explanation ?? error.mistakeReason ?? "Reveja este ponto.",
      sourceSkill: sourceSkillForActivitySkill(error.skill, lesson.skill),
      createdAt: error.timestamp,
      recoveredAt: error.correctedAt,
    };
  }

  function startStoredAttempt(startedAt = Date.now()) {
    attemptStartedAtRef.current = startedAt;
    attemptIdRef.current = `${lesson.id}:${startedAt}`;
    setCurrentLessonAttempt({
      id: attemptIdRef.current,
      lessonId: lesson.id,
      startedAt,
      finishedAt: 0,
      totalQuestions: graded,
      correctCount: 0,
      mistakes: [],
      recoveredMistakes: [],
      finalStars: 0,
    });
  }

  function buildStoredAttempt(finalStars: LessonStar, correctCount: number, recoveredIds = correctedErrorIds): LessonAttemptRecord {
    const mistakeRecords = activityErrorsRef.current.map(lessonMistakeFromActivityError);
    return {
      id: attemptIdRef.current ?? `${lesson.id}:${attemptStartedAtRef.current}`,
      lessonId: lesson.id,
      startedAt: attemptStartedAtRef.current,
      finishedAt: Date.now(),
      totalQuestions: graded,
      correctCount,
      mistakes: mistakeRecords,
      recoveredMistakes: mistakeRecords
        .filter((mistake) => recoveredIds.includes(mistake.id))
        .map((mistake) => ({ ...mistake, recoveredAt: mistake.recoveredAt ?? Date.now() })),
      finalStars,
    };
  }

  function recordCommittedError(step: LessonStep, stepIndex: number, selectedAnswer?: string, payload?: PairMistakePayload) {
    const firstPair = step.kind === "match_pairs" || step.kind === "tone_pair" ? step.pairs?.[0] : undefined;
    const fallbackPairPayload: PairMistakePayload | undefined = firstPair
      ? {
          kind: "pair-match",
          pairIndex: 0,
          left: firstPair.left,
          expectedRight: firstPair.right,
          userAnswer: selectedAnswer ?? "Pulou o par",
          leftType: firstPair.leftType,
          rightType: firstPair.rightType,
          selectedRightType: firstPair.rightType,
          reviewType: firstPair.reviewType,
          reviewItemId: firstPair.reviewItemId,
        }
      : undefined;
    const pairPayload = isPairMistakePayload(payload) ? payload : fallbackPairPayload;
    const error = pairPayload
      ? createPairMatchActivityError(step, stepIndex, pairPayload)
      : createActivityError(step, stepIndex, selectedAnswer);
    const correction: LessonMistake = {
      prompt: error.prompt,
      correction: error.correctAnswer,
      detail: error.pinyin ?? error.explanation,
    };
    setMistakes((items) => [...items, correction].slice(-6));
    activityErrorsRef.current = [...activityErrorsRef.current, error].slice(-12);
    setActivityErrors(activityErrorsRef.current);
    recordActivityError(persistableActivityError(error));
    recordLessonMistake(lessonMistakeFromActivityError(error));
    mistakeReviewTargetsRef.current = uniqueLessonReviewTargets([
      ...mistakeReviewTargetsRef.current,
      ...error.targets,
    ]);
    return error;
  }

  function gradeErrorTargets(error: ActivityError, grade: "again" | "good") {
    for (const target of error.targets) {
      gradeReviewDomain({
        ensureSrs,
        gradeSrs,
        type: target.type,
        itemId: target.itemId,
        track: target.track,
        domain: target.domain,
        grade,
      });
    }
  }

  // Recuperação da tentativa atual: quando o aluno corrige TODOS os erros
  // desta tentativa (vinculados ao lessonId + lista de erros da tentativa) e a
  // lição ainda não havia passado, devolve a 3ª estrela, conclui a lição e
  // libera a próxima etapa — uma única vez, sem duplicar recompensa/XP/missão.
  function applyAttemptRecovery(correctedIds: string[]) {
    if (recoveryAppliedRef.current) return;
    if (finishReason === "out_of_lives") return;
    const attemptErrors = activityErrorsRef.current;
    if (attemptErrors.length === 0) return;
    const allCorrected = attemptErrors.every((error) => correctedIds.includes(error.id));
    if (!allCorrected) return;
    const baseStars = lessonStars({
      correct,
      graded,
      hadMistakes: attemptErrors.length > 0,
      outOfLives: false,
      isReview: lesson.isReview,
    });
    const currentStars = lessonStarsById[lesson.id] ?? baseStars;
    if (currentStars >= 3) return;
    if (lesson.isReview && canCompleteLesson(baseStars, graded, true, correct) && attemptErrors.length === 0) return;
    recoveryAppliedRef.current = true;
    finishLessonAttempt(buildStoredAttempt(3, correct, correctedIds));
    const firstCompletion = !completedLessons.includes(lesson.id);
    completeLesson(lesson.id);
    if (firstCompletion) {
      const recoveredXp = LESSON_BASE_XP + LESSON_THREE_STAR_XP_BONUS;
      const attemptId = attemptIdRef.current ?? `${lesson.id}:${attemptStartedAtRef.current}`;
      const xpClaimed = claimReward({
        id: leagueXpKeyLesson(lesson.id, attemptId),
        type: "xp",
        amount: recoveredXp,
        source: "Conclusão de lição",
      });
      setLessonXp(xpClaimed ? recoveredXp : 0);
      setPostLessonXpTotal(useStore.getState().xpTotal);
      setLessonReward(LESSON_THREE_STAR_QI + (skippedStepsRef.current === 0 ? LESSON_NO_SKIP_QI : 0));
    }
    if (firstCompletion || (lessonStarsById[lesson.id] ?? 0) < 3) recordDailyTask("threeStarLessons");
    setRecovered(true);
    setErrorReviewMode("recovered");
    playSoundFx("lessonComplete", soundEffects);
  }

  function markErrorCorrected(error: ActivityError) {
    if (correctedErrorIds.includes(error.id)) return;
    const nextCorrected = [...correctedErrorIds, error.id];
    setCorrectedErrorIds(nextCorrected);
    markActivityErrorCorrected(error.id);
    markMistakeRecovered(error.id);
    gradeErrorTargets(error, "good");
    recordDailyTask("reviewsDone");
    recordDailyTask("errorsCorrected");
    playSoundFx("success", soundEffects);
    applyAttemptRecovery(nextCorrected);
  }

  function markErrorNeedsMoreReview(error: ActivityError) {
    // Errou de novo: conta a tentativa no mesmo erro, sem duplicar o registro.
    recordActivityErrorReviewAttempt(error.id);
    gradeErrorTargets(error, "again");
    playSoundFx("error", soundEffects);
  }

  if (lesson.premium && !canAccessLesson(lesson.id, isPremium)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <div className="rounded-2xl bg-accent-soft px-4 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Longyu Pro
        </div>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Você chegou ao fim do núcleo gratuito. A partir de «China e amigos», o conteúdo faz parte do Longyu Pro.
        </p>
        <Card className="mt-6 w-full p-5 text-left text-sm text-ink-soft">
          <ul className="list-inside list-disc space-y-1">
            <li>Família, comida e compras</li>
            <li>Microtextos e leitura em voz alta</li>
            <li>Revisão ilimitada (em breve)</li>
          </ul>
        </Card>
        <Button size="lg" className="mt-6 w-full" onClick={() => setProPaywallKind("content")}>Ver opções Pro</Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/jornada")}>
          Voltar à jornada
        </Button>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  if (energyBlocked || !entryChecked) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <div className="rounded-2xl bg-accent-soft px-4 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Cargas do Dragão
        </div>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
          {energyBlocked ? "Lição bloqueada por hoje" : "Preparando lição"}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {energyBlocked
            ? "Você usou as cargas de novas lições por hoje. Elas voltam amanhã — e ainda há caminhos grátis para continuar aprendendo agora."
            : "O Longyu está verificando suas cargas antes de começar."}
        </p>
        {energyBlocked && (
          <>
            <Link to="/revisao" className="mt-6 block w-full">
              <Button size="lg" className="w-full shadow-lift">
                <IconRefresh width={18} height={18} /> Revisar de graça
              </Button>
            </Link>
            <Link to="/missoes" className="mt-3 block w-full">
              <Button variant="soft" className="w-full">
                <IconTarget width={17} height={17} /> Fazer missão para ganhar Qi
              </Button>
            </Link>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setProPaywallKind("energy")}>
              Conhecer o Longyu Pro
            </Button>
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/jornada")}>
              Voltar amanhã
            </Button>
            <Link to="/loja" className="mt-4 text-xs font-semibold text-ink-faint transition hover:text-accent">
              Ou compre uma Carga na Loja
            </Link>
          </>
        )}
        {!energyBlocked && (
          <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/jornada")}>
            Voltar à jornada
          </Button>
        )}
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "energy"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  // Erro em questão avaliada: não pune na hora. Registra o erro, pausa o
  // avanço e abre o painel para o aluno decidir (refazer por Qi ou continuar).
  function registerCurrentMistake(selectedAnswer?: string, payload?: PairMistakePayload) {
    const currentStep = lesson.steps[idx];
    if (!isGradedStep(currentStep)) return;

    setAnswerStreak(0);
    playSoundFx("error", soundEffects);

    // Penalidade já aplicada neste step: erros seguintes não cobram de novo
    // nem reabrem o painel (o step já está imperfeito).
    if (isPairMistakePayload(payload)) {
      const pairKey = `${idx}:${payload.left}:${payload.expectedRight}:${payload.userAnswer}`;
      if (!recordedPairMistakesRef.current.has(pairKey)) {
        recordCommittedError(currentStep, idx, selectedAnswer, payload);
        recordedPairMistakesRef.current.add(pairKey);
      }
      currentStepHadMistakeRef.current = true;
      return;
    }

    if (recordedMistakeStepRef.current !== idx) {
      recordCommittedError(currentStep, idx, selectedAnswer);
      rememberMistakeTargets(currentStep);
      recordedMistakeStepRef.current = idx;
    }
    currentStepHadMistakeRef.current = true;

    const correction = correctionForStep(currentStep);
    setPendingMistake(correction);
  }

  // "Tentar de novo por Qi": Pro refaz de graça; senão gasta Qi. O step é
  // remontado e, se o aluno acertar agora, a questão ainda conta como perfeita.
  function retryWithQi() {
    if (!pendingMistake) return;
    if (!isPremium && !spendQi(RETRY_COST_QI, "mistake_retry")) return;
    retryUsesRef.current += 1;
    playSoundFx(isPremium ? "success" : "qiSpend", soundEffects);
    setCurrentStepPenaltyApplied(false);
    setRetryProtected(true);
    setPendingMistake(null);
    setStepAttempt((attempt) => attempt + 1);
  }

  // "Continuar e perder perfeição": o erro vira permanente, custa 1 Fôlego
  // e avança para o próximo step para evitar dois fluxos de feedback.
  function continueWithMistake() {
    if (!pendingMistake) return;
    currentStepHadMistakeRef.current = true;
    setCurrentStepPenaltyApplied(true);
    setPendingMistake(null);
    setRetryProtected(false);
    if (hasUnlimitedLives) {
      handleDone(false);
      return;
    }
    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    if (nextLives <= 0) {
      finish(correct, "out_of_lives");
      return;
    }
    handleDone(false);
  }

  function handleDone(wasCorrect?: boolean) {
    let nextStreak = answerStreak;
    const currentStep = lesson.steps[idx];
    const currentStepIsGraded = isGradedStep(currentStep);
    // Penalidade só existe se o aluno escolheu "continuar mesmo assim" (ou
    // pulou). Retry pago limpa o erro, então a questão volta a poder contar.
    const hadRecordedMistake = currentStepHadMistakeRef.current;
    const penaltyApplied = currentStepPenaltyApplied;
    const countsAsCorrect = wasCorrect === true && !hadRecordedMistake;
    const nextCorrect = correct + (countsAsCorrect ? 1 : 0);
    let nextLives = lives;

    if (countsAsCorrect) {
      if (currentStep.kind === "tone") toneHitsRef.current += 1;
      else if (currentStep.kind === "tone_pair") toneHitsRef.current += currentStep.pairs?.length ?? 1;
      nextStreak = answerStreak + 1;
      setAnswerStreak(nextStreak);
      setCorrectBurst(nextStreak % 2 === 0 ? "Boa!" : "Certo");
      window.setTimeout(() => setCorrectBurst(null), 820);
      if (nextStreak >= 3 && nextStreak % 3 === 0) {
        playSoundFx("streak", soundEffects);
        setStreakBurst(nextStreak);
        window.setTimeout(() => setStreakBurst(0), 1200);
      } else {
        playSoundFx("success", soundEffects);
      }
    } else if (wasCorrect === true) {
      nextStreak = 0;
      setAnswerStreak(0);
      playSoundFx("step", soundEffects);
    } else if (wasCorrect === false) {
      nextStreak = 0;
      setAnswerStreak(0);
      // Erro que chegou aqui sem passar pelo painel (ex.: pular a questão):
      // aplica a penalidade padrão uma única vez.
      if (!hadRecordedMistake) {
        recordCommittedError(currentStep, idx, "Pulou ou respondeu incorretamente");
        if (currentStepIsGraded) rememberMistakeTargets(currentStep);
      }
      if (currentStepIsGraded && !hasUnlimitedLives && !penaltyApplied) {
        nextLives = Math.max(0, lives - 1);
        setLives(nextLives);
      }
      playSoundFx(penaltyApplied ? "step" : "error", soundEffects);
    } else {
      playSoundFx("step", soundEffects);
    }

    setCorrect(nextCorrect);
    setLessonTaskProgress(
      lesson.id,
      completedLessonStagesFromRoundStep(lesson.steps, idx + 1, lessonTasks.length)
    );
    currentStepHadMistakeRef.current = false;
    recordedMistakeStepRef.current = null;
    recordedPairMistakesRef.current.clear();
    setCurrentStepPenaltyApplied(false);
    setRetryProtected(false);
    setPendingMistake(null);
    setStepAttempt(0);
    if (wasCorrect === false && currentStepIsGraded && !hasUnlimitedLives && nextLives <= 0) {
      finish(nextCorrect, "out_of_lives");
      return;
    }
    if (idx + 1 >= total) finish(nextCorrect);
    else setIdx(idx + 1);
  }

  function skipCurrentStep() {
    skippedStepsRef.current += 1;
    handleDone(false);
  }

  function exitLesson() {
    playSoundFx("phaseExit", soundEffects);
    navigate("/jornada");
  }

  function finish(finalCorrect: number, reason: FinishReason = "completed") {
    // Alimenta SRS e biblioteca com os itens da lição.
    const track = SKILL_TRACK[lesson.skill];
    const gradedDomains = new Set<string>();
    // Itens distintos praticados nesta sessão — alimentam o resumo final.
    const practicedChunkIds = new Set<string>();
    const practicedCharIds = new Set<string>();
    const gradeOnce = (
      type: ItemType,
      itemId: string,
      domain: ReviewDomain,
      sourceTrack: Track = track
    ) => {
      const key = `${type}:${itemId}:${domain}`;
      if (type === "chunk") practicedChunkIds.add(itemId);
      else practicedCharIds.add(itemId);
      if (gradedDomains.has(key)) return;
      gradedDomains.add(key);
      gradeReviewDomain({
        ensureSrs,
        gradeSrs,
        type,
        itemId,
        track: sourceTrack,
        domain,
        grade: "good",
      });
    };
    const gradeText = (text: string | undefined, domain: ReviewDomain, sourceTrack: Track = track) => {
      const chunk = findChunkByText(text);
      if (chunk) gradeOnce("chunk", chunk.id, domain, sourceTrack);
      for (const char of charsInText(text)) {
        gradeOnce("char", char.id, domain, sourceTrack);
      }
    };

    for (const s of lesson.steps) {
      if ((s.kind === "decompose" || s.kind === "recognize") && s.charId) {
        gradeOnce("char", s.charId, s.kind === "decompose" ? "forma" : "significado");
      }
      if (s.kind === "hanzi_evolution") {
        for (const charId of s.charIds ?? []) {
          gradeOnce("char", charId, "forma", "hanzi");
          gradeOnce("char", charId, "significado", "hanzi");
        }
      }
      if (s.kind === "flashcard" && s.chunkId) {
        gradeOnce("chunk", s.chunkId, "significado");
        if (track === "fala") gradeOnce("chunk", s.chunkId, "fala");
      }
      if (s.kind === "listen") {
        const chunk = findChunkByText(s.text);
        if (chunk) {
          gradeOnce("chunk", chunk.id, "som");
          if (track === "fala") gradeOnce("chunk", chunk.id, "fala");
        }
        const chars = charsInText(s.text);
        if (chars.length === 1) gradeOnce("char", chars[0].id, "som");
      }
      if (s.kind === "tone") {
        const chars = charsInText(s.hanzi);
        if (chars[0]) gradeOnce("char", chars[0].id, "som", "som");
      }
      if (s.kind === "comprehend") {
        const chunk = findChunkByText(s.hanzi);
        if (chunk) gradeOnce("chunk", chunk.id, "significado");
        const chars = charsInText(s.hanzi);
        if (chars.length === 1) gradeOnce("char", chars[0].id, "significado");
      }
      if (s.kind === "produce") {
        const chunk = findChunkByText(s.target?.join(""));
        if (chunk) {
          gradeOnce("chunk", chunk.id, "fala");
          gradeOnce("chunk", chunk.id, "uso");
        }
      }
      if (s.kind === "write" && s.chunkId) {
        gradeOnce("chunk", s.chunkId, "uso");
        gradeOnce("chunk", s.chunkId, "significado");
      }
      if (s.kind === "match_pairs" || s.kind === "tone_pair") {
        const domain: ReviewDomain = s.kind === "tone_pair" ? "som" : "significado";
        for (const pair of s.pairs ?? []) {
          if (pair.reviewType && pair.reviewItemId) {
            gradeOnce(pair.reviewType, pair.reviewItemId, domain, s.kind === "tone_pair" ? "som" : track);
          }
          gradeText(pair.left, domain, s.kind === "tone_pair" ? "som" : track);
          gradeText(pair.right, domain, s.kind === "tone_pair" ? "som" : track);
        }
      }
      if (s.kind === "listen_select") {
        gradeText(s.audioText ?? s.correctAnswer, "som", "som");
        gradeText(s.correctAnswer, "significado");
      }
      if (s.kind === "sentence_build" || s.kind === "translation_build" || s.kind === "dialogue_choice" || s.kind === "conversation_scene") {
        gradeText(s.correctAnswer ?? s.checkpoint?.correctAnswer ?? s.answer ?? s.targetParts?.join(""), "uso");
        gradeText(s.correctAnswer ?? s.checkpoint?.correctAnswer ?? s.answer ?? s.targetParts?.join(""), "fala");
        if (s.kind === "conversation_scene") {
          for (const line of s.lines ?? []) gradeText(line.hanzi, "uso");
        }
      }
      if (s.kind === "fill_blank") {
        gradeText(s.correctAnswer ?? s.answer ?? `${s.sentenceBefore ?? ""}${s.blankAnswer ?? ""}${s.sentenceAfter ?? ""}`, "uso");
      }
      if (s.kind === "hanzi_build") {
        gradeText(s.correctAnswer ?? s.answer, "forma", "hanzi");
        gradeText(s.targetParts?.join(""), "forma", "hanzi");
      }
      if (s.kind === "microread") {
        for (const line of s.lines ?? []) {
          for (const chunk of CHUNKS) {
            if (normalizeHanzi(line.hanzi).includes(normalizeHanzi(chunk.hanzi))) {
              gradeOnce("chunk", chunk.id, "leitura", "leitura");
            }
          }
          for (const char of charsInText(line.hanzi)) {
            gradeOnce("char", char.id, "leitura", "leitura");
          }
        }
      }
    }
    const weakDomains = new Set<string>();
    for (const target of mistakeReviewTargetsRef.current) {
      const key = `${target.type}:${target.itemId}:${target.domain}:${target.track}`;
      if (weakDomains.has(key)) continue;
      weakDomains.add(key);
      gradeReviewDomain({
        ensureSrs,
        gradeSrs,
        type: target.type,
        itemId: target.itemId,
        track: target.track,
        domain: target.domain,
        grade: "again",
      });
    }
    const minutesEarned = lesson.estimatedMinutes ?? 5;
    const goalMin = DAILY_GOAL_PER_TRACK * 4;
    const totalBefore = totalToday(today);
    addMinutes(track, minutesEarned);
    const stars = lessonStars({
      correct: finalCorrect,
      graded,
      hadMistakes: activityErrorsRef.current.length > 0,
      outOfLives: reason === "out_of_lives",
      isReview: lesson.isReview,
    });
    const passed = reason !== "out_of_lives" && canCompleteLesson(stars, graded, lesson.isReview, finalCorrect);
    const firstCompletion = !completedLessons.includes(lesson.id);
    const completionXp = passed && firstCompletion
      ? LESSON_BASE_XP + (stars === 3 ? LESSON_THREE_STAR_XP_BONUS : 0)
      : 0;
    // Pro ganha um bônus fixo de Qi por conclusão (fricção menor, não XP).
    const completionQi = passed && firstCompletion
      ? (stars === 3 ? LESSON_THREE_STAR_QI : 0) +
        (skippedStepsRef.current === 0 ? LESSON_NO_SKIP_QI : 0) +
        (isPremium ? PRO_LESSON_QI_BONUS : 0)
      : 0;

    // Resumo pedagógico: frases/hànzì praticados e tons acertados na rodada.
    const tonesHit = toneHitsRef.current;
    const newPhrases = [...practicedChunkIds].filter((id) => !learnedChunks.includes(id)).length;
    setSessionSummary({
      phrases: practicedChunkIds.size,
      newPhrases,
      hanzi: practicedCharIds.size,
      tones: tonesHit,
    });
    if (tonesHit > 0) recordDailyTask("tonesTrained", tonesHit);
    const attemptId = attemptIdRef.current ?? `${lesson.id}:${attemptStartedAtRef.current}`;
    const xpClaimed = completionXp > 0
      ? claimReward({
          id: leagueXpKeyLesson(lesson.id, attemptId),
          type: "xp",
          amount: completionXp,
          source: "Conclusão de lição",
        })
      : false;
    finishLessonAttempt(buildStoredAttempt(stars, finalCorrect));
    setReviewItemsAdded(gradedDomains.size);
    setLessonXp(xpClaimed ? completionXp : 0);
    setPostLessonXpTotal(useStore.getState().xpTotal);
    setLessonReward(completionQi);
    setEstimatedMinutes(minutesEarned);
    setDailyGoalReached(passed && totalBefore < goalMin && totalBefore + minutesEarned >= goalMin);
    setPostLessonView("victory");
    setClaimedRewardCards(false);
    setErrorReviewMode(activityErrorsRef.current.length > 0 ? "offer" : "idle");
    setCorrectedErrorIds([]);
    setRecovered(false);
    recoveryAppliedRef.current = false;
    setLessonTaskProgress(
      lesson.id,
      reason === "out_of_lives" ? completedLessonStagesFromRoundStep(lesson.steps, idx + 1, lessonTasks.length) : lessonTasks.length
    );
    playSoundFx(passed ? "lessonComplete" : "blocked", soundEffects);
    if (passed) completeLesson(lesson.id);
    if (passed && lesson.isReview && graded > 0 && finalCorrect === graded) {
      addChest("legendary", 1);
      playSoundFx("chestReady", soundEffects);
    }
    if (passed && stars === 3) recordDailyTask("threeStarLessons");
    setFinishReason(reason);
    setFinished(true);
    const sessionErrors = activityErrorsRef.current;
    const toneErrorCount = sessionErrors.filter(
      (error) => error.skill === "som" || error.step?.kind === "tone" || error.step?.kind === "tone_pair"
    ).length;
    const hanziErrorCount = sessionErrors.filter(
      (error) => error.skill === "hanzi" || error.step?.kind === "hanzi_build" || error.step?.kind === "recognize"
    ).length;
    contextualOffer.consider({
      lessonThreeStars: passed && stars === 3,
      twoStars: passed && stars === 2,
      errorCount: sessionErrors.length,
      outOfBreath: reason === "out_of_lives",
      repeatedToneErrors: toneErrorCount >= 2,
      repeatedHanziErrors: hanziErrorCount >= 2,
    });
  }

  if (finished) {
    const computedStars = lessonStars({
      correct,
      graded,
      hadMistakes: activityErrorsRef.current.length > 0,
      outOfLives: finishReason === "out_of_lives",
      isReview: lesson.isReview,
    });
    // Recuperou a tentativa → 3 estrelas e lição concluída.
    const stars = recovered ? 3 : computedStars;
    const passed =
      recovered || (finishReason !== "out_of_lives" && canCompleteLesson(computedStars, graded, lesson.isReview, correct));
    const requiredStars = requiredStarsForLesson(lesson.isReview);
    const requiredAccuracy = Math.round(MODULE_REVIEW_PASS_ACCURACY * 100);
    const passRequirementLabel = lesson.isReview ? `${requiredAccuracy}%` : `${requiredStars} estrelas`;
    const helpCount = skippedStepsRef.current + retryUsesRef.current + recoveryUsesRef.current;
    const precision = graded === 0 ? 100 : Math.round((correct / graded) * 100);
    const victoryTitle = VICTORY_TITLES[Math.abs(lesson.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % VICTORY_TITLES.length];
    const missionHighlights = [
      ...buildMissionViews("daily", missionAggregates, dailyMissions.claimed),
      ...buildMissionViews("weekly", missionAggregates, weeklyMissions.claimed),
    ]
      .filter((mission) => mission.progress > 0 && !mission.claimed && isMissionActionable(mission, isPremium))
      .sort((a, b) => Number(b.complete) - Number(a.complete) || (b.progress / b.goal) - (a.progress / a.goal))
      .slice(0, 3);
    const monthlyProgress = Math.min(monthlyMission.completed, MONTHLY_GOAL);
    const committedErrors = (activityErrors.length > 0 ? activityErrors : activityErrorsRef.current).filter(
      (error) => error.lessonId === lesson.id
    );
    const correctedCount = committedErrors.filter((error) => correctedErrorIds.includes(error.id)).length;
    const remainingErrors = committedErrors.filter((error) => !correctedErrorIds.includes(error.id));
    const reviewQueue = errorReviewMode === "review" && remainingErrors.length > 0 ? remainingErrors : committedErrors;
    const canRetryAfterReview = !passed || (!lesson.isReview && stars < requiredStars);
    const suggestsPinyinLab = lesson.steps.some((step) =>
      step.kind === "tone" || step.kind === "tone_pair" || step.kind === "listen_select"
    );
    const suggestsHanziLab = lesson.steps.some((step) =>
      step.kind === "recognize" || step.kind === "decompose" || step.kind === "hanzi_build"
    );
    // Próximo foco + frase-resumo: dizem em uma linha o que a sessão rendeu.
    const toneErrorCount = committedErrors.filter(
      (error) => error.skill === "som" || error.step?.kind === "tone" || error.step?.kind === "tone_pair"
    ).length;
    const hanziErrorCount = committedErrors.filter(
      (error) => error.skill === "hanzi" || error.step?.kind === "hanzi_build" || error.step?.kind === "recognize"
    ).length;
    const nextFocus = buildNextFocus({
      remainingErrorCount: remainingErrors.length,
      toneErrorCount,
      hanziErrorCount,
      nextLessonTitle: nextLesson?.title,
    });
    const weakSkillsLabel =
      toneErrorCount > 0 && hanziErrorCount > 0
        ? "tons e hànzì"
        : toneErrorCount > 0
          ? "tons"
          : hanziErrorCount > 0
            ? "hànzì"
            : "algumas frases";
    const summaryParts: string[] = [];
    if (sessionSummary) {
      if (sessionSummary.phrases > 0) {
        summaryParts.push(
          sessionSummary.newPhrases > 0
            ? `praticou ${sessionSummary.phrases} frases (${sessionSummary.newPhrases} novas)`
            : `praticou ${sessionSummary.phrases} ${sessionSummary.phrases === 1 ? "frase" : "frases"}`
        );
      }
      if (sessionSummary.hanzi > 0) summaryParts.push(`reforçou ${sessionSummary.hanzi} hànzì`);
      if (sessionSummary.tones > 0) summaryParts.push(`acertou ${sessionSummary.tones} tons`);
    }
    if (correctedCount > 0) summaryParts.push(`corrigiu ${correctedCount} ${correctedCount === 1 ? "erro" : "erros"}`);
    const sessionSummaryLine =
      summaryParts.length > 0
        ? `Hoje você ${summaryParts.length > 1 ? `${summaryParts.slice(0, -1).join(", ")} e ${summaryParts[summaryParts.length - 1]}` : summaryParts[0]}.`
        : "Você completou esta etapa da Jornada.";

    if (!recovered && errorReviewMode === "offer" && committedErrors.length > 0) {
      return (
        <ImmediateErrorReviewOffer
          count={committedErrors.length}
          correct={correct}
          total={graded}
          canRecover={!passed}
          onStart={() => setErrorReviewMode("review")}
          onLater={() => {
            setErrorReviewMode("dismissed");
            navigate("/jornada");
          }}
        />
      );
    }

    if (!recovered && errorReviewMode === "review" && reviewQueue.length > 0) {
      return (
        <ImmediateErrorReviewSession
          key={`review-${correctedErrorIds.join("|")}-${reviewQueue.length}`}
          errors={reviewQueue}
          onCorrect={markErrorCorrected}
          onNeedsMoreReview={markErrorNeedsMoreReview}
          onDone={() => setErrorReviewMode("summary")}
        />
      );
    }

    if (!recovered && errorReviewMode === "summary" && committedErrors.length > 0) {
      return (
        <ImmediateErrorReviewSummary
          corrected={correctedCount}
          remaining={Math.max(0, committedErrors.length - correctedCount)}
          canRetryLesson={canRetryAfterReview}
          onReviewAgain={() => setErrorReviewMode("review")}
          onContinue={() => setErrorReviewMode("dismissed")}
          onRetryLesson={retryLesson}
        />
      );
    }

    function retryLesson() {
      playSoundFx("step", soundEffects);
      setIdx(0);
      setCorrect(0);
      setLives(DRAGON_BREATH_LIVES);
      setFinishReason(null);
      currentStepHadMistakeRef.current = false;
      setPendingMistake(null);
      setRetryProtected(false);
      setCurrentStepPenaltyApplied(false);
      setStepAttempt(0);
      setAnswerStreak(0);
      setStreakBurst(0);
      setCorrectBurst(null);
      setMistakes([]);
      setActivityErrors([]);
      activityErrorsRef.current = [];
      setErrorReviewMode("idle");
      setCorrectedErrorIds([]);
      setRecovered(false);
      recoveryAppliedRef.current = false;
      pendingReviewRestoredRef.current = false;
      setReviewItemsAdded(0);
      setLessonReward(0);
      setLessonXp(0);
      setPostLessonXpTotal(0);
      setSessionSummary(null);
      skippedStepsRef.current = 0;
      retryUsesRef.current = 0;
      recoveryUsesRef.current = 0;
      toneHitsRef.current = 0;
      mistakeReviewTargetsRef.current = [];
      setEstimatedMinutes(5);
      setPostLessonView("victory");
      setDailyGoalReached(false);
      setClaimedRewardCards(false);
      setLessonTaskProgress(lesson.id, 0);
      recordedMistakeStepRef.current = null;
      recordedPairMistakesRef.current.clear();
      startStoredAttempt();
      setFinished(false);
    }

    function recoverWithQi() {
      if (!spendQi(BREATH_RECOVERY_QI_COST, "breath_recovery")) return;
      recoveryUsesRef.current += 1;
      playSoundFx("qiSpend", soundEffects);
      setLives(DRAGON_BREATH_LIVES);
      setFinishReason(null);
      currentStepHadMistakeRef.current = false;
      setCurrentStepPenaltyApplied(false);
      setRetryProtected(false);
      setFinished(false);
    }

    function recoverWithBreathItem() {
      if (!useInventoryItem("shop-breath")) return;
      recoveryUsesRef.current += 1;
      playSoundFx("success", soundEffects);
      setLives(DRAGON_BREATH_LIVES);
      setFinishReason(null);
      currentStepHadMistakeRef.current = false;
      setCurrentStepPenaltyApplied(false);
      setRetryProtected(false);
      setFinished(false);
    }

    if (finishReason === "out_of_lives") {
      return (
        <div className="mx-auto max-w-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {recoveryDebugPanel}
          <section className="rounded-[30px] border border-line bg-surface px-4 pb-5 pt-7 text-center shadow-lift sm:px-7">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-wrong-soft text-wrong">
              <IconFlame width={30} height={30} fill="currentColor" />
            </div>

            <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Treine antes de continuar
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
              {lesson.isReview
                ? `Seu Fôlego do Dragão chegou a zero. A revisão não foi concluída; revise os pontos fracos e tente chegar a ${passRequirementLabel}.`
                : "Seu Fôlego do Dragão chegou a zero. A lição não foi concluída; revise os pontos fracos e tente uma rodada com 3 estrelas."}
            </p>

            <div className="mt-5 flex justify-center">
              <DragonBreathMeter lives={0} maxLives={DRAGON_BREATH_LIVES} unlimited={false} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
              <LessonSummaryStat label="Progresso" value={`${stars}/3 estrelas`} />
              <LessonSummaryStat label="Precisão" value={`${precision}%`} />
              <LessonSummaryStat label="Fôlego" value="0/5" />
            </div>

            <Card className="mt-6 p-4 text-left">
              <div className="text-sm font-semibold text-ink">Pontos fracos</div>
              {mistakes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {mistakes.slice(0, 5).map((mistake, index) => (
                    <div key={`${mistake.prompt}-${index}`} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <div className="font-medium text-ink">{mistake.prompt}</div>
                      <div className="mt-0.5 text-ink-soft">
                        Correto: <span className="font-medium text-ink">{mistake.correction}</span>
                        {mistake.detail ? <span className="text-ink-faint"> - {mistake.detail}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">Refaça a etapa para firmar os exercícios avaliados.</p>
              )}
            </Card>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Button className="w-full" onClick={retryLesson}>
                <IconRefresh width={17} height={17} /> Refazer lição
              </Button>
              <Link to="/treino">
                <Button variant="outline" className="w-full">
                  <IconTarget width={17} height={17} /> Treinar revisão
                </Button>
              </Link>
              <Button
                variant="soft"
                className="w-full"
                onClick={recoverWithQi}
                disabled={points < BREATH_RECOVERY_QI_COST}
              >
                <IconFlame width={17} height={17} />
                Recuperar com Qi
              </Button>
            </div>
            {(inventory["shop-breath"] ?? 0) > 0 ? (
              <Button variant="primary" className="mt-2 w-full" onClick={recoverWithBreathItem}>
                <IconFlame width={17} height={17} />
                Usar Recuperar Fôlego ({inventory["shop-breath"]})
              </Button>
            ) : (
              <Link to="/loja" className="mt-2 block">
                <Button variant="outline" className="w-full">
                  Comprar Recuperar Fôlego na Loja
                </Button>
              </Link>
            )}
            {points < BREATH_RECOVERY_QI_COST && (
              <Link to="/missoes" className="mt-2 block">
                <Button variant="soft" className="w-full">
                  <IconStar width={16} height={16} /> Ganhar Qi em missões
                </Button>
              </Link>
            )}
            <p className="mt-3 text-xs leading-5 text-ink-faint">
              Recuperar custa {BREATH_RECOVERY_QI_COST} Qi e devolve o fôlego para continuar praticando esta tentativa.
              Você também pode estocar o item na Loja.
            </p>
          </section>
        </div>
      );
    }

    if (!passed) {
      return (
        <div className="mx-auto max-w-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {recoveryDebugPanel}
          <section className="rounded-[30px] border border-line bg-surface px-4 pb-5 pt-7 text-center shadow-lift sm:px-7">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <IconRefresh width={30} height={30} />
            </div>

            <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Quase lá
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
              {lesson.isReview
                ? `Você precisa de ${passRequirementLabel} de precisão para passar esta revisão de módulo.`
                : `Você precisa de ${passRequirementLabel} para concluir esta etapa.`}
            </p>

            <div className="mt-5 flex justify-center gap-2">
              {[1, 2, 3].map((n) => (
                <IconStar
                  key={n}
                  width={38}
                  height={38}
                  className={n <= stars ? "text-accent" : "text-line"}
                  fill={n <= stars ? "currentColor" : "none"}
                />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
              <LessonSummaryStat label="Progresso" value={`${stars}/3 estrelas`} />
              <LessonSummaryStat label="Precisão" value={`${precision}%`} />
              <LessonSummaryStat label="Necessário" value={passRequirementLabel} />
              <LessonSummaryStat label="Ajuda" value={`${helpCount}`} />
            </div>

            <div className="mt-6 rounded-2xl border border-accent-soft bg-accent-soft/45 px-4 py-3 text-left text-sm text-ink-soft">
              {lesson.isReview
                ? "A revisão de módulo mede domínio razoável. Os erros entram na revisão para você reforçar antes de tentar de novo."
                : stars === 2
                ? "Você chegou perto. Refaça os pontos fracos e busque uma rodada sem erros para liberar a próxima lição."
                : "Vale revisar com calma antes de tentar de novo. O objetivo é sair com a estrutura firme, não só avançar."}
            </div>

            <Card className="mt-6 p-4 text-left">
              <div className="text-sm font-semibold text-ink">Erros principais</div>
              {mistakes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {mistakes.slice(0, 4).map((mistake, index) => (
                    <div key={`${mistake.prompt}-${index}`} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <div className="font-medium text-ink">{mistake.prompt}</div>
                      <div className="mt-0.5 text-ink-soft">
                        Correto: <span className="font-medium text-ink">{mistake.correction}</span>
                        {mistake.detail ? <span className="text-ink-faint"> - {mistake.detail}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">
                  Refaça a etapa para consolidar os exercícios avaliados.
                </p>
              )}
            </Card>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Button className="w-full" onClick={retryLesson}>
                <IconRefresh width={17} height={17} /> Refazer partes fracas
              </Button>
              <Link to="/treino">
                <Button variant="outline" className="w-full">
                  <IconTarget width={17} height={17} /> Treinar antes
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={() => navigate("/jornada")}>
                Voltar à jornada
              </Button>
            </div>
          </section>
        </div>
      );
    }

    const allRewards: RewardGrant[] = [
      {
        id: `lesson:${lesson.id}:qi`,
        type: "qi" as const,
        amount: lessonReward,
        source: "Conclusão de lição",
      },
      ...(stars === 3
        ? [{
            id: `lesson:${lesson.id}:pearl`,
            type: "dragonPearl" as const,
            amount: 1,
            source: "Precisão alta",
          }]
        : []),
      ...(stars === 3 && !badges.includes("Precisão Serena")
        ? [{
            id: "badge:precisao-serena",
            type: "badge" as const,
            amount: 1,
            source: "Precisão Serena",
          }]
        : []),
    ].filter((reward) => reward.amount > 0);
    const newRewards = allRewards.filter((reward) => !rewardHistory.some((entry) => entry.id === reward.id));
    const shouldShowStreak = dailyGoalReached;
    const saveStatusLabel = progressSaveLabel(authMode, cloudSyncState.status);
    // Recompensas extras além de XP/Qi (pérola, medalha) viram chips no card.
    const extraRewards = allRewards.filter((reward) => reward.type !== "qi");
    const hasUnclaimedRewards = newRewards.length > 0 && !claimedRewardCards;
    const topSummaryStats = [
      {
        label: "Frases",
        value: `${sessionSummary?.phrases ?? 0}${(sessionSummary?.newPhrases ?? 0) > 0 ? ` (${sessionSummary?.newPhrases} novas)` : ""}`,
      },
      { label: "Hànzì", value: `${sessionSummary?.hanzi ?? 0}` },
      { label: "Tons", value: `${sessionSummary?.tones ?? 0}` },
    ];

    // Resgata as recompensas no próprio card (sem uma segunda tela longa).
    function claimLessonRewards() {
      if (claimedRewardCards) return;
      let claimed = false;
      const attemptId = attemptIdRef.current ?? `${lesson.id}:${attemptStartedAtRef.current}`;
      const noSkip = skippedStepsRef.current === 0;
      const qiReward = newRewards.find((reward) => reward.type === "qi");
      if (qiReward && qiReward.amount > 0) {
        claimed = grantLessonReward({ lessonId: lesson.id, attemptId, stars, noSkip }) || claimed;
      }
      for (const reward of newRewards.filter((reward) => reward.type !== "qi")) {
        claimed = claimReward(reward) || claimed;
      }
      if (claimed) playSoundFx("qiGain", soundEffects);
      setClaimedRewardCards(true);
    }

    function continueJourney() {
      if (shouldShowStreak) setPostLessonView("streak");
      else navigate("/jornada");
    }

    // Botão principal: 1º toque resgata (se houver), depois segue a jornada.
    function handlePrimaryAction() {
      if (hasUnclaimedRewards) {
        claimLessonRewards();
        return;
      }
      continueJourney();
    }

    function continueAfterStreak() {
      const streakRewards: RewardGrant[] = [
        {
          id: `daily-streak:${today.date}:qi`,
          type: "qi",
          amount: DAILY_GOAL_QI,
          source: "Meta diária",
        },
        ...(STREAK_MILESTONES.includes(streak)
          ? [{
              id: `daily-streak:${today.date}:pearl`,
              type: "dragonPearl" as const,
              amount: 1,
              source: `${dayCountLabel(streak)} de sequência`,
            }]
          : []),
        ...(streak >= 3 && (streak % 7 === 0 || isPremium)
          ? [{
              id: `daily-streak:${today.date}:shield`,
              type: "streakShield" as const,
              amount: 1,
              source: "Sequência protegida",
            }]
          : []),
      ];
      let claimed = false;
      for (const reward of streakRewards) claimed = claimReward(reward) || claimed;
      if (claimed) playSoundFx("streak", soundEffects);
      navigate("/jornada");
    }

    if (postLessonView === "streak") {
      const nextMilestone = nextStreakMilestone(streak);
      const daysLeft = Math.max(0, nextMilestone - streak);
      return (
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col px-1 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
          <div className="flex flex-1 flex-col rounded-[34px] border border-accent-soft bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.24),rgb(var(--surface))_50%,rgb(var(--bg))_100%)] p-5 shadow-lift sm:p-6">
            <div className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-[34px] bg-accent text-white shadow-lift longyu-success-bloom">
              <IconFlame width={54} height={54} fill="currentColor" />
            </div>
            <h1 className="mt-5 font-serif text-3xl font-semibold text-ink">
              {dayCountLabel(streak)} de sequência!
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
              Volte amanhã para manter o fogo aceso.
            </p>

            <div className="mt-6 rounded-[24px] border border-line bg-surface/85 px-4 py-4 text-left shadow-card">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">Próximo marco</span>
                <span className="text-ink-soft">{nextMilestone} dias</span>
              </div>
              <ProgressBar value={streak} max={nextMilestone} className="mt-3" />
              <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <IconShield width={18} height={18} className="text-accent" />
                {daysLeft > 0 ? `Faltam ${dayCountLabel(daysLeft)}.` : "Marco alcançado."}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {STREAK_MILESTONES.map((mark) => (
                <div
                  key={mark}
                  className={[
                    "rounded-2xl border px-2 py-3",
                    streak >= mark ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-faint",
                  ].join(" ")}
                >
                  <div className="font-serif text-lg font-semibold">{mark}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em]">dias</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-surface/80 px-4 py-3 text-left text-sm text-ink-soft">
              {streakShields > 0 ? `${streakShields} escudo(s) protegendo sua sequência.` : "Escudos aparecem em marcos especiais."}
            </div>

            <Button className="mt-auto w-full shadow-lift sm:mt-6" size="lg" onClick={continueAfterStreak}>
              Continuar jornada
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {recoveryDebugPanel}
        <section className="flex flex-1 flex-col overflow-hidden rounded-[26px] border border-accent-soft bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.18),rgb(var(--surface))_40%,rgb(var(--bg))_100%)] px-4 pb-0 pt-3 text-center shadow-lift sm:px-6">
          {/* 1 · Resultado principal — mascote pequeno, título, estrelas, chips. */}
          <div className="mx-auto inline-flex rounded-full bg-surface/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent shadow-card">
            {lesson.title}
          </div>
          <div className="relative mx-auto mt-1 h-16 w-20 shrink-0">
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <Mascot size={62} variant="celebrate" />
            </div>
            {[0, 1, 2].map((n) => (
              <IconStar
                key={n}
                width={12 + n * 2}
                height={12 + n * 2}
                className={[
                  "longyu-star-spark absolute text-accent",
                  n === 0 ? "left-1 top-7" : n === 1 ? "right-1 top-1" : "right-4 bottom-1",
                ].join(" ")}
                fill="currentColor"
                style={{ animationDelay: `${n * 90}ms` }}
              />
            ))}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {stars === 3 ? "Lição concluída!" : "Você avançou!"}
          </h1>
          <p className="mx-auto mt-0.5 text-xs text-ink-soft sm:text-sm">{victoryTitle}</p>

          <div className="mt-2 flex items-center justify-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <IconStar
                key={n}
                width={26}
                height={26}
                className={n <= stars ? "longyu-star-spark text-accent" : "text-line"}
                fill={n <= stars ? "currentColor" : "none"}
                style={{ animationDelay: `${n * 80}ms` }}
              />
            ))}
          </div>

          {recovered && (
            <div className="mx-auto mt-2.5 rounded-xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.1)] px-3 py-2 text-xs font-semibold text-[rgb(var(--good))]">
              Erros corrigidos! Você recuperou 3 estrelas e liberou a próxima lição.
            </div>
          )}

          {/* Métricas compactas em chips (substitui os 6 cards grandes). */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <MetricChip value={`+${lessonXp}`} label="XP" tone="accent" />
            <MetricChip value={`+${lessonReward}`} label="Qi" tone="neutral" />
            <MetricChip value={`${precision}%`} label="precisão" tone={precision >= 80 ? "good" : "neutral"} />
            {extraRewards.map((reward) => (
              <MetricChip
                key={reward.id}
                value={reward.type === "badge" ? reward.source : rewardLabel(reward)}
                icon={<span className="hanzi text-base leading-none">{rewardIcon(reward)}</span>}
                tone="gold"
              />
            ))}
          </div>
          <div className="mt-2 text-[11px] text-ink-faint">
            {saveStatusLabel} · XP total agora {postLessonXpTotal}
            {claimedRewardCards && <span className="text-[rgb(var(--good))]"> · recompensas recebidas ✓</span>}
          </div>

          {/* 2 · Próximo foco — card compacto com CTA. */}
          <div className="mt-2.5 flex flex-col gap-2 rounded-2xl border border-line bg-surface/85 p-3 text-left shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Próximo foco</div>
              <div className="mt-0.5 text-sm font-semibold text-ink">{nextFocus.title}</div>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">{nextFocus.desc}</p>
            </div>
            <Link to={nextFocus.to} className="shrink-0">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {nextFocus.cta} <IconChevron width={15} height={15} />
              </Button>
            </Link>
          </div>

          {/* 4 · Detalhes opcionais — tudo em accordions, fechado por padrão. */}
          <div className="mt-2.5 grid gap-1.5 text-left">
            <CollapsibleInfoCard title="Ver detalhes" compactLabel={`~${estimatedMinutes} min`}>
              <div className="grid grid-cols-3 gap-2">
                {topSummaryStats.map((item) => (
                  <LessonSummaryStat key={item.label} label={item.label} value={item.value} />
                ))}
                <LessonSummaryStat label="Precisão" value={`${precision}%`} />
                <LessonSummaryStat
                  label="Erros corrigidos"
                  value={committedErrors.length > 0 ? `${correctedCount}/${committedErrors.length}` : "0"}
                />
                <LessonSummaryStat label="P/ revisão" value={`${reviewItemsAdded}`} />
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {sessionSummaryLine} Foram ~{estimatedMinutes} min de prática
                {reviewItemsAdded > 0 ? ` e ${reviewItemsAdded} itens entraram na revisão.` : "."}
              </p>
            </CollapsibleInfoCard>

            <CollapsibleInfoCard
              title="Missões atualizadas"
              compactLabel={missionHighlights.length > 0 ? `${missionHighlights.length} atualizada(s)` : `${monthlyProgress}/${MONTHLY_GOAL} mensal`}
              defaultOpen={false}
            >
              <ProgressBar value={monthlyProgress} max={MONTHLY_GOAL} className="h-2" />
              {missionHighlights.length > 0 ? (
                <div className="mt-2.5 grid gap-2">
                  {missionHighlights.map((mission) => (
                    <MissionUpdateCard key={`${mission.scope}:${mission.id}`} mission={mission} />
                  ))}
                </div>
              ) : (
                <div className="mt-2.5 rounded-[16px] border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-soft">
                  Continue praticando para completar a próxima missão.
                </div>
              )}
              <Link to="/missoes" className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                Ver missões <IconChevron width={13} height={13} />
              </Link>
            </CollapsibleInfoCard>

            {(suggestsPinyinLab || suggestsHanziLab) && (
              <CollapsibleInfoCard title="Reforço guiado" compactLabel="Prática curta">
                <div className="text-sm font-medium text-ink">Quer reforçar este ponto?</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestsPinyinLab && (
                    <Link to="/pinyin">
                      <Button variant="outline" size="sm">
                        <IconSound width={15} height={15} /> Pinyin Lab
                      </Button>
                    </Link>
                  )}
                  {suggestsHanziLab && (
                    <Link to="/hanzi">
                      <Button variant="outline" size="sm">
                        <IconHanzi width={15} height={15} /> Hànzì Lab
                      </Button>
                    </Link>
                  )}
                </div>
              </CollapsibleInfoCard>
            )}

            <CollapsibleInfoCard title="Deixar feedback" compactLabel="Opcional">
              <FeedbackPrompt
                context={{ screen: `/licao/${lesson.id}/player — lição concluída` }}
                compact
                className="border-line/70"
              />
            </CollapsibleInfoCard>

            {!isPremium && committedErrors.length >= 3 && (
              <div className="rounded-[18px] border border-[#B7791F]/25 bg-[#B7791F]/[0.07] px-3 py-2.5 text-left shadow-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Longyu Pro</div>
                <p className="mt-0.5 text-xs leading-5 text-ink">
                  Dificuldade com {weakSkillsLabel}? O Pro cria uma revisão focada. Corrigir esta lição é sempre grátis.
                </p>
                <Button variant="soft" size="sm" className="mt-2" onClick={() => setProPaywallKind("weak_spots")}>
                  Conhecer a revisão focada
                </Button>
              </div>
            )}

            {!recovered && mistakes.length > 0 && (
              <CollapsibleInfoCard title="Enviado para revisão" compactLabel={`${mistakes.length} item(ns)`}>
                <div className="grid gap-2">
                  {mistakes.slice(0, 3).map((mistake, index) => (
                    <div key={`${mistake.prompt}-${index}`} className="rounded-xl bg-surface-2 px-3 py-2 text-xs">
                      <div className="font-medium text-ink">{mistake.prompt}</div>
                      <div className="mt-0.5 text-ink-soft">
                        Correto: <span className="font-medium text-ink">{mistake.correction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleInfoCard>
            )}
          </div>

          {/* 3 · Botão principal — sempre visível, resgata e depois continua. */}
          <div className="sticky bottom-0 -mx-4 mt-auto bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:static sm:mx-0 sm:bg-none sm:px-0">
            <div className="mb-1.5 flex items-center justify-center gap-4 text-xs font-medium text-ink-faint">
              <Link to="/revisao" className="inline-flex items-center gap-1 transition hover:text-ink">
                <IconRefresh width={14} height={14} /> Revisar
              </Link>
              <Link to="/biblioteca" className="inline-flex items-center gap-1 transition hover:text-ink">
                <IconLibrary width={14} height={14} /> Biblioteca
              </Link>
              <Link to="/treino" className="inline-flex items-center gap-1 transition hover:text-ink">
                <IconTarget width={14} height={14} /> Treinar
              </Link>
            </div>
            <Button className="w-full shadow-lift" size="lg" onClick={handlePrimaryAction}>
              {hasUnclaimedRewards ? "Receber recompensas" : "Continuar Jornada"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        </section>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "qi"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  const step = lesson.steps[idx];
  const canSkipStep = isGradedStep(step);
  const canPayRetry = isPremium || points >= RETRY_COST_QI;
  const activeRoundProgress = lessonRoundProgressForStep(lesson.steps, idx, lessonTasks.length);
  const activeStageIndex = Math.min(Math.max(0, lessonTasks.length - 1), activeRoundProgress.stageIndex);
  const activeStage = lessonTasks[activeStageIndex];
  // Linha única e discreta abaixo da barra: etapa + intenção + nº da pergunta.
  const stageLabel = activeStage
    ? [
        `Etapa ${activeStageIndex + 1}/${lessonTasks.length}`,
        roundSummary(step, activeStage),
        activeRoundProgress.questionCount > 1
          ? `pergunta ${activeRoundProgress.questionIndex}/${activeRoundProgress.questionCount}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-0">
      {correctBurst && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-correct-pop rounded-full bg-[rgb(var(--good)/0.14)] px-4 py-2 text-sm font-semibold text-[rgb(var(--good))] shadow-card">
            {correctBurst}
          </div>
        </div>
      )}
      {streakBurst > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-streak-burst rounded-full border border-accent-soft bg-surface px-4 py-2 text-sm font-semibold text-accent shadow-card">
            Sequência x{streakBurst} 🔥
          </div>
        </div>
      )}
      <LessonFocusHeader
        onExit={exitLesson}
        progressValue={idx + 1}
        progressMax={total}
        lives={lives}
        maxLives={DRAGON_BREATH_LIVES}
        unlimitedLives={hasUnlimitedLives}
        stageLabel={stageLabel}
      />

      {recoveryDebugPanel}

      {retryProtected && (
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-soft bg-accent-soft/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            <IconShield width={13} height={13} /> Tentativa protegida
          </span>
        </div>
      )}

      <Card className="mx-auto overflow-visible rounded-[24px] p-4 shadow-lift sm:p-6">
        <StepRenderer
          key={`${idx}:${stepAttempt}`}
          step={step}
          onDone={handleDone}
          onSkip={canSkipStep ? skipCurrentStep : undefined}
          onMistake={canSkipStep ? registerCurrentMistake : undefined}
        />
      </Card>

      {/* Painel de retry: pausa o avanço até o aluno decidir. Fica abaixo do
          {/* ProPaywall (z-50) abre por cima do overlay de erro. */}
      {pendingMistake && (
        <ModalOverlay
          label="Você errou esta questão"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-line bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center shadow-lift sm:rounded-[28px] sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-wrong-soft text-wrong">
              <IconX width={24} height={24} />
            </div>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">
              Quase. Quer tentar de novo?
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Refaça esta questão sem perder a estrela.
            </p>

            <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-left text-sm">
              <div className="font-medium text-ink">{pendingMistake.prompt}</div>
              <div className="mt-2 text-ink-soft">
                Resposta correta: <span className="font-medium text-ink">{pendingMistake.correction}</span>
              </div>
              {pendingMistake.detail ? (
                <p className="mt-1 text-ink-faint">{pendingMistake.detail}</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Custo</div>
                  <div className="mt-1 font-semibold text-ink">{isPremium ? 0 : RETRY_COST_QI} Qi</div>
                </div>
                <div className="rounded-xl bg-surface px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Saldo</div>
                  <div className="mt-1 font-semibold text-ink">{points} Qi</div>
                </div>
              </div>
            </div>

            {isPremium ? (
              <p className="mt-3 text-sm font-semibold text-accent">Pro: refazer sem gastar Qi.</p>
            ) : canPayRetry ? (
              <p className="mt-3 text-sm text-ink-soft">
                Custa {RETRY_COST_QI} Qi. <span className="text-ink-faint">Você tem {points} Qi.</span>
              </p>
            ) : (
              <p className="mt-3 rounded-xl bg-wrong-soft px-3 py-2 text-sm font-medium text-wrong">
                Você está sem Qi para refazer sem perder perfeição. Missões dão Qi sem comprar progresso.
              </p>
            )}

            <div className="mt-4 grid gap-2">
              {canPayRetry ? (
                <>
                  <Button size="lg" className="w-full" onClick={retryWithQi}>
                    {isPremium ? "Tentar de novo sem Qi" : `Tentar de novo por ${RETRY_COST_QI} Qi`}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={continueWithMistake}>
                    Continuar e perder perfeição
                  </Button>
                  {!isPremium && (
                    <Button variant="soft" className="w-full" onClick={() => {
                      playSoundFx("blocked", soundEffects);
                      setProPaywallKind("qi");
                    }}>
                      Ver Pro
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="lg" className="w-full" onClick={continueWithMistake}>
                    Continuar e perder perfeição
                  </Button>
                  <Link to="/missoes">
                    <Button variant="outline" className="w-full">
                      <IconStar width={16} height={16} /> Ganhar Qi em missões
                    </Button>
                  </Link>
                  <Button variant="soft" className="w-full" onClick={() => {
                    playSoundFx("blocked", soundEffects);
                    setProPaywallKind("qi");
                  }}>
                    Ver Longyu Pro
                  </Button>
                </>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-faint">
              Continuar sem refazer custa 1 Fôlego e avança sem manter perfeição.
            </p>
          </div>
        </ModalOverlay>
      )}
      <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "qi"} onClose={() => setProPaywallKind(null)} />
      <ProPaywall
        open={contextualOffer.open && proPaywallKind === null}
        kind={contextualOffer.offer?.paywallKind ?? "training"}
        offer={contextualOffer.offer}
        onClose={contextualOffer.dismiss}
      />
    </div>
  );
}
