import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureExplanationDepth } from "./lib/culture-explanation-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureExplanationDepth(base).failures, [], "positive control must pass");

function fixture() {
  return cloneCultureRuntime(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureExplanationDepth(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("3 flagship without dialogue demonstration", (data) => {
  const flagship = data.missions.find((mission) => mission.flagship) ?? data.missions[0];
  flagship.flagship = true;
  flagship.steps = flagship.steps.filter((step) => !(step.role === "demo" && (step.beats ?? []).some((beat) => beat.hanzi)));
}, "FLAGSHIP_NO_DIALOGUE_DEMO");

mutation("8 explanation only in PT", (data) => {
  const teach = data.missions[0].steps.find((step) => step.kind === "culture_teach");
  teach.explanation.en = "   ";
  teach.title.en = "   ";
}, "MISSING_EN");

console.log("PASS test:culture-explanation-depth");
