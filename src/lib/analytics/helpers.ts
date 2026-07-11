import { trackAnalytics, ANALYTICS_EVENTS } from "../../services/analyticsService";

export function trackOnboardingCompleted(): void {
  trackAnalytics({ event: ANALYTICS_EVENTS.onboarding_completed });
}

export function trackPlacementCompleted(level?: string): void {
  trackAnalytics({
    event: ANALYTICS_EVENTS.placement_completed,
    metadata: level ? { placement_level: level } : {},
  });
}

export function trackLessonLifecycle(
  event: typeof ANALYTICS_EVENTS.lesson_started | typeof ANALYTICS_EVENTS.lesson_completed | typeof ANALYTICS_EVENTS.lesson_abandoned,
  lessonId: string,
  metadata?: Record<string, unknown>
): void {
  trackAnalytics({ event, lessonId, metadata });
}

export function trackFirstLessonStarted(lessonId: string): void {
  trackAnalytics({ event: ANALYTICS_EVENTS.first_lesson_started, lessonId });
}

export function trackFirstLessonCompleted(lessonId: string): void {
  trackAnalytics({ event: ANALYTICS_EVENTS.first_lesson_completed, lessonId });
}
