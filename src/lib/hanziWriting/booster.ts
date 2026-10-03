/**
 * RC2.3.4 — journey booster progression beyond assembly-only.
 */

import { getFormEvidence, writingStateLabelPt } from "./evidence";
import { canGradeMemoryWrite, canOfferTrace } from "./handwritingReference";
import type { HanziLearningStage } from "./stages";

export type BoosterWritingOffer = {
  charId: string;
  character: string;
  stage: HanziLearningStage;
  mode: "fragments" | "complete" | "trace" | "memory";
  labelPt: string;
  labelEn: string;
};

const FOUNDATION = [
  { charId: "mu", character: "木" },
  { charId: "ren", character: "人" },
] as const;

export function nextBoosterOffer(charId: string, character: string): BoosterWritingOffer {
  const ev = getFormEvidence(charId, character);
  if (ev.writingState === "NOT_STARTED" || ev.writingState === "SEEN") {
    return {
      charId,
      character,
      stage: "ASSEMBLE",
      mode: "fragments",
      labelPt: "Monte o caractere",
      labelEn: "Build the character",
    };
  }
  if (ev.writingState === "ASSEMBLED") {
    return {
      charId,
      character,
      stage: "COMPLETE",
      mode: "complete",
      labelPt: "Complete a peça que falta",
      labelEn: "Complete the missing piece",
    };
  }
  if ((ev.writingState === "TRACED" || ev.writingState === "COPIED") && canGradeMemoryWrite(character)) {
    return {
      charId,
      character,
      stage: "MEMORY_WRITE",
      mode: "memory",
      labelPt: "Escreva de memória",
      labelEn: "Write from memory",
    };
  }
  if (canOfferTrace(character)) {
    return {
      charId,
      character,
      stage: "TRACE",
      mode: "trace",
      labelPt: "Trace o caractere",
      labelEn: "Trace the character",
    };
  }
  return {
    charId,
    character,
    stage: "ASSEMBLE",
    mode: "fragments",
    labelPt: "Monte o caractere",
    labelEn: "Build the character",
  };
}

/** Interleave characters — avoid 木×5 consecutive writing drills. */
export function interleavedBoosterQueue(): BoosterWritingOffer[] {
  const offers = FOUNDATION.map((f) => nextBoosterOffer(f.charId, f.character));
  // Prefer alternating characters when both need similar stages
  if (offers.length === 2 && offers[0]!.stage === offers[1]!.stage) {
    return [offers[0]!, offers[1]!];
  }
  return offers.sort((a, b) => a.charId.localeCompare(b.charId));
}

export function boosterStatusLine(charId: string, character: string): string {
  const ev = getFormEvidence(charId, character);
  return `${character} · ${writingStateLabelPt(ev.writingState)}`;
}
