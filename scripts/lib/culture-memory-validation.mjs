import { answerLeaksInPrompt } from "./culture-missions-validation.mjs";

export function validateCultureMemory(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const missions = data.missions ?? [];

  for (const mission of missions) {
    const targets = mission.memoryTargets ?? [];
    if (!targets.length) fail("NO_MEMORY", mission.cultureItemId, "memory target exists required");
    for (const target of targets) {
      if (!(target.reviewVariants ?? []).length) fail("NO_REVIEW", target.id, "review cannot be generated");
      for (const [index, variant] of (target.reviewVariants ?? []).entries()) {
        const step = {
          prompt: variant.prompt,
          options: variant.options,
        };
        if (answerLeaksInPrompt(step)) fail("ANSWER_IN_PROMPT", `${target.id}:${index}`, "review presents answer in prompt");
      }
      const recall = (mission.steps ?? []).find((step) => step.memoryTargetId === target.id);
      if (recall && answerLeaksInPrompt(recall)) fail("ANSWER_IN_PROMPT", recall.id, "recall prompt contains answer");
    }
  }

  return { failures, count: missions.length };
}
