/**
 * JEV Wave 2 — pure pipeline helpers: sanitize state, apply overrides, build write payload.
 */

import {
  AI_POLICY_VERSION,
  AREA_CRITERIA,
  KIND_CRITERIA,
  SEVERITY_SCORE_CRITERIA,
  normalizeArea,
  normalizeKind,
  type BetaArea,
  type BetaKind,
} from "./jevTriageTaxonomy.ts";
import { redactFeedbackText } from "./jevPiiRedact.ts";
import { mapJevScoreToPCandidate, type PCandidate } from "./jevSeverityMap.ts";
import { detectSecurityOverride, mergePCandidate } from "./jevSecurityOverride.ts";
import { confidenceBand, needsHumanReviewFromConfidence, overallConfidence } from "./jevConfidencePolicy.ts";
import type { JevQuestion } from "./jevAnswers.ts";

export { AI_POLICY_VERSION };

export interface FeedbackRowV2 {
  id: string;
  category: string;
  message: string;
  route: string;
  lesson_id: string | null;
  exercise_kind: string | null;
  app_version?: string | null;
  rc_id?: string | null;
  platform?: string | null;
}

export function buildTriageQuestions(): Record<string, JevQuestion> {
  return {
    kind: {
      type: "choice",
      instructions: "What kind of feedback is this, from a learner of a Mandarin learning app",
      criteria: { ...KIND_CRITERIA },
    },
    area: {
      type: "choice",
      instructions: "Which part of the app the feedback is about",
      criteria: { ...AREA_CRITERIA },
    },
    severity: {
      type: "score",
      instructions: "How severe the reported problem is for the learner (0 cosmetic … 3 blocks app/data/money)",
      criteria: [...SEVERITY_SCORE_CRITERIA],
    },
    needs_human: {
      type: "noul",
      instructions: "The learner expects a reply or the issue needs urgent human attention",
    },
  };
}

export function buildClusterQuestions(candidates: Array<{ id: string; label: string }>): Record<string, JevQuestion> {
  const criteria: Record<string, string> = { new_cluster: "This report is a new distinct issue" };
  for (const c of candidates.slice(0, 8)) {
    criteria[c.id] = c.label.slice(0, 200);
  }
  return {
    cluster: {
      type: "choice",
      instructions: "Choose the best existing issue cluster, or new_cluster if none match. Similarity ≠ same root cause.",
      criteria,
    },
  };
}

/** Sanitized state for Jev — never raw secrets. Bounded size. */
export function buildSanitizedFeedbackState(row: FeedbackRowV2): {
  state: string;
  redacted: boolean;
  redactionKinds: string[];
  sanitizedMessage: string;
} {
  const { text, redacted, kinds } = redactFeedbackText(row.message, { maxLen: 1200 });
  const state = [
    `Category chosen by learner: ${row.category}`,
    `Screen: ${row.route || "unknown"}`,
    row.lesson_id ? `Lesson: ${row.lesson_id}` : null,
    row.exercise_kind ? `Exercise type: ${row.exercise_kind}` : null,
    row.rc_id ? `RC: ${row.rc_id}` : null,
    row.app_version ? `App version: ${row.app_version}` : null,
    row.platform ? `Platform: ${row.platform}` : null,
    `Message:\n${text}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { state, redacted, redactionKinds: kinds, sanitizedMessage: text };
}

export interface ClassificationInput {
  kind: string | null;
  area: string | null;
  severityScore: number | null;
  needsHumanNoul: number | null;
  kindConfidence: number | null;
  areaConfidence: number | null;
  severityConfidence: number | null;
  model: string | null;
  inputHash: string;
  originalMessage: string;
  clusterSuggestion?: string | null;
  clusterConfidence?: number | null;
}

export interface ClassificationWrite {
  ai_kind: BetaKind | null;
  ai_area: BetaArea;
  /** Raw Jev score — NOT a P-level. */
  ai_severity: number | null;
  ai_needs_human: number | null;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_triaged_at: string;
  ai_policy_version: typeof AI_POLICY_VERSION;
  ai_input_hash: string;
  ai_p_candidate: PCandidate;
  ai_human_review_required: boolean;
  ai_kind_confidence: number | null;
  ai_area_confidence: number | null;
  ai_severity_confidence: number | null;
  ai_cluster_suggestion: string | null;
  ai_cluster_confidence: number | null;
  ai_override_reason: string | null;
  ai_status: "AI_SUGGESTED" | "PENDING_AI_TRIAGE";
}

export function buildClassificationWrite(input: ClassificationInput, classifiedAt = new Date().toISOString()): ClassificationWrite {
  const override = detectSecurityOverride(input.originalMessage);
  const mapped = mapJevScoreToPCandidate(input.severityScore);
  const merged = mergePCandidate(mapped.pCandidate, override);
  const overall = overallConfidence([input.kindConfidence, input.areaConfidence, input.severityConfidence]);
  const lowConf = needsHumanReviewFromConfidence(overall);
  const human = merged.humanConfirmationRequired || lowConf || (input.needsHumanNoul ?? 0) >= 0.5;

  return {
    ai_kind: normalizeKind(input.kind),
    ai_area: normalizeArea(input.area),
    ai_severity: mapped.jevScore,
    ai_needs_human: input.needsHumanNoul,
    ai_confidence: overall,
    ai_model: input.model,
    ai_triaged_at: classifiedAt,
    ai_policy_version: AI_POLICY_VERSION,
    ai_input_hash: input.inputHash,
    ai_p_candidate: merged.pCandidate,
    ai_human_review_required: human,
    ai_kind_confidence: input.kindConfidence,
    ai_area_confidence: input.areaConfidence,
    ai_severity_confidence: input.severityConfidence,
    ai_cluster_suggestion: input.clusterSuggestion ?? null,
    ai_cluster_confidence: input.clusterConfidence ?? null,
    ai_override_reason: merged.overrideReason,
    ai_status: "AI_SUGGESTED",
  };
}

export function pendingAiTriageWrite(): Pick<ClassificationWrite, "ai_status" | "ai_human_review_required" | "ai_policy_version"> {
  return {
    ai_status: "PENDING_AI_TRIAGE",
    ai_human_review_required: true,
    ai_policy_version: AI_POLICY_VERSION,
  };
}

export { confidenceBand, normalizeArea, normalizeKind };
