/**
 * RC2.3.13B — Home cognitive recommendation resolver.
 *
 * Deterministic. No Jev. No AI. Consumes existing SRS + Personal Mastery +
 * Culture progressive-discovery signals only. Home never recomputes mastery
 * authority — callers pass snapshots from useLearnerMastery / dueItems.
 */
import { STATE_LABEL_PT, whyLinePt, type PersonalMastery } from "../mastery/personalMastery";
import type { CompetencyView } from "../mastery/competency";
import { getCultureItem } from "../../data/culture";
import { cultureLessonIdForItem, cultureLessonPlayerPath } from "../../data/cultureNative";
import { JOURNEY_CULTURE_MOMENTS } from "../../data/journeyCultureMoments";
import { pickNextCultureMissionId } from "../cultureMastery";

export type HomeContinueKind =
  | "CONTINUE_LESSON"
  | "START_FIRST"
  | "FALLBACK_REVIEW"
  | "FALLBACK_PRACTICE"
  | "FALLBACK_EXPLORE"
  | "NONE";

export type TodayKind = "REVIEW_DUE" | "MASTERY_NEED" | "INCOMPLETE_PRACTICE" | "ENRICHMENT";

export type HomeRecommendationHref =
  | { kind: "lesson"; lessonId: string; href: string }
  | { kind: "review"; href: string }
  | { kind: "practice"; href: string }
  | { kind: "explore"; href: string; cultureItemId: string }
  | { kind: "dominio"; href: string }
  | { kind: "none"; href: "" };

export interface HomeContinueRecommendation {
  kind: HomeContinueKind;
  href: string;
  lessonId?: string;
  /** True when this is the learner's first step (no progress). */
  isNewLearner: boolean;
}

export interface TodayRecommendation {
  kind: TodayKind;
  href: string;
  reasonPt: string;
  reasonEn: string;
  ctaPt: string;
  ctaEn: string;
  /** Never Store / League / achievements. */
  surface: "review" | "practice" | "culture";
}

export interface MasteryHomeSnapshot {
  /** Unique targets with STRONG or STABLE in any view. */
  firm: number;
  /** Unique targets with DEVELOPING. */
  developing: number;
  /** Unique targets with NEEDS_PRACTICE or REVIEW_DUE. */
  needsAttention: number;
  hasEvidence: boolean;
}

export interface ExploreRecommendation {
  cultureItemId: string;
  href: string;
  titlePt: string;
  titleEn: string;
}

export interface HomeRecommendationInput {
  currentLessonId: string | undefined;
  /** Route already resolved by Journey (pinyin capsule vs /licao). */
  routeForLesson: (lessonId: string) => string;
  hasAnyProgress: boolean;
  reviewDueCount: number;
  mastery: PersonalMastery | null;
  cultureAvailable: boolean;
  cultureCompletedIds: readonly string[];
  cultureStartedIds: readonly string[];
  completedLessons: readonly string[];
  /** Day index for deterministic explore rotation (UTC day). */
  dayIndex?: number;
}

const REVIEW_HREF = "/revisao?modo=fracos&sessao=corrigir";
const PRACTICE_HREF = "/revisao?sessao=dominio&iniciar=1";
const DOMINIO_HREF = "/dominio";

function uniqueTargetCount(
  rows: { targetId: string }[]
): number {
  return new Set(rows.map((r) => r.targetId)).size;
}

/** Snapshot for Home — consumes Personal Mastery; does not redefine states. */
export function masteryHomeSnapshot(pm: PersonalMastery | null): MasteryHomeSnapshot {
  if (!pm) {
    return { firm: 0, developing: 0, needsAttention: 0, hasEvidence: false };
  }
  const firm = uniqueTargetCount(pm.getStrongTargets());
  const developing = uniqueTargetCount(pm.getDevelopingTargets());
  const needsAttention = uniqueTargetCount([
    ...pm.getWeakTargets(),
    ...pm.getReviewDueTargets(),
  ]);
  const hasEvidence = firm + developing + needsAttention > 0;
  return { firm, developing, needsAttention, hasEvidence };
}

