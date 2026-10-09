/**
 * RC2.3.13G — canonical beta learner-health event taxonomy.
 *
 * One authority for learner telemetry names + safe field sanitization.
 * Prefer this over inventing parallel analytics. Raw audio, stroke traces,
 * auth tokens, and free-text answers are never accepted.
 */

export const BETA_EVENT_SCHEMA_VERSION = "beta_event/1" as const;

export const BETA_EVENT_CATEGORIES = [
  "SESSION",
  "ACTIVATION",
  "LEARNING",
  "NAVIGATION",
  "CULTURE",
  "MASTERY",
  "PRACTICE",
  "TECHNICAL_FAILURE",
  "FEEDBACK",
] as const;

export type BetaEventCategory = (typeof BETA_EVENT_CATEGORIES)[number];

/** Canonical event names (client may emit a subset). */
export const BETA_EVENT_NAMES = [
  // SESSION
  "session_started",
  "session_ended",
  // ACTIVATION / FIRST MANDARIN
  "first_lesson_started",
  "first_lesson_completed",
  "first_mandarin_action",
  // LEARNING
  "journey_viewed",
  "journey_continue_tapped",
  "step_started",
  "step_completed",
  "lesson_completed",
  "interaction_attempted",
  "guided_try_started",
  "guided_try_completed",
  "guided_try_recovery_used",
  "hanzi_task_started",
  "hanzi_task_completed",
  "hanzi_recovery_used",
  "review_opened",
  "review_started",
  "review_completed",
  // AUDIO / SPEECH (technical — never audio bytes)
  "audio_start_requested",
  "audio_started",
  "audio_failed",
  "speech_started",
  "recording_started",
  "recording_completed",
  "speech_analysis_failed",
  "speech_flow_completed",
  // NAVIGATION / DISCOVERY
  "progression_mode_changed",
  "culture_first_switch",
  "practice_first_open",
  "mastery_first_open",
  // CULTURE
  "culture_node_started",
  "culture_node_completed",
  "culture_path_open",
  "culture_why_expanded",
  "culture_variation_expanded",
  "culture_sources_opened",
  "culture_decision_submitted",
  // FEEDBACK
  "micro_feedback_shown",
  "micro_feedback_answered",
  "micro_feedback_dismissed",
  "problem_report_opened",
  "problem_report_submitted",
  "problem_report_failed",
  // TECHNICAL
  "technical_failure",
] as const;

export type BetaEventName = (typeof BETA_EVENT_NAMES)[number];

export const AUDIO_FAILURE_REASONS = [
  "TIMEOUT",
  "PLAYBACK_START",
  "RESOURCE_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type AudioFailureReason = (typeof AUDIO_FAILURE_REASONS)[number];

/** Allowlisted metadata keys — unknown keys are dropped by the sanitizer. */
export const BETA_EVENT_SAFE_FIELDS = [
  "schemaVersion",
  "eventId",
  "name",
  "category",
  "at",
  "appVersion",
  "releaseId",
  "sourceSha",
  "platform",
  "deviceClass",
  "locale",
  "route",
  "lessonId",
  "stepKind",
  "itemId",
  "pathId",
  "from",
  "to",
  "mode",
  "reason",
  "errorCode",
  "online",
  "viewportClass",
  "diagnosticId",
  "feedbackKind",
  "answerId",
  "categoryId",
  "attemptCount",
  "durationMs",
  "isTechnical",
] as const;

export type BetaEventSafeField = (typeof BETA_EVENT_SAFE_FIELDS)[number];

const FORBIDDEN_KEY_RE =
  /email|password|token|authorization|cookie|refresh|access_token|stroke|waveform|transcript|microphone|rawAudio|recordingBlob|fullName|phone/i;

export interface BetaEventInput {
  name: BetaEventName;
  category: BetaEventCategory;
  detail?: Record<string, string | number | boolean | null | undefined>;
  at?: number;
  eventId?: string;
}

export interface SanitizedBetaEvent {
  schemaVersion: typeof BETA_EVENT_SCHEMA_VERSION;
  eventId: string;
  name: BetaEventName;
  category: BetaEventCategory;
  at: number;
  detail: Record<string, string | number | boolean | null>;
}

const SAFE_FIELD_SET = new Set<string>(BETA_EVENT_SAFE_FIELDS);
const NAME_SET = new Set<string>(BETA_EVENT_NAMES);

function newEventId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `be_${Date.now().toString(36)}_${rand}`;
}

/** Drop unknown / forbidden fields. Never accept nested objects. */
export function sanitizeBetaEventDetail(
  detail: Record<string, string | number | boolean | null | undefined> | undefined,
): Record<string, string | number | boolean | null> {
  if (!detail) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail).slice(0, 24)) {
    if (value === undefined) continue;
    if (FORBIDDEN_KEY_RE.test(key)) continue;
    if (!SAFE_FIELD_SET.has(key) && !["lessonId", "itemId", "pathId", "route", "from", "to", "mode", "reason", "errorCode", "answerId", "categoryId", "feedbackKind", "diagnosticId", "viewportClass", "platform", "deviceClass", "locale", "appVersion", "releaseId", "sourceSha", "online", "attemptCount", "durationMs", "isTechnical", "stepKind"].includes(key)) {
      continue;
    }
    if (typeof value === "string") {
      if (FORBIDDEN_KEY_RE.test(value)) continue;
      out[key] = value.slice(0, 120);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    }
  }
  return out;
}

export function sanitizeBetaEvent(input: BetaEventInput): SanitizedBetaEvent | null {
  if (!NAME_SET.has(input.name)) return null;
  if (!BETA_EVENT_CATEGORIES.includes(input.category)) return null;
  return {
    schemaVersion: BETA_EVENT_SCHEMA_VERSION,
    eventId: input.eventId && input.eventId.length >= 8 ? input.eventId.slice(0, 48) : newEventId(),
    name: input.name,
    category: input.category,
    at: typeof input.at === "number" && Number.isFinite(input.at) ? input.at : Date.now(),
    detail: sanitizeBetaEventDetail(input.detail),
  };
}

/**
 * Canonical first-meaningful-Mandarin resolver.
 * One authority — do not hard-code marketing definitions elsewhere.
 */
export type FirstMandarinSignal =
  | { kind: "guided_listen" }
  | { kind: "learner_response" }
  | { kind: "speech_attempt" }
  | { kind: "hanzi_task" }
  | { kind: "conversation_turn" };

export function resolveFirstMandarinEvent(signal: FirstMandarinSignal): BetaEventName {
  void signal;
  return "first_mandarin_action";
}

/** Coarse viewport bucket for diagnostics — not pixel scroll surveillance. */
export function viewportClassFromSize(width: number, _height: number): string {
  if (width <= 360) return "w360";
  if (width <= 375) return "w375";
  if (width <= 390) return "w390";
  if (width <= 430) return "w430";
  if (width >= 768) return "tablet";
  return "phone";
}

export function makeDiagnosticId(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LY-${part}`;
}
