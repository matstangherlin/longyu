/**
 * RC2.3.13G — micro-feedback frequency + eligibility policy.
 * One question at a time; never mid-answer / mid-recording / mid-Hànzì.
 */

export type MicroFeedbackKind =
  | "lesson_clarity"
  | "culture_value"
  | "mastery_explain"
  | "speech_compare";

export type MicroFeedbackBoundary =
  | "lesson_complete"
  | "culture_complete"
  | "hub_return"
  | "session_end";

export interface MicroFeedbackPolicyState {
  shownCount: number;
  lastShownAt: number;
  answeredKinds: MicroFeedbackKind[];
  dismissedKinds: MicroFeedbackKind[];
  lessonCompletionsSincePrompt: number;
}

export const MICRO_FEEDBACK_MIN_GAP_MS = 45 * 60 * 1000;
export const MICRO_FEEDBACK_EVERY_N_COMPLETIONS = 4;

export const DEFAULT_MICRO_FEEDBACK_STATE: MicroFeedbackPolicyState = {
  shownCount: 0,
  lastShownAt: 0,
  answeredKinds: [],
  dismissedKinds: [],
  lessonCompletionsSincePrompt: 0,
};

/** Runtime contexts that must NEVER show a survey. */
export type BlockedLearningContext =
  | "answering"
  | "recording"
  | "hanzi_stroke"
  | "conversation_turn"
  | "before_continue";

export function isMicroFeedbackBlocked(context: BlockedLearningContext | null | undefined): boolean {
  return Boolean(context);
}

export function shouldOfferMicroFeedback(args: {
  kind: MicroFeedbackKind;
  boundary: MicroFeedbackBoundary;
  state: MicroFeedbackPolicyState;
  now?: number;
  learningContext?: BlockedLearningContext | null;
}): boolean {
  const now = args.now ?? Date.now();
  if (isMicroFeedbackBlocked(args.learningContext)) return false;
  if (args.boundary !== "lesson_complete" && args.boundary !== "culture_complete" && args.boundary !== "session_end") {
    return false;
  }
  if (args.state.answeredKinds.includes(args.kind) || args.state.dismissedKinds.includes(args.kind)) {
    // Kind already handled — allow rare re-sample only for lesson_clarity after many completions.
    if (args.kind !== "lesson_clarity") return false;
  }
  if (args.state.lastShownAt > 0 && now - args.state.lastShownAt < MICRO_FEEDBACK_MIN_GAP_MS) return false;
  // First eligible completion always allowed; then sparse.
  if (args.state.shownCount === 0) return true;
  if (args.boundary === "lesson_complete" || args.boundary === "culture_complete") {
    return args.state.lessonCompletionsSincePrompt + 1 >= MICRO_FEEDBACK_EVERY_N_COMPLETIONS;
  }
  return false;
}

export function recordMicroFeedbackShown(state: MicroFeedbackPolicyState, now = Date.now()): MicroFeedbackPolicyState {
  return {
    ...state,
    shownCount: state.shownCount + 1,
    lastShownAt: now,
    lessonCompletionsSincePrompt: 0,
  };
}

export function recordLessonCompletionTick(state: MicroFeedbackPolicyState): MicroFeedbackPolicyState {
  return {
    ...state,
    lessonCompletionsSincePrompt: state.lessonCompletionsSincePrompt + 1,
  };
}

/** Positive answers must never award XP / pearls / streak. */
export function microFeedbackAwardsReward(_answerId: string): false {
  return false;
}

export const MICRO_FEEDBACK_COPY = {
  lesson_clarity: {
    questionPt: "Esta aula ficou clara?",
    questionEn: "Was this lesson clear?",
    answers: [
      { id: "very_clear", pt: "Muito clara", en: "Very clear" },
      { id: "a_bit_confusing", pt: "Um pouco confusa", en: "A bit confusing" },
    ],
  },
  culture_value: {
    questionPt: "Isso ajudou você a entender melhor a situação?",
    questionEn: "Did this help you understand the situation better?",
    answers: [
      { id: "yes", pt: "Sim", en: "Yes" },
      { id: "somewhat", pt: "Mais ou menos", en: "Somewhat" },
      { id: "not_much", pt: "Não muito", en: "Not much" },
    ],
  },
  mastery_explain: {
    questionPt: "Você entendeu por que o Longyu recomendou esta prática?",
    questionEn: "Did you understand why Longyu recommended this practice?",
    answers: [
      { id: "yes", pt: "Sim", en: "Yes" },
      { id: "not_yet", pt: "Ainda não", en: "Not yet" },
    ],
  },
  speech_compare: {
    questionPt: "Comparar sua voz ajudou?",
    questionEn: "Did comparing your voice help?",
    answers: [
      { id: "yes", pt: "Sim", en: "Yes" },
      { id: "somewhat", pt: "Mais ou menos", en: "Somewhat" },
      { id: "no", pt: "Não", en: "No" },
    ],
  },
} as const;
