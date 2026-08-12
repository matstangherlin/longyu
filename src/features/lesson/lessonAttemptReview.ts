import type { Lesson, LessonStep, FlatLesson } from "../../data/journey";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import type { ActivityErrorRecord, LessonAttemptRecord, LessonMistakeRecord, LessonStar } from "../../lib/store";
import type { ActivityErrorInput } from "./immediateRemediation";
import { isConcatenatedDump, isNonOptionAnswer } from "./immediateRemediation";

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

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

function hasHanzi(text: string | undefined): text is string {
  return Boolean(text && /[\u3400-\u9fff]/u.test(text) && !isConcatenatedDump(text));
}

/** Um único alvo coerente — alinhado com errorHanziForStep do LessonPlayer. */
function singleTargetHanziFromStep(step: LessonStep, expectedAnswer?: string): string | undefined {
  if (hasHanzi(step.hanzi)) return step.hanzi;
  if (step.charId) {
    const glyph = charById.get(step.charId)?.hanzi;
    if (hasHanzi(glyph)) return glyph;
  }
  const reply =
    expectedAnswer ??
    step.correctAnswer ??
    step.checkpoint?.correctAnswer ??
    step.answer ??
    step.blankAnswer;
  if (hasHanzi(reply)) return reply;
  if (hasHanzi(step.sourceText)) return step.sourceText;
  if (step.kind === "conversation_scene") {
    const match = step.lines?.find((line) => hasHanzi(line.hanzi) && line.hanzi === reply);
    if (match?.hanzi) return match.hanzi;
    const last = [...(step.lines ?? [])].reverse().find((line) => hasHanzi(line.hanzi));
    if (last?.hanzi) return last.hanzi;
  }
  const target = step.target?.join("") ?? step.targetParts?.join("");
  return hasHanzi(target) ? target : undefined;
}

function pinyinForHanzi(hanzi: string | undefined, step: LessonStep): string | undefined {
  if (step.pinyin && !isConcatenatedDump(step.pinyin)) return step.pinyin;
  if (step.sourcePinyin && !isConcatenatedDump(step.sourcePinyin)) return step.sourcePinyin;
  if (step.charId) return charById.get(step.charId)?.pinyin;
  if (!hanzi || isConcatenatedDump(hanzi)) return undefined;
  const normalized = hanzi.replace(/[，。！？、,.!?？\s]/g, "");
  const chunk = CHUNKS.find((item) => item.hanzi.replace(/[，。！？、,.!?？\s]/g, "") === normalized);
  if (chunk?.pinyin) return chunk.pinyin;
  const chars = [...normalized]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
  if (chars.length > 0 && chars.length <= 8) return chars.map((char) => char.pinyin).join(" ");
  return undefined;
}

function cleanSelectedAnswer(value: string | undefined): string {
  if (!value?.trim() || isNonOptionAnswer(value) || isConcatenatedDump(value)) {
    return "Resposta incorreta";
  }
  return value.trim();
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
  const hanzi = isPair
    ? pairLeft
    : singleTargetHanziFromStep(step, mistake.expectedAnswer);

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
    selectedAnswer: cleanSelectedAnswer(mistake.userAnswer),
    topic: lesson.title,
    tokens: [hanzi, mistake.expectedAnswer, mistake.userAnswer]
      .filter((token): token is string => Boolean(token) && !isConcatenatedDump(token) && !isNonOptionAnswer(token)),
    hanzi,
    pinyin: pinyinForHanzi(hanzi, step),
    meaningPt: hasHanzi(mistake.expectedAnswer) ? undefined : mistake.expectedAnswer,
    pairLeft,
    pairExpectedRight: matchedPair?.right,
    pairSelectedRight: isPair ? mistake.userAnswer : undefined,
    explanation:
      step.explanation ??
      step.checkpoint?.explanation ??
      (mistake.explanation && !isConcatenatedDump(mistake.explanation) ? mistake.explanation : undefined),
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
