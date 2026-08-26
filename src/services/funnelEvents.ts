export const FUNNEL_EVENT_TYPES = [
  "onboarding_started",
  "goal_selected",
  "self_assessment_selected",
  "placement_started",
  "placement_question_answered",
  "placement_completed",
  "placement_result_viewed",
  "signup_started",
  "signup_submitted",
  "email_confirmation_pending",
  "account_authenticated",
  "placement_committed",
  "journey_entered",
] as const;

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number];

export function trackFunnelEvent(
  eventType: FunnelEventType,
  metadata: Record<string, string | number | boolean | null> = {}
): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key.toLowerCase().includes("email") || key.toLowerCase().includes("name")) continue;
    safe[key] = value;
  }
  try {
    window.dispatchEvent(new CustomEvent("longyu:funnel", { detail: { eventType, metadata: safe } }));
  } catch {
    // ignore
  }
  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.debug("[funnel]", eventType, safe);
  }
}
