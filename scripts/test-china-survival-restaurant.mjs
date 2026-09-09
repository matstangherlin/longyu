import assert from "node:assert/strict";
import { loadRestaurantRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalRestaurant } from "./lib/china-survival-restaurant-validation.mjs";

const base = loadRestaurantRuntime();
assert.deepEqual(validateChinaSurvivalRestaurant(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return {
    ...structuredClone({ ...base, isCanonicalZhOrPinyin: undefined, hasEnglishOverlay: undefined }),
    isCanonicalZhOrPinyin: base.isCanonicalZhOrPinyin,
    hasEnglishOverlay: base.hasEnglishOverlay,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateChinaSurvivalRestaurant(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("1 order / party-size taught late", (data) => {
  const lesson = data.lessons.find((item) => item.id === "l26b");
  lesson.steps = lesson.steps.filter(
    (step) =>
      !(step.kind === "listen" && /几位|一位|两位/.test(String(step.text ?? ""))) &&
      !(step.kind === "flashcard" && ["qingwenjiwei", "yiwei", "liangwei"].includes(step.chunkId))
  );
}, "TEACH_BEFORE_TEST");

mutation("2 independent order production removed", (data) => {
  const mission = data.lessons.find((item) => item.id === "l26c");
  mission.steps = mission.steps.filter((step) => !(step.kind === "free_production" && /我要(?:米饭|饭)/.test(clean(step.answer ?? step.correctAnswer))));
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (node.interaction?.type === "produce_reply" && /我要(?:米饭|饭)/.test(clean(node.interaction.correctAnswer))) {
        node.interaction.correctAnswer = "好";
        node.interaction.accepts = ["好"];
      }
    }
  }
}, "CAPABILITY");

mutation("3 order production becomes multiple choice", (data) => {
  const mission = data.lessons.find((item) => item.id === "l26c");
  for (const step of mission.steps) {
    if (step.kind === "free_production" && /我要(?:米饭|饭)/.test(clean(step.answer ?? step.correctAnswer))) {
      step.kind = "dialogue_choice";
      step.options = [step.answer, "我很好"];
      step.correctAnswer = step.answer;
    }
  }
}, "INDEPENDENT");

mutation("4 waiter listen_select loses audioText", (data) => {
  const mission = data.lessons.find((item) => item.id === "l26c");
  for (const step of mission.steps) {
    if (step.kind === "listen_select" && step.audioText === "请问几位？") delete step.audioText;
  }
}, "NO_AUDIO");

mutation("5 listening target leaks into the title", (data) => {
  const mission = data.lessons.find((item) => item.id === "l26c");
  for (const step of mission.steps) {
    if (step.kind === "listen_select" && step.audioText === "请问几位？") step.title = step.audioText;
  }
}, "TARGET_LEAK");

mutation("6 NPC ignores the previous rice order", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "imersao-restaurante");
  for (const node of scene.nodes ?? []) {
    if (String(node.hanzi ?? "").includes("米饭，好")) node.hanzi = "你好吗？";
  }
}, "BROKEN_CONTINUITY");

mutation("7 every restaurant repair becomes generic", (data) => {
  for (const scene of data.scenes.filter((item) => ["pedir-cardapio", "imersao-restaurante"].includes(item.sceneId))) {
    for (const node of scene.nodes ?? []) {
      if (String(node.id ?? "").includes("retry")) node.hanzi = "请再说一遍。";
      const wrong = node.interaction?.wrongNextNodeId;
      if (!wrong) continue;
      const repair = scene.nodes.find((item) => item.id === wrong);
      if (repair) repair.hanzi = "请再说一遍。";
    }
  }
}, "GENERIC_REPAIR");

mutation("8 bill removed from the mission", (data) => {
  const mission = data.lessons.find((item) => item.id === "l26c");
  mission.steps = mission.steps.filter((step) => !(step.kind === "free_production" && /买单/.test(clean(step.answer ?? step.correctAnswer))));
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (node.interaction && /买单/.test(clean(node.interaction.correctAnswer))) {
        node.interaction.correctAnswer = "谢谢";
        node.interaction.accepts = ["谢谢"];
      }
    }
  }
}, "CAPABILITY");

mutation("9 CultureItem points at a missing lesson", (data) => {
  const item = data.cultureItems.find((row) => row.id === "chopsticks-rest");
  item.relatedLessonIds = ["lesson-that-does-not-exist"];
}, "CULTURE");

mutation("10 CORE 菜 loses delayed recall", (data) => {
  for (const id of ["l26c", "l27"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = (lesson.steps ?? []).filter((step) => step.charId !== "cai_dish");
    lesson.reviewItems = (lesson.reviewItems ?? []).filter((ref) => ref !== "char:cai_dish" && ref !== "chunk:caidan");
    lesson.libraryItems = (lesson.libraryItems ?? []).filter((ref) => ref !== "char:cai_dish" && ref !== "chunk:caidan");
  }
  const cai = data.hanziMemoryTargets.find((item) => item.glyph === "菜");
  cai.delayedLessonIds = ["l26c", "l27"];
}, "DELAYED_RECALL");

console.log("PASS 10/10 china-survival-restaurant mutations, with positive control.");
