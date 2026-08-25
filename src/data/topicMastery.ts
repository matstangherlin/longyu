/**
 * V4.6 — Topic Mastery Path
 *
 * Reuses the existing Mastery Loop (M1 Descoberta → M2 Consolidação →
 * M3 Produção → M4 Domínio). Does not invent a parallel 4-level system.
 *
 * TM-015 — two different facts, two different flags:
 *
 *   ACQUIRED  (`completedLessons`)
 *     First valid completion of a lesson session. Legacy-compatible.
 *     Used by SRS, achievements, analytics, tool unlocks, first-completion
 *     XP/Qi, and anything that means "the student has seen this node".
 *
 *   MASTERED  (`lessonMasteryById.level >= 4`)
 *     Journey path complete for a normal teaching topic: 4/4 passes.
 *     Used by currentLessonId / lessonState / canStartLesson / unlock.
 *
 * Review / checkpoint / Review Mastery nodes are not 4-pass teaching topics.
 * For those, path complete = ACQUIRED (one session). See TopicMasteryException.
 *
 * `lessonTaskProgress` is in-session only ("Atividade X de Y"). It is never
 * the Journey ring.
 */

import type { MasteryLevel, MasteryPass, LessonMasteryRecord } from "./masteryLoop";
import { clampMasteryLevel, MASTERY_PASS_LABELS, nextMasteryPass } from "./masteryLoop";

export interface TopicLessonRef {
  id: string;
  title?: string;
  isReview?: boolean;
  reviewMasteryMode?: boolean;
  curriculumRole?: string;
}

export interface TopicMasteryProgressContext {
  completedLessons: readonly string[];
  lessonMasteryById?: Record<string, { level?: number } | undefined>;
  /**
   * When true (legacy callers that omit mastery), ACQUIRED is treated as
   * path-complete. Production UI always passes lessonMasteryById.
   */
  legacyAcquiredMeansPathComplete?: boolean;
}

export interface TopicMasterySpec {
  topicId: string;
  promise: string;
  mustUnderstand: string[];
  mustRecognize: string[];
  mustProduce: string[];
  mustTransfer: string[];
  commonMisconceptions: string[];
  passObjectives: Record<MasteryPass, string>;
  canonicalExamples: string[];
  prerequisites: string[];
  /** When set, M4 transfer is not pedagogically required. */
  transferOptionalReason?: string;
}

export type TopicMasteryExceptionKind = "review" | "review_mastery" | "system";

export interface TopicMasteryException {
  lessonId: string;
  kind: TopicMasteryExceptionKind;
  requiredPasses: 1;
  reason: string;
}

export const TOPIC_MASTERY_PASS_COUNT = 4;

export const TOPIC_MASTERY_CTA: Record<
  0 | 1 | 2 | 3 | 4,
  { primary: string; secondary?: string }
> = {
  0: { primary: "Começar", secondary: "Lição 1 de 4" },
  1: { primary: "Continuar", secondary: "Lição 2 de 4" },
  2: { primary: "Continuar", secondary: "Lição 3 de 4" },
  3: { primary: "Continuar", secondary: "Lição 4 de 4" },
  4: { primary: "Praticar novamente", secondary: "Tema dominado" },
};

/** Normal teaching node: 4/4 Topic Mastery. Reviews are explicit exceptions. */
export function isTopicMasteryLesson(lesson: TopicLessonRef | undefined | null): boolean {
  if (!lesson) return false;
  if (lesson.isReview) return false;
  if (lesson.reviewMasteryMode) return false;
  return true;
}

export function requiredMasteryPasses(lesson: TopicLessonRef): 1 | 4 {
  return isTopicMasteryLesson(lesson) ? TOPIC_MASTERY_PASS_COUNT : 1;
}

export function topicMasteryExceptionFor(lesson: TopicLessonRef): TopicMasteryException | null {
  if (lesson.reviewMasteryMode) {
    return {
      lessonId: lesson.id,
      kind: "review_mastery",
      requiredPasses: 1,
      reason:
        "Checkpoint de Review Mastery: uma sessão com níveis próprios (Recall→Transfer). Path complete = ACQUIRED, não 4/4 de ensino.",
    };
  }
  if (lesson.isReview) {
    return {
      lessonId: lesson.id,
      kind: "review",
      requiredPasses: 1,
      reason:
        "Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4.",
    };
  }
  return null;
}

export function topicMasteryLevel(
  lessonId: string,
  masteryById: TopicMasteryProgressContext["lessonMasteryById"]
): MasteryLevel {
  return clampMasteryLevel(masteryById?.[lessonId]?.level ?? 0);
}

/**
 * TM-014 — path gate for the Journey.
 * Teaching topics: masteryLevel >= 4.
 * Reviews: membership in completedLessons (ACQUIRED).
 */
