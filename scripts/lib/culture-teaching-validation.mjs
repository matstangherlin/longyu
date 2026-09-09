function textOf(copy) {
  return `${copy?.pt ?? ""} ${copy?.en ?? ""}`.trim();
}

function teachIndex(steps, conceptId) {
  return steps.findIndex(
    (step) =>
      step.kind === "culture_teach" &&
      (step.cultureConceptId ?? "") === conceptId &&
      String(step.explanation?.pt ?? "").trim() &&
      String(step.explanation?.en ?? "").trim()
  );
}

function scoredIndex(steps, conceptId, isScored) {
  return steps.findIndex(
    (step) => isScored(step) && (step.cultureConceptId ?? "") === conceptId
  );
}

function preferredLabels(step) {
  return (step?.options ?? [])
    .filter((option) => option.preferred)
    .flatMap((option) => [option.label?.pt ?? "", option.label?.en ?? ""])
    .map((label) => label.trim())
    .filter((label) => label.length > 16);
}

export function validateCultureTeachBeforeTest(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const isScored =
    data.isCultureStepScored ??
    ((step) =>
      ["scenario_choice", "dialogue_choice", "sequence", "match", "culture_recall"].includes(step.kind) &&
      step.scored !== false &&
      step.role !== "demo");

  for (const mission of data.missions ?? []) {
    const steps = mission.steps ?? [];
    const concepts = new Set(
      steps
        .map((step) => step.cultureConceptId)
        .filter(Boolean)
        .concat((mission.memoryTargets ?? []).map((target) => target.id))
    );
    for (const conceptId of concepts) {
      const firstTeach = teachIndex(steps, conceptId);
      const firstScored = scoredIndex(steps, conceptId, isScored);
      if (firstScored < 0) continue;
      if (firstTeach < 0) {
        fail("UNTAUGHT_CONCEPT", `${mission.id}:${conceptId}`, "scored concept never taught in the mission");
        continue;
      }
      if (!(firstTeach < firstScored)) {
        fail("TEACH_AFTER_TEST", `${mission.id}:${conceptId}`, "first teach must precede first scored step");
      }
      const teachText = steps
        .filter((step) => step.kind === "culture_teach" && step.cultureConceptId === conceptId)
        .map((step) => `${textOf(step.explanation)} ${textOf(step.why)} ${textOf(step.example)}`)
        .join(" ");
      const firstScoredStep = steps[firstScored];
      if (preferredLabels(firstScoredStep).some((label) => teachText.includes(label))) {
        fail("TEACH_LEAKS_ANSWER", `${mission.id}:${conceptId}`, "teach screen copies the preferred option");
      }
    }

    const dialoguePractice = steps.findIndex((step) => step.kind === "dialogue_choice" && isScored(step));
    if (mission.flagship && dialoguePractice >= 0) {
      const demo = steps.findIndex(
        (step, index) =>
          index < dialoguePractice &&
          step.role === "demo" &&
          (step.beats ?? []).some((beat) => beat.hanzi)
      );
      if (demo < 0) {
        fail("NO_DIALOGUE_DEMO", mission.id, "flagship dialogue practice needs a demonstration first");
      }
    }

    for (const step of steps) {
      if (step.kind !== "dialogue_choice" || !isScored(step)) continue;
      const missing = (step.options ?? []).filter((option) => !option.reaction);
      if (missing.length) {
        fail("NO_NPC_REACTION", step.id, "scored dialogue options need an NPC reaction");
      }
    }
  }

  return { failures, count: (data.missions ?? []).length };
}
