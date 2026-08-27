import type { PendingPlacementV2, PlacementAnswerEvidence, PlacementCommitPayload } from "./types";
import { PLACEMENT_VERSION } from "./types";

/** Evidencia enviada ao servidor. Sem score, skippedLessonIds ou mastery. */
export function toServerPlacementEvidence(
  pending: PendingPlacementV2 | null | undefined
): PlacementCommitPayload | null {
  if (!pending?.answers.length) return null;
  return {
    placementVersion: PLACEMENT_VERSION,
    declaredExperience: pending.declaredExperience,
    goal: pending.goal ?? null,
    answers: pending.answers.map(normalizeAnswerEvidence),
  };
}

export function normalizeAnswerEvidence(item: PlacementAnswerEvidence): PlacementAnswerEvidence {
  return {
    questionId: String(item.questionId ?? ""),
    answer: String(item.answer ?? ""),
    hintUsed: Boolean(item.hintUsed),
    responseMode: item.responseMode === "self_report" ? "self_report" : "choice",
  };
}
