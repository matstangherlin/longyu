import type { ActivityErrorRecord, LessonAttemptRecord, LessonStar } from "../../lib/store";

export const LESSON_RECOVERY_QA_SCENARIOS = [
  {
    kind: "match_pairs",
    expectedReview: "pair",
    check: "Wrong pair is saved as one granular pair: left, expectedRight, userAnswer, pinyin.",
  },
  {
    kind: "sentence_build",
    expectedReview: "build",
    check: "Same target sentence is rebuilt with reshuffled pieces and explanation appears only after answer.",
  },
  {
    kind: "translation_build",
    expectedReview: "build",
    check: "Same translation goal is rebuilt; source text may be shown, but the target answer is not prefilled.",
  },
  {
    kind: "fill_blank",
    expectedReview: "blank",
    check: "Same blank target returns with the original sentence frame and plausible distractors.",
  },
  {
    kind: "dialogue_choice",
    expectedReview: "choice",
    check: "Same communicative decision is asked again with the original correct option.",
  },
  {
    kind: "listen_select",
    expectedReview: "listen",
    check: "Audio is replayed; hanzi/pinyin answer is revealed only in feedback.",
  },
  {
    kind: "tone",
    expectedReview: "tone",
    check: "Same tone is reviewed; pinyin with tone mark appears only after answer.",
  },
  {
    kind: "tone_pair",
    expectedReview: "listen",
    check: "Tone-pair mistake is reviewed from the same audio/answer, without exposing pinyin first.",
  },
  {
    kind: "hanzi_build",
    expectedReview: "build",
    check: "Same character/components are rebuilt when builder data exists; otherwise text pieces are used.",
  },
  {
    kind: "recognize",
    expectedReview: "hanzi",
    check: "Same character is shown and asks for the same meaning.",
  },
  {
    kind: "decompose",
    expectedReview: "not_graded_today",
    check: "Current decompose step is instructional only; add a graded variant before expecting remediation.",
  },
  {
    kind: "pinyin",
    expectedReview: "pinyin",
    check: "Pinyin/tone choices review the same hanzi and do not display the answer before selection.",
  },
] as const;

export interface LessonRecoveryDebugSnapshot {
  lessonId: string;
  lessonStarsById: Record<string, LessonStar>;
  activityErrors: ActivityErrorRecord[];
  correctedErrorIds: string[];
  recentActivityErrors: ActivityErrorRecord[];
  currentLessonAttempt: LessonAttemptRecord | null;
}

export interface LessonRecoveryDebugSummary {
  lessonId: string;
  stars: LessonStar | 0;
  currentAttemptErrorCount: number;
  correctedCurrentErrorCount: number;
  remainingCurrentErrorCount: number;
  currentAttemptPersisted: boolean;
  duplicateRecentErrorKeys: string[];
  canRecoverThreeStarsNow: boolean;
}

function activityErrorDebugKey(error: ActivityErrorRecord): string {
  return [error.lessonId, error.exerciseId ?? error.questionId, error.type, error.correctAnswer].join(":");
}

export function summarizeLessonRecoveryDebug(snapshot: LessonRecoveryDebugSnapshot): LessonRecoveryDebugSummary {
  const corrected = new Set(snapshot.correctedErrorIds);
  const currentErrors = snapshot.activityErrors.filter((error) => error.lessonId === snapshot.lessonId);
  const recentKeys = snapshot.recentActivityErrors.map(activityErrorDebugKey);
  const duplicateRecentErrorKeys = recentKeys.filter((key, index) => recentKeys.indexOf(key) !== index);
  const correctedCurrentErrorCount = currentErrors.filter((error) => corrected.has(error.id)).length;
  const remainingCurrentErrorCount = currentErrors.length - correctedCurrentErrorCount;

  return {
    lessonId: snapshot.lessonId,
    stars: snapshot.lessonStarsById[snapshot.lessonId] ?? 0,
    currentAttemptErrorCount: currentErrors.length,
    correctedCurrentErrorCount,
    remainingCurrentErrorCount,
    currentAttemptPersisted: snapshot.currentLessonAttempt?.lessonId === snapshot.lessonId,
    duplicateRecentErrorKeys,
    canRecoverThreeStarsNow: currentErrors.length > 0 && remainingCurrentErrorCount === 0,
  };
}

export function installLessonRecoveryDebugHelpers(getSnapshot: () => LessonRecoveryDebugSnapshot): () => void {
  const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev || typeof window === "undefined") return () => {};
  const helpers = {
    scenarios: LESSON_RECOVERY_QA_SCENARIOS,
    snapshot: getSnapshot,
    summary: () => summarizeLessonRecoveryDebug(getSnapshot()),
  };
  window.__longyuLessonRecoveryQa = helpers;
  return () => {
    if (window.__longyuLessonRecoveryQa === helpers) delete window.__longyuLessonRecoveryQa;
  };
}

declare global {
  interface Window {
    __longyuLessonRecoveryQa?: {
      scenarios: typeof LESSON_RECOVERY_QA_SCENARIOS;
      snapshot: () => LessonRecoveryDebugSnapshot;
      summary: () => LessonRecoveryDebugSummary;
    };
  }
}
