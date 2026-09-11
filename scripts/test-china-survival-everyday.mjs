import assert from "node:assert/strict";
import { loadEverydayRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalEveryday } from "./lib/china-survival-everyday-validation.mjs";

const base = loadEverydayRuntime();
assert.deepEqual(validateChinaSurvivalEveryday(base).failures, [], "positive control must pass before mutation tests");

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
  const failures = validateChinaSurvivalEveryday(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("5 remove 你呢", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-conversa-cotidiana");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "sentence_build" || (step.kind === "free_production" && /你呢/.test(clean(step.answer ?? step.correctAnswer ?? "")))));
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  for (const node of scene.nodes) {
    if (node.hanzi) node.hanzi = String(node.hanzi).replaceAll("你呢", "你好");
    if (node.interaction?.correctAnswer) node.interaction.correctAnswer = String(node.interaction.correctAnswer).replaceAll("你呢", "你好");
    if (node.interaction?.validAnswers) {
      node.interaction.validAnswers = node.interaction.validAnswers.map((item) => String(item).replaceAll("你呢", "你好"));
    }
    if (node.interaction?.accepts) {
      node.interaction.accepts = node.interaction.accepts.map((item) => String(item).replaceAll("你呢", "你好"));
    }
  }
}, "RECIPROCAL");

mutation("6 remove speaking", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-conversa-cotidiana");
  for (const step of lesson.steps) {
    if (step.kind === "free_production") step.productionOpen = false;
  }
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  scene.nodes = scene.nodes.filter((node) => node.interaction?.type !== "produce_reply");
}, "CAPABILITY");

mutation("3 disconnected question list", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  scene.nodes = [
    { id: "q1", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", interaction: { type: "choose_reply", prompt: "Responda.", options: ["我很好", "再见"], correctAnswer: "我很好", correctNextNodeId: "q2", wrongNextNodeId: "q1" } },
    { id: "q2", speakerId: "mei", hanzi: "你是哪国人？", pinyin: "nǐ shì nǎ guó rén?", interaction: { type: "choose_reply", prompt: "Responda.", options: ["我是巴西人", "再见"], correctAnswer: "我是巴西人", correctNextNodeId: "q3", wrongNextNodeId: "q2" } },
    { id: "q3", speakerId: "mei", hanzi: "现在几点？", pinyin: "xiànzài jǐ diǎn?", interaction: { type: "choose_reply", prompt: "Responda.", options: ["八点", "再见"], correctAnswer: "八点", correctNextNodeId: "q4", wrongNextNodeId: "q3" } },
    { id: "q4", speakerId: "mei", hanzi: "今天很冷吗？", pinyin: "jīntiān hěn lěng ma?", interaction: { type: "choose_reply", prompt: "Responda.", options: ["今天很冷", "再见"], correctAnswer: "今天很冷", correctNextNodeId: "q4" } },
  ];
  scene.entryNodeId = "q1";
}, "NATURALNESS");

mutation("4 NPC ignores unwell", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  const unwell = scene.nodes.find((node) => (node.interaction?.validAnswers ?? []).some((item) => /我不舒服/.test(item)));
  if (unwell) {
    unwell.interaction.nextByAnswer = { ...(unwell.interaction.nextByAnswer ?? {}), 我不舒服: "cot-fine", "我不舒服。": "cot-fine" };
  }
}, "COHERENCE");

mutation("9 repair branches collapse", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  const repeat = scene.nodes.find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
  repeat.interaction.nextByAnswer = { 请再说一遍: "cot-repeat", 请慢一点: "cot-repeat" };
}, "REPAIR_BRANCH");

mutation("8 remove listening", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-conversa-cotidiana");
  lesson.steps = lesson.steps.filter((step) => step.kind !== "listen_select" && step.kind !== "listen");
  const scene = data.scenes.find((item) => item.sceneId === "conversa-cotidiana");
  for (const node of scene.nodes) {
    if (node.interaction?.type === "listen_reply") delete node.interaction;
  }
}, "CAPABILITY");

console.log("PASS test:china-survival-everyday");
