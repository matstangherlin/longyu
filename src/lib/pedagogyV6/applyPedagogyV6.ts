/**
 * RC2.3.0 — orquestra Descoberta + anti-repetição + visual piloto no plano.
 */
import type { LessonStep } from "../../data/journey";
import { withDiscoveryStage, type TaughtConceptMap } from "./discovery";
import { diversifyPerceptualSession } from "./perceptualRepetition";
import { enrichStepWithVisual, isAbstractPedagogyLesson } from "./earlyVisual";
import { PEDAGOGY_V6_VERSION } from "./discovery";

export interface PedagogyV6PlanResult {
  steps: LessonStep[];
  discoveryInjected: boolean;
  discoveryMomentId: string | null;
  perceptualRemoved: number;
  perceptualReordered: boolean;
  version: typeof PEDAGOGY_V6_VERSION;
}

export function applyPedagogyV6ToPlan(input: {
  lessonId: string;
  masteryPass: number;
  steps: LessonStep[];
  taughtConceptIds?: TaughtConceptMap;
  /** Piloto: só aplica diversificação / discovery em lições do early set. */
  pilotOnly?: boolean;
}): PedagogyV6PlanResult {
  const pilotLesson =
    /^(p1-o-que-e-|p1-primeiros-hanzi|p1-engine-2-lab|l1$|l2$|l3$|l1-rev|l2-rev)/.test(input.lessonId);
  if (input.pilotOnly !== false && !pilotLesson) {
    return {
      steps: input.steps,
      discoveryInjected: false,
      discoveryMomentId: null,
      perceptualRemoved: 0,
      perceptualReordered: false,
      version: PEDAGOGY_V6_VERSION,
    };
  }

  const taught = input.taughtConceptIds ?? {};
  const discovery = withDiscoveryStage(input.lessonId, input.masteryPass, input.steps, taught);

  let steps = discovery.steps;
  if (!isAbstractPedagogyLesson(input.lessonId)) {
    steps = steps.map(enrichStepWithVisual);
  }

  const diversified = diversifyPerceptualSession(steps);

  return {
    steps: diversified.steps,
    discoveryInjected: discovery.injected,
    discoveryMomentId: discovery.momentId,
    perceptualRemoved: diversified.removed,
    perceptualReordered: diversified.reordered,
    version: PEDAGOGY_V6_VERSION,
  };
}

export { PEDAGOGY_V6_VERSION };
