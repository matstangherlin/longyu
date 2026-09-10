import assert from "node:assert/strict";
import { loadAirportRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalAirport } from "./lib/china-survival-airport-validation.mjs";

const base = loadAirportRuntime();
assert.deepEqual(validateChinaSurvivalAirport(base).failures, [], "positive control must pass before mutation tests");

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
  const failures = validateChinaSurvivalAirport(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("7 airport starts on the street then jumps to check-in", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "no-aeroporto");
  scene.setting = "street";
  const first = scene.nodes.find((node) => node.id === scene.entryNodeId);
  first.hanzi = "机场在哪里？";
  first.speakerId = "lin";
}, "NATURALNESS");

mutation("8 staff asks the learner where the gate is", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "no-aeroporto");
  const node = scene.nodes.find((item) => item.interaction?.type === "produce_reply" && /登机口/.test(item.interaction.correctAnswer ?? ""));
  node.speakerId = "wang";
  node.hanzi = "登机口在哪里？";
}, "NATURALNESS");

mutation("9 gate question removed", (data) => {
  for (const id of ["p7-imersao-aeroporto"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /登机口在哪里/.test(clean(step.answer ?? step.correctAnswer))));
  }
  const scene = data.scenes.find((item) => item.sceneId === "no-aeroporto");
  for (const node of scene.nodes) {
    if (node.interaction && /登机口在哪里/.test(node.interaction.correctAnswer ?? "")) {
      node.interaction.correctAnswer = "谢谢";
    }
  }
}, "CAPABILITY");

mutation("10 airport listening removed", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-aeroporto");
  lesson.steps = lesson.steps.filter((step) => step.kind !== "listen_select");
  const scene = data.scenes.find((item) => item.sceneId === "no-aeroporto");
  scene.nodes = scene.nodes.filter((node) => node.interaction?.type !== "listen_reply" && !/十八/.test(node.hanzi ?? ""));
}, "CAPABILITY");

console.log("PASS test:china-survival-airport");
