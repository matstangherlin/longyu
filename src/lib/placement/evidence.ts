import type { PendingPlacementV2, PlacementAnswerEvidence, PlacementCommitPayload } from "./types";
import { getPlacementQuestion } from "./questions";
import { canonicalizeAnswer, wireAnswer } from "./optionIdentity";
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

/**
 * Store option IDs locally. Map to the Portuguese/canonical wire value the
 * currently deployed Edge still validates against. After #208 deploys the
 * ID-aware engine, the same IDs remain valid because Edge canonicalize
 * accepts both.
 */
export function normalizeAnswerEvidence(item: PlacementAnswerEvidence): PlacementAnswerEvidence {
  const questionId = String(item.questionId ?? "");
  const raw = String(item.answer ?? "");
  const question = getPlacementQuestion(questionId);
  const optionId = question ? canonicalizeAnswer(question, raw) : raw;
  return {
    questionId,
    answer: question ? wireAnswer(question, optionId) : optionId,
    hintUsed: Boolean(item.hintUsed),
    responseMode: item.responseMode === "self_report" ? "self_report" : "choice",
  };
}
