import assert from "node:assert/strict";
import { loadHealthRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalHealth } from "./lib/china-survival-health-validation.mjs";

const base = loadHealthRuntime();
assert.deepEqual(validateChinaSurvivalHealth(base).failures, [], "positive control must pass before mutation tests");

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
  const failures = validateChinaSurvivalHealth(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("1 fever tested before teaching", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-saude");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "listen" && /我发烧了/.test(String(step.text ?? ""))));
}, "TEACH_BEFORE_TEST");

mutation("4 我不舒服 loses speaking", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-saude");
  for (const step of lesson.steps) {
    if (step.kind === "free_production" && /我不舒服/.test(clean(step.answer ?? step.correctAnswer))) {
      step.productionOpen = false;
    }
  }
}, "CAPABILITY");

mutation("5 symptom listening removed", (data) => {
  for (const id of ["p6-saude", "p7-imersao-saude"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "listen_select" && /头疼吗/.test(String(step.audioText ?? ""))));
  }
  const scene = data.scenes.find((item) => item.sceneId === "na-clinica");
  scene.nodes = scene.nodes.filter((node) => node.interaction?.type !== "listen_reply");
}, "CAPABILITY");

mutation("6 target appears before listening", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-saude");
  for (const step of lesson.steps) {
    if (step.kind === "listen_select" && /头疼吗/.test(String(step.audioText ?? ""))) step.title = "头疼吗？";
  }
}, "TARGET_LEAK");

mutation("9 hospital retaught as acquisition", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-saude");
  lesson.steps.unshift({ kind: "listen", text: "医院在哪里？", pinyin: "yīyuàn zài nǎlǐ?", pt: "Onde fica o hospital?" });
}, "NOVELTY");

mutation("12 mission is quiz only", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-saude");
  lesson.steps = lesson.steps.filter((step) => step.kind !== "free_production");
}, "CAPABILITY");

mutation("16 lesson gives a dosage", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-saude");
  lesson.steps[0].body = "Tome dois comprimidos, 500 mg, 3 vezes ao dia.";
}, "HEALTH_POLICY");

console.log("PASS test:china-survival-health");
