import assert from "node:assert/strict";
import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateCapstoneNoNewVocabulary } from "./lib/capstone-no-new-vocabulary-validation.mjs";

const base = loadCapstoneRuntime();
assert.deepEqual(validateCapstoneNoNewVocabulary(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return structuredClone({
    lessons: base.lessons,
    scenes: base.scenes,
    chunks: base.chunks,
  });
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCapstoneNoNewVocabulary(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 capstone adds newRef", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-china-survival");
  lesson.newRefs = ["chunk:brand-new-survival"];
}, "NO_NEW_VOCAB");

mutation("11 capstone teaches new Hanzi", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-china-survival");
  lesson.newHanzi = ["龘"];
}, "NO_NEW_VOCAB");

mutation("2 phrase without prior teach", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  scene.newRefs = ["chunk:never-taught-9b"];
}, "NO_NEW_VOCAB");

console.log("PASS test:capstone-no-new-vocabulary");
