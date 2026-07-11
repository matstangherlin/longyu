/** Nomes de eventos de analytics do beta — catálogo fechado. */

export const ANALYTICS_EVENTS = {
  landing_viewed: "landing_viewed",
  get_started_clicked: "get_started_clicked",
  login_clicked: "login_clicked",
  onboarding_started: "onboarding_started",
  onboarding_completed: "onboarding_completed",
  placement_completed: "placement_completed",
  first_lesson_started: "first_lesson_started",
  first_lesson_completed: "first_lesson_completed",
  lesson_started: "lesson_started",
  lesson_completed: "lesson_completed",
  lesson_abandoned: "lesson_abandoned",
  lesson_recovery_started: "lesson_recovery_started",
  lesson_recovery_completed: "lesson_recovery_completed",
  step_mistake: "step_mistake",
  hanzi_builder_completed: "hanzi_builder_completed",
  story_started: "story_started",
  story_completed: "story_completed",
  review_completed: "review_completed",
  charge_consumed: "charge_consumed",
  charge_exhausted: "charge_exhausted",
  story_energy_granted: "story_energy_granted",
  mission_claimed: "mission_claimed",
  pro_offer_shown: "pro_offer_shown",
  pro_offer_clicked: "pro_offer_clicked",
  checkout_started: "checkout_started",
  trial_started: "trial_started",
  subscription_activated: "subscription_activated",
  subscription_canceled: "subscription_canceled",
  sync_failed: "sync_failed",
  sync_recovered: "sync_recovered",
  app_error: "app_error",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsTrackInput {
  event: AnalyticsEventName;
  route?: string;
  lessonId?: string;
  stepType?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsPayload {
  anonymous_id: string;
  session_id: string;
  event_name: AnalyticsEventName;
  route: string;
  lesson_id?: string | null;
  step_type?: string | null;
  metadata: Record<string, unknown>;
  app_version: string;
}
