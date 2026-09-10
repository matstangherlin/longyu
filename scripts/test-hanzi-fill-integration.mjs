#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateHanziFillIntegration } from "./lib/v498b1-gates.mjs";

const base = loadIntegratedLearningRuntime();
assert.equal(validateHanziFillIntegration(base).failures.length, 0, "positive control");

function fixture() {
  return structuredClone({
    lessons: base.lessons,
    hanziMemoryTargets: base.hanziMemoryTargets,
    chunks: base.chunks,
    characters: base.characters,
  });
}

function killed(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateHanziFillIntegration(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("9 CORE never retrieved", (data) => {
  data.hanziMemoryTargets = [...data.hanziMemoryTargets, { glyph: "龘", charId: "fake", introduceLessonId: data.lessons[0].id, delayedLessonIds: [] }];
  data.lessons[0].hanziMemoryTargets = [...(data.lessons[0].hanziMemoryTargets ?? []), "龘"];
}, "HANZI_CORE_RETRIEVAL");

killed("11 fill leaks target", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-survival-mandarin");
  const fill = lesson.steps.find((step) => step.kind === "fill_blank" && step.blankAnswer === "护照" && step.audioText);
  fill.prompt = `complete 护照 now`;
}, "TARGET_LEAK");

killed("12 audio fill shows target hanzi", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-survival-mandarin");
  const fill = lesson.steps.find((step) => step.kind === "fill_blank" && step.audioText === "护照");
  fill.title = `听 护照`;
}, "LISTENING");

console.log("PASS test:hanzi-fill-integration");