export function resolveHomeContinue(input: HomeRecommendationInput): HomeContinueRecommendation {
  const { currentLessonId, routeForLesson, hasAnyProgress, reviewDueCount, mastery, cultureAvailable } =
    input;

  if (currentLessonId) {
    return {
      kind: hasAnyProgress ? "CONTINUE_LESSON" : "START_FIRST",
      href: routeForLesson(currentLessonId),
      lessonId: currentLessonId,
      isNewLearner: !hasAnyProgress,
    };
  }

  // Journey path complete — one primary fallback (never dead Continuar).
  if (reviewDueCount > 0) {
    return { kind: "FALLBACK_REVIEW", href: REVIEW_HREF, isNewLearner: false };
  }
  const weak = mastery?.getWeakTargets() ?? [];
  const developing = mastery?.getDevelopingTargets() ?? [];
  if (weak.length + developing.length > 0) {
    return { kind: "FALLBACK_PRACTICE", href: PRACTICE_HREF, isNewLearner: false };
  }
  const explore = resolveExploreRecommendation(input);
  if (cultureAvailable && explore) {
    return {
      kind: "FALLBACK_EXPLORE",
      href: explore.href,
      isNewLearner: false,
    };
  }
  return { kind: "NONE", href: "", isNewLearner: !hasAnyProgress };
}

function masteryNeedReason(
  pm: PersonalMastery,
  targetId: string,
  view: CompetencyView
): { pt: string; en: string } {
  const dim = pm.getDimensionState(targetId, view);
  const why = dim.rules.map((r) => whyLinePt(r, view)).filter(Boolean)[0];
  const label = pm.getTargetState(targetId).target?.label ?? targetId;
  if (why) {
    return { pt: why, en: why };
  }
  if (dim.state === "NEEDS_PRACTICE") {
    return {
      pt: `${STATE_LABEL_PT.NEEDS_PRACTICE}: ${label}`,
      en: `Worth practicing: ${label}`,
    };
  }
  return {
    pt: `${STATE_LABEL_PT.DEVELOPING}: ${label}`,
    en: `Still building: ${label}`,
  };
}

/**
 * Exactly one Today recommendation. Complements Continue — never Store/League,
 * never duplicates the Continue lesson href, never uses Jev.
 */
export function resolveTodayRecommendation(
  input: HomeRecommendationInput,
  continueRec: HomeContinueRecommendation
): TodayRecommendation | null {
  const { reviewDueCount, mastery, currentLessonId, cultureAvailable } = input;
  const continueIsReview = continueRec.kind === "FALLBACK_REVIEW";
  const continueIsPractice = continueRec.kind === "FALLBACK_PRACTICE";
  const continueIsExplore = continueRec.kind === "FALLBACK_EXPLORE";

  // 1. Urgent due Review (unless Continue already is review fallback)
  if (reviewDueCount > 0 && !continueIsReview) {
    const n = reviewDueCount;
    return {
      kind: "REVIEW_DUE",
      href: REVIEW_HREF,
      reasonPt: n === 1 ? "Há 1 item pronto para revisar." : `Há ${n} itens prontos para revisar.`,
      reasonEn: n === 1 ? "1 item is ready to review." : `${n} items are ready to review.`,
      ctaPt: "Praticar",
      ctaEn: "Practice",
      surface: "review",
    };
  }

  // 2. Strong Personal Mastery need
  if (mastery && !continueIsPractice) {
    const weak = mastery.getWeakTargets();
    if (weak[0]) {
      const reason = masteryNeedReason(mastery, weak[0].targetId, weak[0].view);
      return {
        kind: "MASTERY_NEED",
        href: PRACTICE_HREF,
        reasonPt: reason.pt,
        reasonEn: reason.en,
        ctaPt: "Praticar",
        ctaEn: "Practice",
        surface: "practice",
      };
    }
  }

  // 3. Incomplete practice (developing with graded evidence)
  if (mastery && !continueIsPractice) {
    const developing = mastery.getDevelopingTargets();
    if (developing[0]) {
      const reason = masteryNeedReason(mastery, developing[0].targetId, developing[0].view);
      return {
        kind: "INCOMPLETE_PRACTICE",
        href: PRACTICE_HREF,
        reasonPt: reason.pt,
        reasonEn: reason.en,
        ctaPt: "Praticar",
        ctaEn: "Practice",
        surface: "practice",
      };
    }
  }

  // 4. Optional enrichment — only when it won't derail active Journey progression
  //    (no current lesson / path complete) and Continue isn't already explore.
  if (!currentLessonId && cultureAvailable && !continueIsExplore) {
    const explore = resolveExploreRecommendation(input);
    if (explore) {
      return {
        kind: "ENRICHMENT",
        href: explore.href,
        reasonPt: "Um momento cultural opcional para enriquecer o que você já aprendeu.",
        reasonEn: "An optional culture moment to enrich what you already learned.",
        ctaPt: "Explorar",
        ctaEn: "Explore",
        surface: "culture",
      };
    }
  }

  return null;
}

