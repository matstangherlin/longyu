import assert from "node:assert/strict";
import { loadShoppingRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalShopping } from "./lib/china-survival-shopping-validation.mjs";

const base = loadShoppingRuntime();
assert.deepEqual(validateChinaSurvivalShopping(base).failures, [], "positive control must pass before mutation tests");

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
  const failures = validateChinaSurvivalShopping(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("1 accept full price takes the error branch", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-na-loja");
  for (const node of scene.nodes ?? []) {
    if (!node.interaction?.decision) continue;
    node.interaction.nextByAnswer = { ...node.interaction.nextByAnswer, 好: node.interaction.wrongNextNodeId };
  }
}, "VALID_AS_ERROR");

mutation("2 bargaining presented as correct in every shop", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-mercado");
  mission.steps[0].body = "太贵了 = caro demais; no mercado, negociar faz parte.";
  const scene = data.scenes.find((item) => item.sceneId === "conversa-na-loja");
  for (const node of scene.nodes ?? []) {
    if (!node.interaction?.decision) continue;
    node.interaction.decision = false;
    node.interaction.validAnswers = ["太贵了"];
    node.interaction.correctAnswer = "太贵了";
  }
}, "ALWAYS_BARGAIN");

mutation("3 bargaining test before explanation", (data) => {
  const mission = data.missions.find((row) => row.cultureItemId === "bargaining-context");
  mission.steps = mission.steps.filter((step) => step.kind !== "culture_teach");
}, "TEACH_AFTER_TEST");

mutation("4 open price production removed", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-mercado");
  mission.steps = mission.steps.filter((step) => !(step.kind === "free_production" && /多少钱/.test(clean(step.answer ?? step.correctAnswer))));
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (node.interaction?.type === "produce_reply" && /多少钱/.test(clean(node.interaction.correctAnswer))) {
        node.interaction.correctAnswer = "好";
        node.interaction.accepts = ["好"];
      }
    }
  }
}, "CAPABILITY");

mutation("5 price listening removed", (data) => {
  for (const id of ["l27", "p7-imersao-mercado"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "listen_select" && step.audioText === "二十八"));
  }
}, "CAPABILITY");

mutation("6 audio target appears in the prompt", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-mercado");
  for (const step of mission.steps) {
    if (step.kind === "listen_select" && step.audioText === "二十八") step.title = step.audioText;
  }
}, "TARGET_LEAK");

mutation("7 payment method removed", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-mercado");
  mission.steps = mission.steps.filter(
    (step) =>
      !(step.kind === "free_production" && /现金可以吗|可以刷卡吗/.test(clean(step.answer ?? step.correctAnswer))) &&
      !(step.kind === "listen_select" && /微信|支付宝/.test(String(step.audioText ?? "")))
  );
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (node.interaction && /可以刷卡吗|现金可以吗/.test(clean(node.interaction.correctAnswer))) {
        node.interaction.correctAnswer = "谢谢";
        node.interaction.accepts = ["谢谢"];
        node.interaction.validAnswers = undefined;
        node.interaction.decision = undefined;
      }
    }
  }
}, "CAPABILITY");

mutation("8 digital-pay bridge touches lexical SRS", (data) => {
  data.lessonPlayerSource = (data.lessonPlayerSource ?? "function completeCultureBridge() {}") + "\nfunction completeCultureBridge() { ensureSrs(); }";
}, "SRS_LEAK");

mutation("9 CORE 买 loses delayed recall", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-mercado");
  lesson.steps = (lesson.steps ?? []).filter((step) => step.charId !== "mai_buy");
  lesson.reviewItems = (lesson.reviewItems ?? []).filter((ref) => ref !== "char:mai_buy");
  const mai = data.hanziMemoryTargets.find((item) => item.glyph === "买");
  mai.delayedLessonIds = ["p7-imersao-mercado"];
}, "DELAYED_RECALL");

mutation("10 买×卖 test before contrast explanation", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-compras");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "intro" && /买|卖|contorno|3º|4º/.test(`${step.title ?? ""}${step.body ?? ""}`)));
}, "EXPLAIN_BEFORE_TEST");

mutation("11 NPC does not echo the product", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "imersao-mercado");
  for (const node of scene.nodes ?? []) {
    if (String(node.hanzi ?? "").includes("这个？好")) node.hanzi = "你好吗？";
  }
}, "BROKEN_CONTINUITY");

mutation("12 all repairs become 请再说一遍", (data) => {
  for (const scene of data.scenes.filter((item) => ["conversa-na-loja", "imersao-mercado"].includes(item.sceneId))) {
    for (const node of scene.nodes ?? []) {
      if (String(node.id ?? "").includes("retry")) node.hanzi = "请再说一遍。";
      const wrong = node.interaction?.wrongNextNodeId;
      if (!wrong) continue;
      const repair = scene.nodes.find((item) => item.id === wrong);
      if (repair) repair.hanzi = "请再说一遍。";
    }
  }
}, "GENERIC_REPAIR");

mutation("13 new CultureItem without source", (data) => {
  const item = data.cultureItems.find((row) => row.id === "bargaining-context");
  item.sources = [];
}, "MISSING_SOURCE");

mutation("14 EN missing", (data) => {
  const item = data.cultureItems.find((row) => row.id === "bargaining-context");
  item.titleEn = "";
  item.summaryEn = "";
  item.bodyEn = "";
}, "MISSING_EN");

console.log("PASS 14/14 china-survival-shopping mutations, with positive control.");
