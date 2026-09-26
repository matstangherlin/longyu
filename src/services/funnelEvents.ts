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
  "course_direction_selected",
  // RC2.2.17 · AI — meta diária escolhida no onboarding (só os minutos).
  "daily_goal_selected",
  // RC2.2.18 · CD — descoberta progressiva (ids e áreas, nunca PII).
  "guidance_shown",
  "guidance_render_failed",
  "guidance_dismissed",
  "feature_unlocked",
  "feature_opened_after_unlock",
  // RC2.2.19 — estágios do cadastro (estágio, código, plataforma, build; nunca PII).
  "signup_stage",
  "signup_failed",
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
