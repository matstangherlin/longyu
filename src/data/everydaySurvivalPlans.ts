import type { Lesson, LessonStep } from "./journey";
import { EVERYDAY_SURVIVAL_TOPIC_IDS } from "./chinaSurvivalEveryday";

/**
 * Authored-only everyday chat. Do not mix Wave-1 drills into this review.
 */
export function everydaySurvivalPlanFor(lesson: Lesson): LessonStep[] | null {
  if (!(EVERYDAY_SURVIVAL_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  return lesson.steps ?? [];
}
