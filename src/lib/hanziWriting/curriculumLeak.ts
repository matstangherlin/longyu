/**
 * RC2.3.4 — curriculum leak prevention for handwriting.
 * Sequence: taught → recognized → assembled → traced → memory.
 * Never: not taught → write.
 *
 * RC2.3.4A — single pedagogical eligibility contract. "Character exists",
 * "builder supports it" and "verified reference exists" are NOT permission to
 * grade writing: the learner must have been taught the character first, and
 * memory / production unlock only through recorded progression.
 */

import { hasLearnerBeenTaught, type TaughtConceptMap } from "../pedagogyV6/discovery";
import { HANDWRITING_CURRICULUM_LEAK, HANDWRITING_PROGRESSION_REQUIRED } from "./gates";
import { isHandwritingReferenceVerified } from "./handwritingReference";
import type { HanziLearningStage } from "./stages";
import { getFormEvidence } from "./evidence";
import { introducedByCompletedLessons } from "./introductions";
import type { HanziFormEvidence } from "./types";

/** Ordered: each state includes every permission of the ones before it. */
export const HANZI_WRITING_ELIGIBILITY_ORDER = [
  "NOT_INTRODUCED",
  "INTRODUCED_NO_WRITING_DATA",
  "TRACE_ELIGIBLE",
  "MEMORY_ELIGIBLE",
  "PRODUCTION_ELIGIBLE",
] as const;

export type HanziWritingEligibility = (typeof HANZI_WRITING_ELIGIBILITY_ORDER)[number];

/** What the learner provably knows — all from existing canonical stores. */
export interface LearnerHanziKnowledge {
  /** Pedagogy V6 taught-concept map (`hasLearnerBeenTaught`). */
  taught?: TaughtConceptMap;
  /** Journey lessons completed; introductions are derived from their steps. */
  completedLessons?: readonly string[];
  /** Char ids the learner has studied through SRS (`store.learnedChars`). */
  learnedCharIds?: readonly string[];
}

/**
 * Typed pedagogical exception: the only way writing may appear before the
 * learner was taught the character. Never graded. Registry is empty today —
 * adding one is a reviewed code change, not an informal allowlist.
 */
export interface HanziWritingPedagogicalException {
  id: string;
  stage: "TRACE";
  graded: false;
  scope: string;
  rationale: string;
}

export const HANZI_WRITING_PEDAGOGICAL_EXCEPTIONS: readonly HanziWritingPedagogicalException[] = [];

export type WritingEligibility =
  | { ok: true; stage: HanziLearningStage; eligibility: HanziWritingEligibility; exceptionId?: string }
  | { ok: false; reason: string; code: string; eligibility: HanziWritingEligibility };

function conceptIdsForChar(charId: string, character: string): string[] {
  return [`char:${charId}`, charId, character, `hanzi:${character}`];
}

export function isCharacterTaught(
  charId: string,
  character: string,
  taught?: TaughtConceptMap,
  completedLessons?: readonly string[],
  learnedCharIds?: readonly string[]
): boolean {
  if (taught) {
    for (const id of conceptIdsForChar(charId, character)) {
      if (hasLearnerBeenTaught(id, taught)) return true;
    }
  }
  if (learnedCharIds?.includes(charId)) return true;
  return introducedByCompletedLessons(charId, completedLessons);
}

/** Lowest eligibility a stage requires; null = not a writing stage. */
export function requiredEligibilityForStage(stage: HanziLearningStage): HanziWritingEligibility | null {
  switch (stage) {
    case "TRACE":
    case "COMPLETE":
      return "TRACE_ELIGIBLE";
    case "MEMORY_WRITE":
      return "MEMORY_ELIGIBLE";
    case "CONTEXT_USE":
      return "PRODUCTION_ELIGIBLE";
    default:
      return null;
  }
}

export function eligibilityRank(value: HanziWritingEligibility): number {
  return HANZI_WRITING_ELIGIBILITY_ORDER.indexOf(value);
}

