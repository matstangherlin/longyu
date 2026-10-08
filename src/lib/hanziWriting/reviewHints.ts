/**
 * RC2.3.4 — Review hints preferring writing when form evidence is weak.
 */

import { getFormEvidence, prefersWritingReview, type HanziFormEvidenceMap, loadFormEvidenceMap } from "./evidence";
import { canOfferTrace, canGradeMemoryWrite } from "./handwritingReference";
import type { HanziLearningStage } from "./stages";

export type ReviewWritingPreference = {
  charId: string;
  character: string;
  prefer: boolean;
  suggestedStage: HanziLearningStage | null;
  reasonPt: string;
};

export function reviewWritingPreference(charId: string, character: string): ReviewWritingPreference {
  const ev = getFormEvidence(charId, character);
  if (!prefersWritingReview(ev)) {
    return {
      charId,
      character,
      prefer: false,
      suggestedStage: null,
      reasonPt: "Escrita está ok ou significado ainda frágil — não insistir em handwriting.",
    };
  }
  if (ev.tracingAttempts === 0 && canOfferTrace(character)) {
    return {
      charId,
      character,
      prefer: true,
      suggestedStage: "TRACE",
      reasonPt: "Significado forte, traçado ainda não praticado.",
    };
  }
  if (ev.completeAttempts < 2) {
    return {
      charId,
      character,
      prefer: true,
      suggestedStage: "COMPLETE",
      reasonPt: "Forma frágil — completar peça/traço.",
    };
  }
  if (canGradeMemoryWrite(character)) {
    return {
      charId,
      character,
      prefer: true,
      suggestedStage: "MEMORY_WRITE",
      reasonPt: "Significado forte, escrita de memória fraca.",
    };
  }
  return {
    charId,
    character,
    prefer: true,
    suggestedStage: "ASSEMBLE",
    reasonPt: "Reforçar montagem (sem referência de escrita verificada).",
  };
}

export function listReviewWritingPriorities(map?: HanziFormEvidenceMap): ReviewWritingPreference[] {
  const m = map ?? loadFormEvidenceMap();
  return Object.values(m)
    .map((ev) => reviewWritingPreference(ev.charId, ev.character))
    .filter((p) => p.prefer);
}