/**
 * Unlocked Culture only. Deterministic rotation by day among eligible moments
 * whose afterTopicId is completed; else pickNextCultureMissionId.
 * Never exposes locked / future curriculum.
 */
export function resolveExploreRecommendation(
  input: HomeRecommendationInput
): ExploreRecommendation | null {
  if (!input.cultureAvailable) return null;

  const completed = new Set(input.completedLessons);
  const cultureDone = new Set(input.cultureCompletedIds);

  const unlockedMoments = JOURNEY_CULTURE_MOMENTS.filter((m) => {
    if (!completed.has(m.afterTopicId)) return false;
    const lessonId = cultureLessonIdForItem(m.cultureItemId);
    if (cultureDone.has(m.cultureItemId) || completed.has(lessonId)) return false;
    return Boolean(getCultureItem(m.cultureItemId));
  }).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  if (unlockedMoments.length > 0) {
    const day = input.dayIndex ?? Math.floor(Date.now() / 86_400_000);
    const pick = unlockedMoments[day % unlockedMoments.length]!;
    const item = getCultureItem(pick.cultureItemId)!;
    return {
      cultureItemId: pick.cultureItemId,
      href: cultureLessonPlayerPath(pick.cultureItemId),
      titlePt: item.titlePt,
      titleEn: item.titleEn,
    };
  }

  const nextId = pickNextCultureMissionId(input.cultureCompletedIds, input.cultureStartedIds);
  if (!nextId) return null;
  // Only surface mission if culture hub is already available (caller gated).
  const item = getCultureItem(nextId);
  if (!item) return null;
  return {
    cultureItemId: nextId,
    href: cultureLessonPlayerPath(nextId),
    titlePt: item.titlePt,
    titleEn: item.titleEn,
  };
}

export function resolveHomeRecommendations(input: HomeRecommendationInput) {
  const continueRec = resolveHomeContinue(input);
  const today = resolveTodayRecommendation(input, continueRec);
  // Deduplicate: if Today href equals Continue href, drop Today.
  const todaySafe =
    today && today.href && today.href === continueRec.href ? null : today;
  const mastery = masteryHomeSnapshot(input.mastery);
  const explore = resolveExploreRecommendation(input);
  // If Continue already is explore fallback, hide separate Explore block duplicate.
  const exploreSafe =
    explore && continueRec.kind === "FALLBACK_EXPLORE" && explore.href === continueRec.href
      ? null
      : explore;
  // If Today already points at the same culture item, keep Explore only when distinct.
  const exploreFinal =
    exploreSafe && todaySafe?.surface === "culture" && todaySafe.href === exploreSafe.href
      ? null
      : exploreSafe;

  return {
    continue: continueRec,
    today: todaySafe,
    mastery,
    explore: exploreFinal,
  };
}

export const HOME_HREFS = {
  REVIEW: REVIEW_HREF,
  PRACTICE: PRACTICE_HREF,
  DOMINIO: DOMINIO_HREF,
} as const;
