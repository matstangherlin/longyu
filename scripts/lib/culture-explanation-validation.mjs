function hasText(copy) {
  return Boolean(String(copy?.pt ?? "").trim() && String(copy?.en ?? "").trim());
}

function wordCount(copy) {
  return String(copy?.pt ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function validateCultureExplanationDepth(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const items = new Map((data.items ?? []).map((item) => [item.id, item]));

  for (const mission of data.missions ?? []) {
    const item = items.get(mission.cultureItemId);
    const teach = (mission.steps ?? []).filter((step) => step.kind === "culture_teach");
    if (!teach.length) fail("NO_EXPLANATION", mission.id, "mission needs culture_teach");
    const hasWhat = teach.some((step) => hasText(step.explanation));
    const hasWhy = teach.some((step) => hasText(step.why) || hasText(step.whyMore?.motive));
    const hasHow = teach.some((step) => hasText(step.example) || hasText(step.explanation));
    const hasExample = teach.some((step) => hasText(step.example) || (step.beats ?? []).length > 0);
    if (!hasWhat) fail("NO_WHAT", mission.id, "explanation missing what happens");
    if (!hasWhy) fail("NO_WHY", mission.id, "explanation missing why");
    if (!hasHow) fail("NO_HOW", mission.id, "explanation missing practical guidance");
    if (!hasExample) fail("NO_EXAMPLE", mission.id, "explanation missing example");
    if (item?.variabilityPt && !teach.some((step) => hasText(step.variability))) {
      fail("NO_VARIABILITY", mission.id, "item has variability but teach screens omit it");
    }
    for (const step of teach) {
      if (!hasText(step.explanation) || !hasText(step.title)) {
        fail("MISSING_EN", step.id, "teach step needs PT and EN");
      }
      if (wordCount(step.explanation) > 120) {
        fail("TEACH_TOO_LONG", step.id, "teach screen should stay short");
      }
    }

    const scored = (mission.steps ?? []).filter((step) =>
      (data.isCultureStepScored ?? ((row) => row.scored !== false))(step)
    );
    const cognitives = new Set(
      scored
        .map((step) => step.cognitive ?? (data.cognitiveForStep ? data.cognitiveForStep(step) : step.kind))
        .filter(Boolean)
    );
    if (cognitives.size < 2) {
      fail("SINGLE_COGNITIVE", mission.id, "mission needs at least two cognitive categories");
    }

    if (mission.flagship) {
      const demo = (mission.steps ?? []).some(
        (step) => step.role === "demo" && (step.beats ?? []).some((beat) => beat.hanzi)
      );
      if (!demo) fail("FLAGSHIP_NO_DIALOGUE_DEMO", mission.id, "flagship needs a dialogue demonstration");
      const hasDecision = scored.some((step) => step.kind === "scenario_choice" || step.kind === "dialogue_choice");
      const hasRecall = scored.some((step) => step.kind === "culture_recall" || step.role === "recall");
      if (!hasDecision) fail("FLAGSHIP_NO_DECISION", mission.id, "flagship needs a decision");
      if (!hasRecall) fail("FLAGSHIP_NO_RECALL", mission.id, "flagship needs recall");
    }

    for (const target of mission.memoryTargets ?? []) {
      const kinds = new Set((target.reviewVariants ?? []).map((variant) => variant.kind));
      if (!kinds.has("scenario_choice") || !kinds.has("story_error") || !kinds.has("sequence")) {
        fail("REVIEW_FORMATS", target.id, "memory target needs situation, character error, and sequence/dialogue variants");
      }
    }
  }

  return { failures, count: (data.missions ?? []).length };
}
