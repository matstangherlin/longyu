import assert from "node:assert/strict";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateHanziMemoryIntegration } from "./lib/hanzi-memory-validation.mjs";

const base = loadIntegratedLearningRuntime();
assert.deepEqual(validateHanziMemoryIntegration(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateHanziMemoryIntegration(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived (expected ${code}); ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

mutation("3 delayed CORE recall removed", (data) => {
  const clima = data.lessons.find((lesson) => lesson.id === "p6-clima");
  clima.steps = clima.steps.filter((step) => {
    const blob = [step.text, step.hanzi, step.audioText, step.correctAnswer, ...(step.options ?? [])].join("");
    if (blob.includes("明")) return false;
    if (step.charId === "ming") return false;
    return true;
  });
  clima.reviewItems = (clima.reviewItems ?? []).filter((ref) => !String(ref).includes("ming") && !String(ref).includes("明"));
  clima.libraryItems = (clima.libraryItems ?? []).filter((ref) => !String(ref).includes("ming"));
}, "DELAYED_RECALL");

mutation("4 CORE production before exposure", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-horarios");
  lesson.steps.unshift({ kind: "write", answer: "明天", title: "antes de ouvir" });
}, "TEACH_BEFORE_TEST");

mutation("7 all CORE hanzi drills stacked with no later retrieval", (data) => {
  const introIds = new Set(data.hanziMemoryTargets.map((item) => item.introduceLessonId));
  for (const target of data.hanziMemoryTargets) {
    for (const id of target.delayedLessonIds) {
      if (introIds.has(id)) continue;
      const lesson = data.lessons.find((item) => item.id === id);
      if (!lesson) continue;
      lesson.steps = (lesson.steps ?? []).filter((step) => {
        const blob = [step.text, step.hanzi, step.audioText, step.correctAnswer, step.charId, ...(step.options ?? [])].join("");
        return !blob.includes(target.glyph) && step.charId !== target.charId;
      });
      lesson.reviewItems = (lesson.reviewItems ?? []).filter((ref) => {
        if (ref === `char:${target.charId}`) return false;
        const chunk = data.chunks.find((item) => `chunk:${item.id}` === ref);
        return !String(chunk?.hanzi ?? "").includes(target.glyph);
      });
    }
  }
}, "DELAYED_RECALL");

console.log("PASS hanzi-memory mutations 3, 4, 7");
