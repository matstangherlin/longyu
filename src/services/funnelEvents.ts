import { getInterfaceLocale } from "../i18n/locale";

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
  "review_started",
  "review_completed",
  "pro_offer_shown",
  "checkout_started",
  "subscription_activated",
] as const;

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number];

const PII_KEY = /email|name|phone|password|token|address/i;

export function trackFunnelEvent(
  eventType: FunnelEventType,
  metadata: Record<string, string | number | boolean | null> = {}
): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEY.test(key)) continue;
    safe[key] = value;
  }
  // Attached after the PII filter because the key contains the substring "name".
  // Locale is not nationality, country, or ethnicity.
  safe.interface_locale = getInterfaceLocale();
  try {
    window.dispatchEvent(new CustomEvent("longyu:funnel", { detail: { eventType, metadata: safe } }));
  } catch {
    // ignore
  }
  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.debug("[funnel]", eventType, safe);
  }
}
