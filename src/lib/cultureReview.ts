import { getCultureMission, allCultureMemoryTargets } from "../data/cultureMissions";
import {
  cultureText,
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
  const cap = Math.max(3, Math.min(7, limit));
  const due = dueCultureMemoryTargets(memoryById, now);
  const catalog = new Map(allCultureMemoryTargets().map((target) => [target.id, target]));
  const tasks: CultureReviewTask[] = [];

  function tryPush(row: CultureMemoryRecord, variantIndex: number): boolean {
    const target = catalog.get(row.targetId);
    if (!target) return false;
    const variant = target.reviewVariants[variantIndex % target.reviewVariants.length];
    if (!variant) return false;
    const step = variantToStep(target.id, variant, variantIndex);
    if (step.kind === "sequence") {
      if ((step.sequence ?? []).length < 2) return false;
    } else if ((step.options ?? []).filter((option) => cultureText(option.label, "pt-BR").trim()).length < 2) {
      return false;
    }
    const prompt = `${cultureText(step.prompt, "pt-BR")} ${cultureText(step.prompt, "en")}`;
    const answers = (step.options ?? [])
      .filter((option) => option.preferred)
      .map((option) => `${option.label.pt} ${option.label.en}`);
    if (answers.some((answer) => answer.trim() && prompt.includes(answer.trim()))) {
      return false;
    }
    const id = `${step.id}-${variantIndex}`;
    if (tasks.some((task) => task.id === id)) return false;
    tasks.push({
      id,
      targetId: target.id,
      cultureItemId: target.cultureItemId,
      step,
    });
    return true;
  }

  for (const row of due) {
    tryPush(row, row.reps);
    if (tasks.length >= cap) break;
  }
  if (tasks.length < 3) {
    for (const row of due) {
      for (let extra = 1; extra < 3 && tasks.length < 3; extra += 1) {
        tryPush(row, row.reps + extra);
      }
      if (tasks.length >= 3) break;
    }
  }
  return tasks.slice(0, cap);
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
