import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureTeachBeforeTest } from "./lib/culture-teaching-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureTeachBeforeTest(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureTeachBeforeTest(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 remove explanation before first task", (data) => {
  const mission = data.missions.find((row) => row.cultureItemId === "shared-dishes") ?? data.missions[0];
  mission.steps = mission.steps.filter((step) => step.kind !== "culture_teach");
}, "UNTAUGHT_CONCEPT");

mutation("2 task uses conceptId never taught", (data) => {
  const mission = data.missions[0];
  const scored = mission.steps.find(
    (step) =>
      ["scenario_choice", "dialogue_choice", "sequence", "match", "culture_recall"].includes(step.kind) &&
      step.scored !== false &&
      step.role !== "demo"
  );
  scored.cultureConceptId = "never-taught-concept";
}, "UNTAUGHT_CONCEPT");

mutation("12 dialogue without NPC reaction", (data) => {
  const mission = data.missions.find((row) => row.steps.some((step) => step.kind === "dialogue_choice")) ?? data.missions[0];
  for (const step of mission.steps) {
    if (step.kind === "dialogue_choice") {
      for (const option of step.options ?? []) delete option.reaction;
    }
  }
}, "NO_NPC_REACTION");

console.log("PASS test:culture-teach-before-test");
