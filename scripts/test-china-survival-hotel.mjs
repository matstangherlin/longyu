import assert from "node:assert/strict";
import { loadHotelRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalHotel } from "./lib/china-survival-hotel-validation.mjs";

const base = loadHotelRuntime();
assert.deepEqual(validateChinaSurvivalHotel(base).failures, [], "positive control must pass before mutation tests");

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
    lessonStepsSource: base.lessonStepsSource,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateChinaSurvivalHotel(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("1 two answers called valid but one is the wrong branch", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  const node = scene.nodes.find((item) => item.interaction?.type === "produce_reply");
  node.interaction.prompt = "Você tem reserva. O que diz? (também vale entregar o passaporte.)";
  node.interaction.options = ["我有预订", "这是我的护照"];
  node.interaction.correctAnswer = "我有预订";
  node.interaction.decision = false;
}, "ANSWER_CONTRACT");

mutation("2 hotel tests 我有预订 before teaching it", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-survival-mandarin");
  lesson.steps = lesson.steps.filter(
    (step) =>
      !((step.kind === "listen" && /我有预订/.test(String(step.text ?? ""))) || (step.kind === "flashcard" && step.chunkId === "woyouyuding"))
  );
}, "TEACH_BEFORE_TEST");

mutation("3 independent reservation production removed", (data) => {
  for (const id of ["p6-survival-mandarin", "p7-imersao-hotel"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /我有预订/.test(clean(step.answer ?? step.correctAnswer))));
  }
}, "CAPABILITY");

mutation("4 room number listening removed", (data) => {
  for (const id of ["p6-survival-mandarin", "p7-imersao-hotel"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "listen_select" && /三零五/.test(String(step.audioText ?? ""))));
  }
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  scene.nodes = scene.nodes.filter((node) => node.interaction?.type !== "listen_reply");
}, "CAPABILITY");

mutation("5 target number appears before audio", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-hotel");
  for (const step of lesson.steps) {
    if (step.kind === "listen_select" && /三零五/.test(String(step.audioText ?? ""))) step.title = "305";
  }
}, "TARGET_LEAK");

mutation("6 check-in without document", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  for (const node of scene.nodes) {
    if (node.interaction && /护照/.test(node.interaction.correctAnswer ?? "")) {
      node.interaction.correctAnswer = "谢谢";
      node.hanzi = "好。";
    }
    if (/护照/.test(node.hanzi ?? "")) node.hanzi = "好。";
  }
}, "CAPABILITY");

console.log("PASS test:china-survival-hotel");
