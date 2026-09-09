function textOf(copy) {
  return `${copy?.pt ?? ""} ${copy?.en ?? ""}`.trim();
}

function preferredLabels(step) {
  return (step?.options ?? []).filter((option) => option.preferred).map((option) => textOf(option.label));
}

export function validateCultureMissions(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const items = data.items ?? [];
  const missions = data.missions ?? [];
  const byItem = new Map(missions.map((mission) => [mission.cultureItemId, mission]));
  const flagshipIds = new Set(data.flagshipIds ?? []);
  const isScored = data.isCultureStepScored ?? ((step) =>
    ["scenario_choice", "dialogue_choice", "sequence", "match", "culture_recall"].includes(step.kind) && step.scored !== false);

  if (items.length && items.length !== missions.length) {
    fail("MISSION_COUNT", "catalog", `items ${items.length} vs missions ${missions.length}`);
  }

  for (const item of items) {
    const mission = byItem.get(item.id);
    if (!mission) {
      fail("MISSING_MISSION", item.id, "CultureItem without mission");
      continue;
    }
    if (!String(mission.titlePt ?? "").trim() || !String(mission.titleEn ?? "").trim()) {
      fail("MISSING_EN", item.id, "mission needs PT and EN titles");
    }
    const steps = mission.steps ?? [];
    const scored = steps.filter(isScored);
    if (scored.length < 2) fail("NO_TASKS", item.id, "mission with only text and zero task");
    const hasContext = steps.some((step) => step.kind === "story" || String(step.body?.pt ?? "").trim() || (step.beats ?? []).length);
    if (!hasContext) fail("NO_CONTEXT", item.id, "mission needs context");
    const hasFeedback = steps.some((step) => (step.options ?? []).some((option) => textOf(option.feedback)));
    if (!hasFeedback) fail("NO_FEEDBACK", item.id, "mission needs feedback");
    if (!(mission.memoryTargets ?? []).length) fail("NO_MEMORY", item.id, "mission without memory target");
    for (const target of mission.memoryTargets ?? []) {
      if (!String(target.concept?.en ?? "").trim() || !String(target.prompt?.en ?? "").trim()) {
        fail("MISSING_EN", target.id, "memory target needs EN");
      }
      if (!(target.reviewVariants ?? []).length) fail("NO_REVIEW", target.id, "memory cannot generate review");
    }
    if (!item.sources?.length) fail("MISSING_SOURCE", item.id, "source required");
    if (!item.scope) fail("MISSING_SCOPE", item.id, "scope required");

    if (flagshipIds.has(item.id) || mission.flagship) {
      const narrative = steps.some((step) => step.kind === "story" || step.kind === "dialogue_choice");
      const decisions = steps.filter((step) => step.kind === "scenario_choice" || step.kind === "dialogue_choice");
      if (!narrative) fail("FLAGSHIP_NO_STORY", item.id, "flagship needs story/dialogue");
      if (decisions.length < 1) fail("FLAGSHIP_NO_DECISION", item.id, "story without decision/application");
    }
  }

  const routeItems = new Set((data.routes ?? []).flatMap((route) => route.itemIds ?? []));
  for (const item of items) {
    if (!routeItems.has(item.id)) fail("UNROUTED", item.id, "item missing from cultural routes");
  }

  return { failures, count: missions.length };
}

export function answerLeaksInPrompt(step) {
  const prompts = [step?.prompt?.pt ?? "", step?.prompt?.en ?? ""];
  const answers = (step?.options ?? [])
    .filter((option) => option.preferred)
    .flatMap((option) => [option.label?.pt ?? "", option.label?.en ?? ""]);
  return answers.some((answer) => answer.trim().length > 12 && prompts.some((prompt) => prompt.includes(answer.trim())));
}
