import assert from "node:assert/strict";
import { loadHealthRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalEmergency } from "./lib/china-survival-health-validation.mjs";

const base = loadHealthRuntime();
assert.deepEqual(validateChinaSurvivalEmergency(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return {
    ...structuredClone({
      ...base,
      hasEnglishOverlay: undefined,
      isCanonicalZhOrPinyin: undefined,
    }),
    hasEnglishOverlay: base.hasEnglishOverlay,
    isCanonicalZhOrPinyin: base.isCanonicalZhOrPinyin,
    conversationPlayerSource: base.conversationPlayerSource,
    lessonPlayerSource: base.lessonPlayerSource,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateChinaSurvivalEmergency(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("help request removed", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-saude");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /我需要帮助/.test(clean(step.answer ?? step.correctAnswer))));
}, "CAPABILITY");

mutation("8 slow equals repeat", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "na-clinica");
  const node = scene.nodes.find((item) => item.interaction?.validAnswers?.includes("请慢一点"));
  node.interaction.nextByAnswer = { 请再说一遍: "clinic-repeat", 请慢一点: "clinic-repeat" };
}, "REPAIR_BRANCH");

mutation("locate hospital removed", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-saude");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /医院在哪里/.test(clean(step.answer ?? step.correctAnswer))));
}, "CAPABILITY");

console.log("PASS test:china-survival-emergency");
