/**
 * RC2.3.3 — Culture Moment (journey) vs Culture Deep Dive (hub).
 * Same CultureMission source; modes derive different step subsets.
 */

import type { CultureMission, CultureMissionStep } from "../../data/cultureQuest";

export type CulturePlayMode = "journey" | "deep";

const MOMENT_KINDS = new Set([
  "story",
  "culture_teach",
  "scenario_choice",
  "dialogue_choice",
  "culture_summary",
]);

/**
 * Journey Culture Moment: short essential path —
 * first story → first decision (+ reaction) → one teach/takeaway → summary.
 * Deep Dive keeps the full authored mission.
 */
export function stepsForCultureMode(
  mission: CultureMission,
  mode: CulturePlayMode
): CultureMissionStep[] {
  if (mode === "deep") return mission.steps;

  const steps = mission.steps;
  const picked: CultureMissionStep[] = [];
  let sawStory = false;
  let sawDecision = false;
  let sawTeach = false;

  for (const step of steps) {
    if (!MOMENT_KINDS.has(step.kind)) continue;

    if (step.kind === "story" && !sawStory) {
      picked.push(step);
      sawStory = true;
      continue;
    }
    if ((step.kind === "scenario_choice" || step.kind === "dialogue_choice") && !sawDecision) {
      picked.push(step);
      sawDecision = true;
      continue;
    }
    if ((step.kind === "culture_teach" || step.kind === "culture_summary") && sawDecision && !sawTeach) {
      picked.push(step);
      sawTeach = true;
      continue;
    }
    if (step.kind === "culture_summary" && sawDecision && !picked.some((s) => s.kind === "culture_summary")) {
      picked.push(step);
      sawTeach = true;
    }
  }

  // Ensure at least one decision if mission has any scored choice.
  if (!sawDecision) {
    const choice = steps.find(
      (s) => s.kind === "scenario_choice" || s.kind === "dialogue_choice"
    );
    if (choice) picked.push(choice);
  }

  if (picked.length === 0) return steps.slice(0, Math.min(4, steps.length));
  return picked;
}

export function estimatedMinutesForMode(
  mission: CultureMission,
  mode: CulturePlayMode
): number {
  if (mode === "deep") return mission.estimatedMinutes;
  const n = stepsForCultureMode(mission, "journey").length;
  return Math.max(1, Math.min(3, Math.ceil(n * 0.6)));
}

export function cultureModeFromQuery(search: string | URLSearchParams): CulturePlayMode {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const src = params.get("src");
  const mode = params.get("mode");
  if (mode === "deep" || mode === "journey") return mode;
  if (src === "jornada" || params.get("gate")) return "journey";
  if (src === "cultura") return "deep";
  return "deep";
}
