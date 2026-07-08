import type { Lesson, LessonStep, FlatLesson } from "../../data/journey";
import { CHARACTERS } from "../../data/characters";
import type { ItemType } from "../../data/types";
import type { ActivityErrorRecord, LessonAttemptRecord, LessonMistakeRecord, LessonStar } from "../../lib/store";
import type { ActivityErrorInput } from "./immediateRemediation";

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));

function parseStepIndex(questionId: string, lessonId: string): number | null {
  const prefix = `${lessonId}:`;
  if (!questionId.startsWith(prefix)) return null;
  const stepIndex = Number.parseInt(questionId.slice(prefix.length).split(":")[0] ?? "", 10);
  return Number.isFinite(stepIndex) ? stepIndex : null;
}

function pairLeftFromQuestionId(questionId: string, lessonId: string): string | undefined {
  const marker = `${lessonId}:`;
  if (!questionId.startsWith(marker)) return undefined;
  const tail = questionId.slice(marker.length);
  if (!tail.includes(":pair:")) return undefined;
  return tail.split(":pair:")[1];
}

function stepForMistake(mistake: LessonMistakeRecord, lesson: Lesson): LessonStep | undefined {
  const stepIndex = parseStepIndex(mistake.questionId, lesson.id);
  if (stepIndex == null || stepIndex < 0) return undefined;
  return lesson.steps[stepIndex];
}

function reviewTargetsForStep(step: LessonStep): ActivityErrorRecord["targets"] {
  const targets: ActivityErrorRecord["targets"] = [];
  if (step.charId) {
    targets.push({ type: "char" as ItemType, itemId: step.charId, domain: "forma", track: "hanzi" });
  }
  const hanzi = step.hanzi ?? (step.charId ? charById.get(step.charId)?.hanzi : undefined);
  if (hanzi) {
    targets.push({ type: "char" as ItemType, itemId: hanzi, domain: "significado", track: "hanzi" });
  }
  return targets.length > 0
    ? targets
    : [{ type: "char" as ItemType, itemId: "generic", domain: "significado", track: "hanzi" }];
}

function lessonMeta(lesson: Lesson | FlatLesson) {
  return {
    moduleId: "unitId" in lesson ? lesson.unitId : "",
    phaseId: "phaseId" in lesson ? lesson.phaseId : "",
  };
}

/** Reconstrói um erro da tentativa salva para revisão imediata tardia. */
export function activityErrorFromMistake(
  mistake: LessonMistakeRecord,
  lesson: Lesson
): (ActivityErrorInput & { step?: LessonStep }) | null {
  const step = stepForMistake(mistake, lesson);
  if (!step) return null;
  const meta = lessonMeta(lesson);

  const isPair = mistake.exerciseType === "pair-match";
  const pairLeft = isPair ? pairLeftFromQuestionId(mistake.questionId, lesson.id) ?? step.hanzi : undefined;
  const matchedPair = isPair ? step.pairs?.find((pair) => pair.left === pairLeft) : undefined;

  return {
    id: mistake.id,
    lessonId: mistake.lessonId,
    moduleId: meta.moduleId,
    phaseId: meta.phaseId,
    taskId: mistake.questionId,
    questionId: mistake.questionId,
    exerciseId: mistake.questionId,
    type: isPair ? "pair-match" : mistake.exerciseType,
    prompt: mistake.prompt,
    correctAnswer: mistake.expectedAnswer,
    selectedAnswer: mistake.userAnswer,
    topic: lesson.title,
    tokens: [pairLeft, mistake.expectedAnswer, mistake.userAnswer].filter(Boolean) as string[],
    hanzi: pairLeft ?? step.hanzi ?? (step.charId ? charById.get(step.charId)?.hanzi : undefined),
    pinyin: step.pinyin ?? (step.charId ? charById.get(step.charId)?.pinyin : undefined),
    meaningPt: mistake.expectedAnswer,
    pairLeft,
    pairExpectedRight: matchedPair?.right,
    pairSelectedRight: isPair ? mistake.userAnswer : undefined,
    explanation: mistake.explanation,
    mistakeReason: mistake.explanation,
    timestamp: mistake.createdAt,
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: isPair ? "significado" : "uso",
    targets: reviewTargetsForStep(step),
    step,
  };
}

export interface PendingAttemptReview {
  attemptId: string;
  attempt: LessonAttemptRecord;
  errors: (ActivityErrorInput & { step?: LessonStep })[];
  correctCount: number;
  finalStars: LessonStar;
  alreadyRecoveredIds: string[];
}

/** Erros pendentes da última tentativa com menos de 3 estrelas. */
export function getPendingAttemptReview(
  lessonId: string,
  lessonAttemptsById: Record<string, LessonAttemptRecord[]>,
  lesson: Lesson
): PendingAttemptReview | null {
  const attempts = lessonAttemptsById[lessonId];
  if (!attempts?.length) return null;
  const last = attempts[attempts.length - 1];
  if (!last || last.finalStars >= 3) return null;

  const recoveredIds = new Set(last.recoveredMistakes.map((mistake) => mistake.id));
  const pendingMistakes = last.mistakes.filter((mistake) => !recoveredIds.has(mistake.id));
  if (pendingMistakes.length === 0) return null;

  const errors = pendingMistakes
    .map((mistake) => activityErrorFromMistake(mistake, lesson))
    .filter((error): error is NonNullable<typeof error> => Boolean(error));
  if (errors.length === 0) return null;

  return {
    attemptId: last.id,
    attempt: last,
    errors,
    correctCount: last.correctCount,
    finalStars: last.finalStars,
    alreadyRecoveredIds: [...recoveredIds],
  };
}
