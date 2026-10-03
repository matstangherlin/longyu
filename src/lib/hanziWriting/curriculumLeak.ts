/**
 * RC2.3.4 — curriculum leak prevention for handwriting.
 * Sequence: taught → recognized → assembled → traced → memory.
 * Never: not taught → write.
 */

import { hasLearnerBeenTaught, type TaughtConceptMap } from "../pedagogyV6/discovery";
import { HANDWRITING_CURRICULUM_LEAK } from "./gates";
import { canGradeMemoryWrite, canOfferTrace } from "./handwritingReference";
import type { HanziLearningStage } from "./stages";
import { getFormEvidence } from "./evidence";

export type WritingEligibility =
  | { ok: true; stage: HanziLearningStage }
  | { ok: false; reason: typeof HANDWRITING_CURRICULUM_LEAK | string; code: string };

function conceptIdsForChar(charId: string, character: string): string[] {
  return [`char:${charId}`, charId, character, `hanzi:${character}`];
}

export function isCharacterTaught(
  charId: string,
  character: string,
  taught?: TaughtConceptMap,
  completedLessons?: readonly string[]
): boolean {
  const ids = conceptIdsForChar(charId, character);
  if (taught) {
    for (const id of ids) {
      if (hasLearnerBeenTaught(id, taught)) return true;
    }
  }
  // Journey first-wave: p1-primeiros-hanzi teaches 木 / 人
  if (completedLessons?.includes("p1-primeiros-hanzi")) {
    if (charId === "mu" || charId === "ren" || character === "木" || character === "人") return true;
  }
  return false;
}

/**
 * Gate graded writing tasks. Formative TRACE preview still requires taught.
 */
export function assertWritingEligible(input: {
  charId: string;
  character: string;
  stage: HanziLearningStage;
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
  requireVerifiedForMemory?: boolean;
}): WritingEligibility {
  const taughtOk = isCharacterTaught(input.charId, input.character, input.taught, input.completedLessons);
  if (!taughtOk) {
    return { ok: false, reason: HANDWRITING_CURRICULUM_LEAK, code: HANDWRITING_CURRICULUM_LEAK };
  }

  if (input.stage === "TRACE" || input.stage === "COMPLETE") {
    if (!canOfferTrace(input.character)) {
      return { ok: false, reason: "HANDWRITING_DATA_REQUIRED", code: "HANDWRITING_DATA_REQUIRED" };
    }
  }

  if (input.stage === "MEMORY_WRITE" || input.stage === "CONTEXT_USE") {
    const requireVerified = input.requireVerifiedForMemory !== false;
    if (requireVerified && !canGradeMemoryWrite(input.character)) {
      return { ok: false, reason: "HANDWRITING_REFERENCE_REQUIRED", code: "HANDWRITING_REFERENCE_REQUIRED" };
    }
    const ev = getFormEvidence(input.charId, input.character);
    // Soft pedagogical sequence — do not force assemble if evidence missing in lab exploratory,
    // but graded memory in journey should have seen/assembled when possible.
    if (ev.writingState === "NOT_STARTED" && ev.recognitionAttempts === 0 && ev.assemblyAttempts === 0) {
      // Still taught — allow with caution for lab; journey apply layer adds stronger gates.
    }
  }

  return { ok: true, stage: input.stage };
}

export function detectHandwritingCurriculumLeaks(candidates: readonly {
  charId: string;
  character: string;
  stage: HanziLearningStage;
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
}[]): { leaks: number; details: WritingEligibility[] } {
  const details = candidates.map((c) => assertWritingEligible(c));
  const leaks = details.filter((d) => !d.ok && d.code === HANDWRITING_CURRICULUM_LEAK).length;
  return { leaks, details };
}
