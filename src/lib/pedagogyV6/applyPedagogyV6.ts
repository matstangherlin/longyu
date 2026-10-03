/**
 * RC2.3.0 — orquestra Descoberta + anti-repetição + Visual First (RC2.3.1)
 * + Everyday Mandarin (RC2.3.2) + Hànzì Progressive Writing (RC2.3.4).
 */
import type { LessonStep } from "../../data/journey";
import { withDiscoveryStage, type TaughtConceptMap } from "./discovery";
import { diversifyPerceptualSession } from "./perceptualRepetition";
import { enrichStepWithVisual, isAbstractPedagogyLesson } from "./earlyVisual";
import { PEDAGOGY_V6_VERSION } from "./discovery";
import { applyVisualFirstToPlan } from "../visualFirst/applyVisualFirst";
import { applyEverydayMandarinToPlan } from "../everydayMandarin/applyEverydayMandarin";
import { applyHanziProgressiveWritingToPlan } from "../hanziWriting/applyWriting";

export interface PedagogyV6PlanResult {
  steps: LessonStep[];
  discoveryInjected: boolean;
  discoveryMomentId: string | null;
  perceptualRemoved: number;
  perceptualReordered: boolean;
  visualInjectedImageChoices?: number;
  visualInjectedScenes?: number;
  everydayInjectedScenarios?: number;
  everydayHumanizedPrompts?: number;
  hanziWritingInjected?: number;
  version: typeof PEDAGOGY_V6_VERSION;
}

export function applyPedagogyV6ToPlan(input: {
  lessonId: string;
  masteryPass: number;
  steps: LessonStep[];
  taughtConceptIds?: TaughtConceptMap;
  unitIndex?: number;
  taughtHanzi?: readonly string[];
  completedLessons?: readonly string[];
  /** Piloto V6: discovery/diversify só no early set. Visual First + Everyday aplicam ao currículo. */
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

  const visual = applyVisualFirstToPlan({
    lessonId: input.lessonId,
    masteryPass: input.masteryPass,
    unitIndex: input.unitIndex ?? 0,
    steps,
    taughtConceptIds: Object.keys(input.taughtConceptIds ?? {}).filter((k) => input.taughtConceptIds?.[k]),
  });
  steps = visual.steps;

  const everyday = applyEverydayMandarinToPlan({
    lessonId: input.lessonId,
    masteryPass: input.masteryPass,
    unitIndex: input.unitIndex ?? 0,
    steps,
    taughtHanzi: input.taughtHanzi,
  });
  steps = everyday.steps;

  if (everyday.injectedScenarios > 0 || everyday.injectedDialogueCompletions > 0) {
    const again = diversifyPerceptualSession(steps);
    steps = again.steps;
    perceptualRemoved += again.removed;
    perceptualReordered = perceptualReordered || again.reordered;
  }

  const writing = applyHanziProgressiveWritingToPlan({
    lessonId: input.lessonId,
    masteryPass: input.masteryPass,
    steps,
    taught: input.taughtConceptIds,
    completedLessons: input.completedLessons,
  });
  steps = writing.steps as LessonStep[];

  return {
    steps,
    discoveryInjected,
    discoveryMomentId,
    perceptualRemoved: perceptualRemoved + visual.saturatedVisualsRemoved,
    perceptualReordered,
    visualInjectedImageChoices: visual.injectedImageChoices,
    visualInjectedScenes: visual.injectedScenes,
    everydayInjectedScenarios: everyday.injectedScenarios,
    everydayHumanizedPrompts: everyday.humanizedPrompts,
    hanziWritingInjected: writing.writingInjected,
    version: PEDAGOGY_V6_VERSION,
  };
}

export { PEDAGOGY_V6_VERSION };
