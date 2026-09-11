import assert from "node:assert/strict";
import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalCapstone } from "./lib/china-survival-capstone-validation.mjs";

const base = loadCapstoneRuntime();
assert.deepEqual(validateChinaSurvivalCapstone(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return {
    ...structuredClone({
      ...base,
      hasEnglishOverlay: undefined,
      isCanonicalZhOrPinyin: undefined,
      capstoneVariantFor: undefined,
    }),
    hasEnglishOverlay: base.hasEnglishOverlay,
    isCanonicalZhOrPinyin: base.isCanonicalZhOrPinyin,
    conversationPlayerSource: base.conversationPlayerSource,
    lessonPlayerSource: base.lessonPlayerSource,
    capstoneVariantFor: base.capstoneVariantFor,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateChinaSurvivalCapstone(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("13 all variants same sequence", (data) => {
  data.capstoneVariants.B = data.capstoneVariants.A;
  data.capstoneVariants.C = data.capstoneVariants.A;
}, "ROTATION");

mutation("7 quiz only", (data) => {
  for (const name of ["A", "B", "C"]) {
    data.capstoneVariants[name] = data.capstoneVariants[name].filter((step) => step.kind !== "free_production" && step.kind !== "conversation_scene");
    data.capstoneVariants[name].push({ kind: "listen_select", title: "Quiz", audioText: "你好", options: ["olá", "tchau"], correctAnswer: "olá" });
  }
}, "CAPABILITY");

mutation("16 custom victory", (data) => {
  data.lessonPlayerSource = `${data.lessonPlayerSource}\nfunction CapstoneVictory() { return null; }`;
}, "COMPLETION");

mutation("6 remove speaking", (data) => {
  for (const name of ["A", "B", "C"]) {
    for (const step of data.capstoneVariants[name]) {
      if (step.kind === "free_production") step.productionOpen = false;
    }
  }
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (node.interaction?.type === "produce_reply") node.interaction.type = "choose_reply";
    }
  }
}, "CAPABILITY");

console.log("PASS test:china-survival-capstone");