export function eligibilityAllowsStage(value: HanziWritingEligibility, stage: HanziLearningStage): boolean {
  const required = requiredEligibilityForStage(stage);
  if (!required) return value !== "NOT_INTRODUCED";
  return eligibilityRank(value) >= eligibilityRank(required);
}

export function hanziWritingEligibility(input: {
  charId: string;
  character: string;
  knowledge: LearnerHanziKnowledge;
  evidence?: HanziFormEvidence;
}): HanziWritingEligibility {
  const { taught, completedLessons, learnedCharIds } = input.knowledge;
  if (!isCharacterTaught(input.charId, input.character, taught, completedLessons, learnedCharIds)) {
    return "NOT_INTRODUCED";
  }
  // Builder SVG never counts: only a VERIFIED handwriting reference grades.
  if (!isHandwritingReferenceVerified(input.character)) return "INTRODUCED_NO_WRITING_DATA";
  const ev = input.evidence ?? getFormEvidence(input.charId, input.character);
  if (ev.tracingCorrect < 1) return "TRACE_ELIGIBLE";
  if (ev.memoryWriteCorrect < 1) return "MEMORY_ELIGIBLE";
  return "PRODUCTION_ELIGIBLE";
}

/**
 * Gate graded writing tasks. Formative TRACE preview still requires taught,
 * unless a typed, non-graded pedagogical exception is named.
 */
export function assertWritingEligible(input: {
  charId: string;
  character: string;
  stage: HanziLearningStage;
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
  learnedCharIds?: readonly string[];
  evidence?: HanziFormEvidence;
  exceptionId?: string;
}): WritingEligibility {
  const eligibility = hanziWritingEligibility({
    charId: input.charId,
    character: input.character,
    knowledge: { taught: input.taught, completedLessons: input.completedLessons, learnedCharIds: input.learnedCharIds },
    evidence: input.evidence,
  });

  if (eligibility === "NOT_INTRODUCED") {
    const exception = input.exceptionId
      ? HANZI_WRITING_PEDAGOGICAL_EXCEPTIONS.find((item) => item.id === input.exceptionId)
      : undefined;
    if (exception && exception.stage === input.stage && exception.graded === false && isHandwritingReferenceVerified(input.character)) {
      return { ok: true, stage: input.stage, eligibility, exceptionId: exception.id };
    }
    return { ok: false, reason: HANDWRITING_CURRICULUM_LEAK, code: HANDWRITING_CURRICULUM_LEAK, eligibility };
  }

  if (requiredEligibilityForStage(input.stage) && eligibility === "INTRODUCED_NO_WRITING_DATA") {
    return { ok: false, reason: "HANDWRITING_DATA_REQUIRED", code: "HANDWRITING_DATA_REQUIRED", eligibility };
  }

  if (!eligibilityAllowsStage(eligibility, input.stage)) {
    return { ok: false, reason: HANDWRITING_PROGRESSION_REQUIRED, code: HANDWRITING_PROGRESSION_REQUIRED, eligibility };
  }

  return { ok: true, stage: input.stage, eligibility };
}

export function detectHandwritingCurriculumLeaks(candidates: readonly {
  charId: string;
  character: string;
  stage: HanziLearningStage;
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
  learnedCharIds?: readonly string[];
  evidence?: HanziFormEvidence;
}[]): { leaks: number; details: WritingEligibility[] } {
  const details = candidates.map((c) => assertWritingEligible(c));
  const leaks = details.filter((d) => !d.ok && d.code === HANDWRITING_CURRICULUM_LEAK).length;
  return { leaks, details };
}

/** Characters a learner may practise at `stage` right now (UI pools). */
export function eligibleWritingCharacters<T extends { id: string; hanzi: string }>(
  characters: readonly T[],
  stage: HanziLearningStage,
  knowledge: LearnerHanziKnowledge
): T[] {
  return characters.filter((char) =>
    eligibilityAllowsStage(hanziWritingEligibility({ charId: char.id, character: char.hanzi, knowledge }), stage)
  );
}