export function isJourneyTopicComplete(
  lesson: TopicLessonRef,
  context: TopicMasteryProgressContext
): boolean {
  if (context.legacyAcquiredMeansPathComplete) {
    return context.completedLessons.includes(lesson.id);
  }
  if (!isTopicMasteryLesson(lesson)) {
    return context.completedLessons.includes(lesson.id);
  }
  return topicMasteryLevel(lesson.id, context.lessonMasteryById) >= 4;
}

export function currentJourneyLessonId<T extends TopicLessonRef>(
  lessons: readonly T[],
  context: TopicMasteryProgressContext
): string | undefined {
  return lessons.find((lesson) => !isJourneyTopicComplete(lesson, context))?.id;
}

export function lessonPathState<T extends TopicLessonRef>(
  lessonId: string,
  lessons: readonly T[],
  context: TopicMasteryProgressContext,
  options: { isPremium?: boolean; premium?: boolean } = {}
): "done" | "current" | "locked" | "premium" {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) return "locked";
  if (isJourneyTopicComplete(lesson, context)) return "done";
  if (options.premium && !options.isPremium) return "premium";
  const current = currentJourneyLessonId(lessons, context);
  if (lessonId !== current) return "locked";
  return "current";
}

export function topicPassForLevel(
  level: MasteryLevel,
  options: { recoveryPending?: boolean } = {}
): MasteryPass {
  return nextMasteryPass(level, { recoveryPending: options.recoveryPending });
}

export function topicPassLabel(pass: MasteryPass): string {
  return MASTERY_PASS_LABELS[pass];
}

export function topicProgressFraction(level: MasteryLevel): { done: number; total: 4 } {
  return { done: Math.max(0, Math.min(4, level)), total: 4 };
}

export function topicCtaForLevel(level: MasteryLevel, inProgress: boolean): { primary: string; secondary?: string } {
  const clamped = clampMasteryLevel(level) as 0 | 1 | 2 | 3 | 4;
  if (clamped >= 4) return TOPIC_MASTERY_CTA[4];
  const cta = TOPIC_MASTERY_CTA[clamped];
  if (clamped === 0 && inProgress) {
    return { primary: "Continuar", secondary: "Lição 1 de 4" };
  }
  return cta;
}

/**
 * TM-016 — grandfather legacy Journey progress as path-complete 4/4.
 *
 * A lesson already in completedLessons that sits BEFORE the old current
 * pointer (first lesson not in completedLessons) is treated as mastered.
 * The lesson at the old pointer keeps its existing 0–3 mastery.
 *
 * Does not relock advanced users. Does not touch SRS, XP, Qi, stars, streak,
 * lesson IDs, or review history.
 */
export function grandfatherTopicMastery<T extends TopicLessonRef>(
  lessons: readonly T[],
  completedLessons: readonly string[],
  existing: Record<string, LessonMasteryRecord> | undefined,
  now = Date.now()
): Record<string, LessonMasteryRecord> {
  const next: Record<string, LessonMasteryRecord> = { ...(existing ?? {}) };
  const acquired = new Set(completedLessons);
  const oldPointerIndex = lessons.findIndex((lesson) => !acquired.has(lesson.id));
  const lastGrandfatherIndex = oldPointerIndex < 0 ? lessons.length : oldPointerIndex;

  for (let index = 0; index < lastGrandfatherIndex; index += 1) {
    const lesson = lessons[index];
    if (!lesson || !acquired.has(lesson.id)) continue;
    if (!isTopicMasteryLesson(lesson)) continue;
    const current = next[lesson.id];
    if ((current?.level ?? 0) >= 4) continue;
    next[lesson.id] = {
      level: 4,
      passCount: Math.max(current?.passCount ?? 0, 4),
      lastPass: 4,
      lastAccuracy: current?.lastAccuracy,
      recoveryPending: false,
      updatedAt: now,
    };
  }
  return next;
}

export function energyIdempotencyKeyForPass(
  lessonId: string,
  pass: MasteryPass,
  dayKey: string
): string {
  return `consume:lesson:${lessonId}:pass:${pass}:${dayKey}`;
}

export function energySessionFlagForPass(
  lessonId: string,
  pass: MasteryPass,
  dayKey: string
): string {
  return `longyu-energy:lesson:${lessonId}:pass:${pass}:${dayKey}`;
}

export function lessonPassXpRewardId(lessonId: string, pass: MasteryPass): string {
  return `lesson:${lessonId}:pass:${pass}:xp`;
}

export function lessonPassPracticeXpRewardId(lessonId: string, pass: MasteryPass, dayKey: string): string {
  return `lesson:${lessonId}:pass:${pass}:practice:${dayKey}:xp`;
}

export function lessonTopicMasteredXpRewardId(lessonId: string): string {
  return `lesson:${lessonId}:topic-mastered:xp`;
}
