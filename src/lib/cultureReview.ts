import { getCultureMission, allCultureMemoryTargets } from "../data/cultureMissions";
import {
  cultureText,
  isCultureStepScored,
  type CultureMissionStep,
  type CultureReviewVariant,
} from "../data/cultureQuest";
import { dueCultureMemoryTargets } from "./cultureMastery";
import type { CultureMemoryRecord } from "../data/cultureQuest";

export type CultureReviewTask = {
  id: string;
  targetId: string;
  cultureItemId: string;
  step: CultureMissionStep;
};

function variantToStep(targetId: string, variant: CultureReviewVariant, index: number): CultureMissionStep {
  return {
    id: `${targetId}-review-${index}`,
    kind: variant.kind === "sequence" ? "sequence" : variant.kind === "story_error" ? "scenario_choice" : "scenario_choice",
    scored: true,
    memoryTargetId: targetId,
    prompt: variant.prompt,
    options: variant.options,
    sequence: variant.sequence,
    sequenceCorrect: variant.sequenceCorrect,
  };
}

export function buildCultureReviewSession(
  memoryById: Record<string, CultureMemoryRecord>,
  now = Date.now(),
  limit = 5
): CultureReviewTask[] {
  const due = dueCultureMemoryTargets(memoryById, now).slice(0, Math.max(3, Math.min(7, limit)));
  const catalog = new Map(allCultureMemoryTargets().map((target) => [target.id, target]));
  const tasks: CultureReviewTask[] = [];
  for (const row of due) {
    const target = catalog.get(row.targetId);
    if (!target) continue;
    const variant = target.reviewVariants[row.reps % target.reviewVariants.length];
    if (!variant) continue;
    const step = variantToStep(target.id, variant, row.reps);
    const prompt = `${cultureText(step.prompt, "pt-BR")} ${cultureText(step.prompt, "en")}`;
    const answers = (step.options ?? [])
      .filter((option) => option.preferred)
      .map((option) => `${option.label.pt} ${option.label.en}`);
    if (answers.some((answer) => answer.trim() && prompt.includes(answer.trim()))) {
      continue;
    }
    tasks.push({
      id: step.id,
      targetId: target.id,
      cultureItemId: target.cultureItemId,
      step,
    });
    if (tasks.length >= limit) break;
  }
  return tasks;
}

export function reviewDoesNotTouchSrsKeys(patch: Record<string, unknown>): boolean {
  return !("srs" in patch) && !("learnedChars" in patch) && !("hanziBuilderProgressByChar" in patch);
}

export function getMissionOrThrow(id: string) {
  const mission = getCultureMission(id);
  if (!mission) throw new Error(`missing mission ${id}`);
  return mission;
}

export function scoredStepCount(steps: readonly CultureMissionStep[]): number {
  return steps.filter(isCultureStepScored).length;
}
