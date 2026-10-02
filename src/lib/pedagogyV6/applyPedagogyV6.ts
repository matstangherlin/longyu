/**
 * RC2.3.0 — orquestra Descoberta + anti-repetição + Visual First (RC2.3.1).
 */
import type { LessonStep } from "../../data/journey";
import { withDiscoveryStage, type TaughtConceptMap } from "./discovery";
import { diversifyPerceptualSession } from "./perceptualRepetition";
import { enrichStepWithVisual, isAbstractPedagogyLesson } from "./earlyVisual";
import { PEDAGOGY_V6_VERSION } from "./discovery";
import { applyVisualFirstToPlan } from "../visualFirst/applyVisualFirst";

export interface PedagogyV6PlanResult {
  steps: LessonStep[];
  discoveryInjected: boolean;
  discoveryMomentId: string | null;
  perceptualRemoved: number;
  perceptualReordered: boolean;
  visualInjectedImageChoices?: number;
  visualInjectedScenes?: number;
  version: typeof PEDAGOGY_V6_VERSION;
}

export function applyPedagogyV6ToPlan(input: {
  lessonId: string;
  masteryPass: number;
  steps: LessonStep[];
  taughtConceptIds?: TaughtConceptMap;
  unitIndex?: number;
  /** Piloto V6: discovery/diversify só no early set. Visual First aplica ao currículo. */
  pilotOnly?: boolean;
}): PedagogyV6PlanResult {
  const pilotLesson =
    /^(p1-o-que-e-|p1-primeiros-hanzi|p1-engine-2-lab|l1$|l2$|l3$|l1-rev|l2-rev)/.test(input.lessonId);

  let steps = input.steps;
  let discoveryInjected = false;
  let discoveryMomentId: string | null = null;
  let perceptualRemoved = 0;
  let perceptualReordered = false;

  if (input.pilotOnly === false || pilotLesson) {
    const taught = input.taughtConceptIds ?? {};
    const discovery = withDiscoveryStage(input.lessonId, input.masteryPass, steps, taught);
    steps = discovery.steps;
    discoveryInjected = discovery.injected;
    discoveryMomentId = discovery.momentId;

    if (!isAbstractPedagogyLesson(input.lessonId)) {
      steps = steps.map(enrichStepWithVisual);
    }

    const diversified = diversifyPerceptualSession(steps);
    steps = diversified.steps;
    perceptualRemoved = diversified.removed;
    perceptualReordered = diversified.reordered;
  }

  // RC2.3.1 — Visual First curriculum-wide (não limitado ao piloto V6).
  const visual = applyVisualFirstToPlan({
    lessonId: input.lessonId,
    masteryPass: input.masteryPass,
    unitIndex: input.unitIndex ?? 0,
    steps,
    taughtConceptIds: Object.keys(input.taughtConceptIds ?? {}).filter((k) => input.taughtConceptIds?.[k]),
  });

  return {
    steps: visual.steps,
    discoveryInjected,
    discoveryMomentId,
    perceptualRemoved: perceptualRemoved + visual.saturatedVisualsRemoved,
    perceptualReordered,
    visualInjectedImageChoices: visual.injectedImageChoices,
    visualInjectedScenes: visual.injectedScenes,
    version: PEDAGOGY_V6_VERSION,
  };
}

export { PEDAGOGY_V6_VERSION };
