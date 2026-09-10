import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureStoryAudio } from "./lib/v498a2-gates.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureStoryAudio(base).failures, [], "story-audio positive");

function kill(label, edit, code) {
  const data = cloneCultureRuntime(base);
  edit(data);
  const failures = validateCultureStoryAudio(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived; ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

kill("4 flagship speech without audio", (data) => {
  const lesson = data.nativeLessons.find((item) => item.id === "culture-visiting-home");
  for (const step of lesson.steps) {
    if (step.audioText || step.hanzi) {
      step.audioText = "";
      step.hanzi = "";
    }
  }
}, "NO_AUDIO");

kill("5 remove replay audio surface", (data) => {
  data.stepsSource = "function StepIntro() { return null }";
}, "NO_AUDIO");

console.log("PASS test:culture-story-audio");
