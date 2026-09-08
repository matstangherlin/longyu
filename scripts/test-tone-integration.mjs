import assert from "node:assert/strict";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateToneIntegration } from "./lib/tone-integration-validation.mjs";

const base = loadIntegratedLearningRuntime();
assert.deepEqual(validateToneIntegration(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateToneIntegration(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived (expected ${code}); ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

mutation("5 explanation removed before first tone contrast", (data) => {
  data.tonePlans[1] = data.tonePlans[1].filter((step) => step.kind !== "intro");
}, "EXPLAIN_BEFORE_TEST");

mutation("6 tone drill uses an untaught word", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-horarios");
  const drill = lesson.steps.find((step) => step.kind === "listen_select" && String(step.title ?? "").includes("1º tom"));
  drill.options = ["苹果", "今天", "明天"];
  drill.correctAnswer = "苹果";
  drill.audioText = "苹果";
}, "UNTAUGHT_TONE_VOCAB");

console.log("PASS tone-integration mutations 5, 6");
