import type { Lesson, LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { HEALTH_SURVIVAL_TOPIC_IDS } from "./chinaSurvivalHealth";

/**
 * Keep the authored health progression instead of Wave-1 bonus drills
 * that split 医生 into 医+生 and skip 我不舒服.
 *
 * M1 learn / recognize / fill / build: unwell, sick, X+疼.
 * M2 fever, symptom listening, doctor as a word, hospital fill as transfer.
 * M3 speak unwell/fever, then guided 医生 → speak doctor.
 * M4 delayed symptom listen + 医院 fill → produce 医院在哪里？ → friend conversation.
 */
function slice(steps: LessonStep[], indexes: number[]): LessonStep[] {
  return indexes.map((index) => steps[index]).filter((step): step is LessonStep => Boolean(step));
}

export const HEALTH_SURVIVAL_PASS_INDEXES: Record<"p6-saude", Record<MasteryPass, number[]>> = {
  "p6-saude": {
    1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    2: [13, 14, 15, 17, 18, 19, 20, 22],
    3: [12, 16, 19, 21],
    4: [17, 22, 23, 24],
  },
};

export function healthSurvivalPlanFor(
  lesson: Lesson,
  pass: MasteryPass,
  aggregate = false
): LessonStep[] | null {
  if (!(HEALTH_SURVIVAL_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  if (lesson.id !== "p6-saude") return null;
  if (aggregate) return lesson.steps;
  const indexes = HEALTH_SURVIVAL_PASS_INDEXES["p6-saude"][pass];
  return indexes ? slice(lesson.steps, indexes) : null;
}
