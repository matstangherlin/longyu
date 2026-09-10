import type { Lesson, LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { MOBILITY_SURVIVAL_TOPIC_IDS } from "./chinaSurvivalMobility";

/**
 * Keep the authored mobility progression instead of a generated 8-step drill
 * that swaps pegar-taxi for a shop chat. M1 sees, M2 listens, M3 follows,
 * M4 produces and talks.
 */
function slice(steps: LessonStep[], indexes: number[]): LessonStep[] {
  return indexes.map((index) => steps[index]).filter((step): step is LessonStep => Boolean(step));
}

const PASS_INDEXES: Record<(typeof MOBILITY_SURVIVAL_TOPIC_IDS)[number], Record<MasteryPass, number[]>> = {
  "p6-cidade-lugares": {
    1: [0, 1, 2, 3, 4, 9, 10, 11, 12, 13, 14],
    2: [5, 6, 7, 8, 15, 16, 17, 18, 19, 20],
    3: [21, 22, 23, 26, 27],
    4: [24, 25, 28],
  },
  "p6-direcoes": {
    1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 21, 22],
    2: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25],
    3: [27, 28, 29, 30, 31, 32],
    4: [33, 34, 35, 36],
  },
  "p6-china-ruas": {
    1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    2: [11, 12, 13, 19, 20, 21, 22, 26],
    3: [14, 15, 16, 17, 18, 23, 24, 25],
    4: [29, 27, 28, 26],
  },
  "p7-imersao-estacao": {
    1: [0, 1, 2, 3, 4, 5, 6, 7],
    2: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    3: [23, 24, 25, 26, 27, 28, 29, 30, 31, 38, 43],
    4: [40, 41, 42, 44, 45, 46, 47, 48, 49],
  },
};

export function mobilitySurvivalPlanFor(
  lesson: Lesson,
  pass: MasteryPass,
  aggregate = false
): LessonStep[] | null {
  if (!(MOBILITY_SURVIVAL_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  if (aggregate) return lesson.steps;
  // Cidade M3/M4 keep the generated production/transfer kinds; authored
  // slices of this lesson have no map/scene/free_production steps.
  if (lesson.id === "p6-cidade-lugares" && pass >= 3) return null;
  const indexes = PASS_INDEXES[lesson.id as (typeof MOBILITY_SURVIVAL_TOPIC_IDS)[number]]?.[pass];
  return indexes ? slice(lesson.steps, indexes) : null;
}
