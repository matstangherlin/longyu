import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, getLesson, POST_CONVERSATION_TASK_LABELS, type LessonStep, type Skill, type StepKind } from "../../data/journey";
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
import {
  registerConversationVocabularyInSrs,
  resolveConversationErrorRefs,
} from "../../lib/conversationVocabularySrs";
import { conversationSceneById } from "../../data/conversationScenes";
import { manifestFromConversationStep } from "./lessonTasks";
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
import { useFeedbackUi } from "../../components/feedback/FeedbackContext";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { trackPedagogyEvent } from "../../services/pedagogyEvents";
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
      <div className="font-semibold text-ink">DEV revisÃ£o da liÃ§Ã£o</div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <span>
          lessonId: <code className="text-ink">{lessonId}</code>
        </span>
        <span>estrelas: {stars}/3</span>
        <span>erros pendentes: {pendingErrors}</span>
        <span>erros recuperados: {recoveredErrors}</span>
        <span className="sm:col-span-2">prÃ³xima liÃ§Ã£o: {nextUnlockLabel}</span>
      </div>
    </div>
  );
}

function normalizeHanzi(text: string): string {
  return text.replace(/[ï¼Œã€‚ï¼ï¼Ÿã€,.!?ï¼Ÿ\s]/g, "");
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
      correction: `${step.tone}Âº tom`,
      detail: step.pinyin,
    };
  }
  if (step.kind === "comprehend") {
    return {
      prompt: step.hanzi ?? "CompreensÃ£o",
      correction: step.answer ?? "Reveja a resposta correta",
      detail: step.pinyin,
    };
  }
  if (step.kind === "produce") {
    return {
      prompt: step.pt ?? "ProduÃ§Ã£o",
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
        "ExercÃ­cio",
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
    correction: step.answer ?? step.pt ?? "Reveja este ponto na prÃ³xima tentativa",
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

// Chip compacto para as mÃ©tricas do fim de liÃ§Ã£o (XP, Qi, precisÃ£o, estrelas).
// Substitui os cards grandes: a mesma informaÃ§Ã£o em uma linha, estilo app.
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

const LESSON_RESUME_PREFIX = "longyu:lesson-resume:v1";
const LESSON_RESUME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface LessonResumeSnapshot {
  version: 1;
  lessonId: string;
  stepIndex: number;
  stepKey: string;
  correct: number;
  lives: number;
  updatedAt: number;
}

function lessonResumeStorageKey(lessonId: string): string {
  return `${LESSON_RESUME_PREFIX}:${lessonId}`;
}

function lessonStepResumeKey(step: LessonStep | undefined): string {
  if (!step) return "missing";
  return [step.kind, step.sceneId ?? "", step.title ?? "", step.postConversationTaskType ?? ""].join(":");
}

function readLessonResume(lessonId: string): LessonResumeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lessonResumeStorageKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonResumeSnapshot;
    if (
      parsed.version !== 1 ||
      parsed.lessonId !== lessonId ||
      !Number.isFinite(parsed.updatedAt) ||
      Date.now() - parsed.updatedAt > LESSON_RESUME_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(lessonResumeStorageKey(lessonId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLessonResume(snapshot: LessonResumeSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lessonResumeStorageKey(snapshot.lessonId), JSON.stringify(snapshot));
  } catch {
    // O store principal continua sendo a fonte de verdade se storage estiver indisponÃ­vel.
  }
}

function clearLessonResume(lessonId: string | undefined): void {
  if (!lessonId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(lessonResumeStorageKey(lessonId));
  } catch {
    // A expiraÃ§Ã£o impede que uma entrada antiga seja restaurada indefinidamente.
  }
}

function roundKindSet(step: LessonRoundStep, stage?: LessonTask): Set<StepKind> {
  return new Set([...(step.exercises ?? []), ...(stage?.stepKinds ?? []), step.kind]);
}

function roundSummary(step: LessonRoundStep, stage?: LessonTask): string {
  if (step.postConversationPhase) {
    const label =
      (step.postConversationTaskType && POST_CONVERSATION_TASK_LABELS[step.postConversationTaskType]) ||
      step.title ||
      "PÃ³s-Conversa";
    const progress =
      step.postConversationIndex && step.postConversationCount
        ? ` (${step.postConversationIndex}/${step.postConversationCount})`
        : "";
    return `PÃ³s-Conversa${progress}: ${label}`;
  }
  const kinds = roundKindSet(step, stage);
  const hasOldVocabulary = Boolean(step.reusesPreviousVocabulary?.length);
  const hasTone = kinds.has("tone") || kinds.has("tone_pair");
  const hasPinyin = hasTone || kinds.has("dialogue_choice") || kinds.has("listen_select");
  const hasHanzi = kinds.has("hanzi_build") || kinds.has("recognize") || kinds.has("decompose") || kinds.has("hanzi_evolution");
  const hasAssembly = kinds.has("sentence_build") || kinds.has("translation_build") || kinds.has("fill_blank") || kinds.has("produce");

  if (step.lessonStageId === "consolidation") {
    if (hasTone && hasOldVocabulary) return "Vamos misturar tons e palavras que vocÃª jÃ¡ viu.";
    if (hasHanzi && hasOldVocabulary) return "Vamos reconhecer hÃ nzÃ¬ junto com conteÃºdo antigo.";
    if (hasOldVocabulary) return "RevisÃ£o rÃ¡pida com palavras que jÃ¡ apareceram.";
    return "Vamos fixar o ponto principal antes de seguir.";
  }
  if (hasTone && hasOldVocabulary) return "Vamos misturar tons e palavras que vocÃª jÃ¡ viu.";
  if (hasTone) return "Escute o contorno e ligue som, tom e pinyin.";
  if (hasPinyin) return "Use o pinyin como ponte para reconhecer o som.";
  if (hasHanzi) return "Observe a forma e conecte hÃ nzÃ¬, som e sentido.";
  if (hasAssembly) return "Monte a frase em pedaÃ§os curtos.";
  if (kinds.has("dialogue_choice") || kinds.has("conversation_scene")) return "Escolha a resposta que combina com a situaÃ§Ã£o.";
  if (kinds.has("microread")) return "Leia um trecho curto e procure o sentido geral.";
  return "Pratique este ponto em uma rodada curta.";
}

const VICTORY_TITLES = [
  "A jornada continua!",
  "Etapa concluÃ­da!",
  "Seu dragÃ£o ficou mais forte!",
  "VocÃª dominou mais um passo!",
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
  if (reward.type === "qi") return `Qi do DragÃ£o x${reward.amount}`;
  if (reward.type === "dragonPearl") return `PÃ©rolas do DragÃ£o x${reward.amount}`;
  if (reward.type === "streakShield") return `Escudo de sequÃªncia x${reward.amount}`;
  return reward.source;
}

function rewardIcon(reward: RewardGrant): string {
  if (reward.type === "qi") return "æ°”";
  if (reward.type === "dragonPearl") return "ç ";
  if (reward.type === "streakShield") return "ç›¾";
  return "ç« ";
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

/** Prefer chunk como unidade pedagÃ³gica; sÃ³ cai em chars soltos se nÃ£o houver chunk. */
function pedagogicalTextTargets(
  text: string | undefined,
  domain: ReviewDomain,
  track: Track
): LessonReviewTarget[] {
  const chunk = findChunkByText(text);
  if (chunk) return [{ type: "chunk", itemId: chunk.id, domain, track }];
  return charsInText(text).map((char) => ({ type: "char" as const, itemId: char.id, domain, track }));
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
      addText(ha…27244 tokens truncated…-3 text-center shadow-lift sm:px-6">
          {/* 1 Â· Resultado principal â€” mascote pequeno, tÃ­tulo, estrelas, chips. */}
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
            {stars === 3 ? "LiÃ§Ã£o concluÃ­da!" : "VocÃª avanÃ§ou!"}
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
              Erros corrigidos! VocÃª recuperou 3 estrelas e liberou a prÃ³xima liÃ§Ã£o.
            </div>
          )}

          {/* MÃ©tricas compactas em chips (substitui os 6 cards grandes). */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <MetricChip value={`+${lessonXp}`} label="XP" tone="accent" />
            <MetricChip value={`+${lessonReward}`} label="Qi" tone="neutral" />
            <MetricChip value={`${precision}%`} label="precisÃ£o" tone={precision >= 80 ? "good" : "neutral"} />
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
            {saveStatusLabel} Â· XP total agora {postLessonXpTotal}
            {claimedRewardCards && <span className="text-[rgb(var(--good))]"> Â· recompensas recebidas âœ“</span>}
          </div>

          {/* 2 Â· PrÃ³ximo foco â€” card compacto com CTA. */}
          <div className="mt-2.5 flex flex-col gap-2 rounded-2xl border border-line bg-surface/85 p-3 text-left shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">PrÃ³ximo foco</div>
              <div className="mt-0.5 text-sm font-semibold text-ink">{nextFocus.title}</div>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">{nextFocus.desc}</p>
            </div>
            <Link to={nextFocus.to} className="shrink-0">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {nextFocus.cta} <IconChevron width={15} height={15} />
              </Button>
            </Link>
          </div>

          {/* 4 Â· Detalhes opcionais â€” tudo em accordions, fechado por padrÃ£o. */}
          <div className="mt-2.5 grid gap-1.5 text-left">
            <CollapsibleInfoCard title="Ver detalhes" compactLabel={`~${estimatedMinutes} min`}>
              <div className="grid grid-cols-3 gap-2">
                {topSummaryStats.map((item) => (
                  <LessonSummaryStat key={item.label} label={item.label} value={item.value} />
                ))}
                <LessonSummaryStat label="PrecisÃ£o" value={`${precision}%`} />
                <LessonSummaryStat
                  label="Erros corrigidos"
                  value={committedErrors.length > 0 ? `${correctedCount}/${committedErrors.length}` : "0"}
                />
                <LessonSummaryStat label="P/ revisÃ£o" value={`${reviewItemsAdded}`} />
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {sessionSummaryLine} Foram ~{estimatedMinutes} min de prÃ¡tica
                {reviewItemsAdded > 0 ? ` e ${reviewItemsAdded} itens entraram na revisÃ£o.` : "."}
              </p>
            </CollapsibleInfoCard>

            <CollapsibleInfoCard
              title="MissÃµes atualizadas"
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
                  Continue praticando para completar a prÃ³xima missÃ£o.
                </div>
              )}
              <Link to="/missoes" className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                Ver missÃµes <IconChevron width={13} height={13} />
              </Link>
            </CollapsibleInfoCard>

            {(suggestsPinyinLab || suggestsHanziLab) && (
              <CollapsibleInfoCard title="ReforÃ§o guiado" compactLabel="PrÃ¡tica curta">
                <div className="text-sm font-medium text-ink">Quer reforÃ§ar este ponto?</div>
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
                        <IconHanzi width={15} height={15} /> HÃ nzÃ¬ Lab
                      </Button>
                    </Link>
                  )}
                </div>
              </CollapsibleInfoCard>
            )}

            <CollapsibleInfoCard title="Deixar feedback" compactLabel="Opcional">
              <FeedbackPrompt
                context={{
                  screen: `/licao/${lesson.id}/player`,
                  route: `/licao/${lesson.id}/player`,
                  lessonId: lesson.id,
                  exerciseKind: committedErrors[0]?.step?.kind ?? lesson.steps[Math.min(idx, lesson.steps.length - 1)]?.kind,
                  exerciseIndex: (() => {
                    const fromQuestion = committedErrors[0]?.questionId?.match(/:(\d+):/)?.[1];
                    if (fromQuestion != null) return Number(fromQuestion);
                    return Math.min(idx, lesson.steps.length - 1);
                  })(),
                  activityProblem: committedErrors.length > 0,
                }}
                compact
                className="border-line/70"
              />
            </CollapsibleInfoCard>

            {!isPremium && committedErrors.length >= 3 && (
              <div className="rounded-[18px] border border-[#B7791F]/25 bg-[#B7791F]/[0.07] px-3 py-2.5 text-left shadow-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Longyu Pro</div>
                <p className="mt-0.5 text-xs leading-5 text-ink">
                  Dificuldade com {weakSkillsLabel}? O Pro cria uma revisÃ£o focada. Corrigir esta liÃ§Ã£o Ã© sempre grÃ¡tis.
                </p>
                <Button variant="soft" size="sm" className="mt-2" onClick={() => setProPaywallKind("weak_spots")}>
                  Conhecer a revisÃ£o focada
                </Button>
              </div>
            )}

            {!recovered && mistakes.length > 0 && (
              <CollapsibleInfoCard title="Enviado para revisÃ£o" compactLabel={`${mistakes.length} item(ns)`}>
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

          {/* 3 Â· BotÃ£o principal â€” sempre visÃ­vel, resgata e depois continua. */}
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
  // Linha Ãºnica e discreta abaixo da barra: etapa + intenÃ§Ã£o + nÂº da pergunta.
  const stageLabel = activeStage
    ? [
        `Etapa ${activeStageIndex + 1}/${lessonTasks.length}`,
        roundSummary(step, activeStage),
        activeRoundProgress.questionCount > 1
          ? `pergunta ${activeRoundProgress.questionIndex}/${activeRoundProgress.questionCount}`
          : "",
      ]
        .filter(Boolean)
        .join(" Â· ")
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
            SequÃªncia x{streakBurst} ðŸ”¥
          </div>
        </div>
      )}
      <LessonFocusHeader
        onExit={exitLesson}
        onReport={() =>
          openFeedback({
            screen: `/licao/${lesson.id}/player`,
            route: `/licao/${lesson.id}/player`,
            lessonId: lesson.id,
            exerciseKind: lesson.steps[idx]?.kind,
            exerciseIndex: idx,
            activityProblem: true,
          })
        }
        progressValue={idx + 1}
        progressMax={total}
        lives={lives}
        maxLives={DRAGON_BREATH_LIVES}
        unlimitedLives={hasUnlimitedLives}
        stageLabel={stageLabel}
      />

      {recoveryDebugPanel}

      {step.postConversationPhase && step.postConversationIndex === 1 && (
        <div role="status" aria-live="polite" data-testid="post-conversation-transition" className="mb-3 rounded-2xl border border-accent-soft bg-accent-soft/35 px-3 py-2.5 text-sm text-ink-soft sm:px-4">
          <span className="font-semibold text-accent">Conversa concluÃ­da Â· PÃ³s-Conversa</span>
          <span className="mx-1.5 text-ink-faint">Â·</span>
          Agora fixe o vocabulÃ¡rio e as respostas em tarefas curtas de memorizaÃ§Ã£o.
        </div>
      )}

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

      {/* Painel de retry: pausa o avanÃ§o atÃ© o aluno decidir. Fica abaixo do
          {/* ProPaywall (z-50) abre por cima do overlay de erro. */}
      {pendingMistake && (
        <ModalOverlay
          label="VocÃª errou esta questÃ£o"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-line bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center shadow-lift sm:rounded-[28px] sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-wrong-soft text-wrong">
              <IconX width={24} height={24} />
            </div>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">
              Quase. Quer tentar de novo?
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              RefaÃ§a esta questÃ£o sem perder a estrela.
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
                Custa {RETRY_COST_QI} Qi. <span className="text-ink-faint">VocÃª tem {points} Qi.</span>
              </p>
            ) : (
              <p className="mt-3 rounded-xl bg-wrong-soft px-3 py-2 text-sm font-medium text-wrong">
                VocÃª estÃ¡ sem Qi para refazer sem perder perfeiÃ§Ã£o. MissÃµes dÃ£o Qi sem comprar progresso.
              </p>
            )}

            <div className="mt-4 grid gap-2">
              {canPayRetry ? (
                <>
                  <Button size="lg" className="w-full" onClick={retryWithQi}>
                    {isPremium ? "Tentar de novo sem Qi" : `Tentar de novo por ${RETRY_COST_QI} Qi`}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={continueWithMistake}>
                    Continuar e perder perfeiÃ§Ã£o
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
                    Continuar e perder perfeiÃ§Ã£o
                  </Button>
                  <Link to="/missoes">
                    <Button variant="outline" className="w-full">
                      <IconStar width={16} height={16} /> Ganhar Qi em missÃµes
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
              Continuar sem refazer custa 1 FÃ´lego e avanÃ§a sem manter perfeiÃ§Ã£o.
            </p>
          </div>
        </ModalOverlay>
      )}
      <ProPaywall open={step.kind !== "conversation_scene" && proPaywallKind !== null} kind={proPaywallKind ?? "qi"} onClose={() => setProPaywallKind(null)} />
      <ProPaywall
        open={step.kind !== "conversation_scene" && contextualOffer.open && proPaywallKind === null}
        kind={contextualOffer.offer?.paywallKind ?? "training"}
        offer={contextualOffer.offer}
        onClose={contextualOffer.dismiss}
      />
    </div>
  );
}

