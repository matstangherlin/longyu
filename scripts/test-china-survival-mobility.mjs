import assert from "node:assert/strict";
import { loadMobilityRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalMobility } from "./lib/china-survival-mobility-validation.mjs";

const base = loadMobilityRuntime();
assert.deepEqual(validateChinaSurvivalMobility(base).failures, [], "positive control must pass before mutation tests");

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
  const failures = validateChinaSurvivalMobility(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

mutation("1 route asks 右转 before teaching it", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-direcoes");
  lesson.steps = lesson.steps.filter(
    (step) =>
      !((step.kind === "listen" && /右边|右转|往右走/.test(String(step.text ?? ""))) || (step.kind === "flashcard" && step.chunkId === "youzhuan"))
  );
}, "TEACH_BEFORE_TEST");

mutation("2 map removed from spatial application", (data) => {
  for (const id of ["p6-direcoes", "p7-imersao-estacao"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => step.kind !== "map_direction" && step.kind !== "route_sequence");
  }
  data.lessonStepsSource = (data.lessonStepsSource ?? "").replace(/mapWrongTurn/g, "mapOk");
}, "NO_MAP");

mutation("3 listening shows the target in the title", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-estacao");
  for (const step of mission.steps) {
    if (step.kind === "listen_select" && /一直走|十/.test(String(step.audioText ?? ""))) step.title = step.audioText;
  }
}, "TARGET_LEAK");

mutation("4 free production of the route question removed", (data) => {
  for (const id of ["p6-direcoes", "p7-imersao-estacao"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /怎么走/.test(clean(step.answer ?? step.correctAnswer))));
  }
}, "CAPABILITY");

mutation("5 speaking removed from independent productions", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-estacao");
  for (const step of mission.steps ?? []) {
    if (step.kind === "free_production") step.productionOpen = false;
  }
}, "CAPABILITY");

mutation("6 request_stop removed", (data) => {
  for (const id of ["p6-china-ruas", "p7-imersao-estacao"]) {
    const lesson = data.lessons.find((item) => item.id === id);
    lesson.steps = lesson.steps.filter((step) => !(step.kind === "free_production" && /在这里停车/.test(clean(step.answer ?? step.correctAnswer))));
  }
  const scene = data.scenes.find((item) => item.sceneId === "pegar-taxi");
  for (const node of scene.nodes ?? []) {
    if (node.interaction && /在这里停车/.test(clean(node.interaction.correctAnswer))) {
      node.interaction.correctAnswer = "谢谢";
      node.interaction.accepts = ["谢谢"];
    }
  }
}, "CAPABILITY");

mutation("7 NPC ignores the stated destination", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "pegar-taxi");
  for (const node of scene.nodes ?? []) {
    if (/酒店好|北京路好|酒店，好|北京路，好/.test(String(node.hanzi ?? ""))) node.hanzi = "多少钱？";
  }
}, "BROKEN_CONTINUITY");

mutation("8 every repair becomes 请再说一遍", (data) => {
  for (const scene of data.scenes.filter((item) => ["imersao-estacao", "pegar-taxi"].includes(item.sceneId))) {
    for (const node of scene.nodes ?? []) {
      if (String(node.id ?? "").includes("retry")) node.hanzi = "请再说一遍。";
      const wrong = node.interaction?.wrongNextNodeId;
      if (!wrong) continue;
      const repair = scene.nodes.find((item) => item.id === wrong);
      if (repair) repair.hanzi = "请再说一遍。";
    }
  }
}, "GENERIC_REPAIR");

mutation("9 CORE 左/右 lose delayed recall", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-estacao");
  lesson.steps = (lesson.steps ?? []).filter((step) => step.charId !== "zuo_left" && step.charId !== "you_right");
  lesson.reviewItems = (lesson.reviewItems ?? []).filter((ref) => ref !== "char:zuo_left" && ref !== "char:you_right");
  for (const glyph of ["左", "右"]) {
    const target = data.hanziMemoryTargets.find((item) => item.glyph === glyph);
    target.delayedLessonIds = ["p7-imersao-estacao"];
  }
}, "DELAYED_RECALL");

mutation("10 tone test before explanation", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-direcoes");
  lesson.steps = lesson.steps.filter((step) => !(step.kind === "intro" && /3º|4º|contorno|zuǒ|yòu/.test(`${step.title ?? ""}${step.body ?? ""}`)));
}, "EXPLAIN_BEFORE_TEST");

mutation("11 Culture Bridge / mission tests before teaching", (data) => {
  const mission = data.missions.find((row) => row.cultureItemId === "metro-qr");
  mission.steps = mission.steps.filter((step) => step.kind !== "culture_teach");
}, "TEACH_AFTER_TEST");

mutation("12 culture bridge touches lexical SRS", (data) => {
  data.lessonPlayerSource = (data.lessonPlayerSource ?? "function completeCultureBridge() {}") + "\nfunction completeCultureBridge() { ensureSrs(); }";
}, "SRS_LEAK");

mutation("13 valid alternate route marked as error", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "imersao-estacao");
  for (const node of scene.nodes ?? []) {
    if (!node.interaction?.decision || !node.interaction.validAnswers?.includes("请慢一点")) continue;
    node.interaction.nextByAnswer = { ...node.interaction.nextByAnswer, 请慢一点: node.interaction.wrongNextNodeId };
  }
}, "VALID_AS_ERROR");

mutation("14 airport/hotel advanced content enters the mobility arc", (data) => {
  const mission = data.lessons.find((item) => item.id === "p7-imersao-estacao");
  mission.steps.push({
    kind: "intro",
    title: "Check-in no hotel",
    body: "Na recepção você entrega o passaporte e pede a 房卡. Depois resolve o Wi-Fi e as duas noites.",
  });
}, "SCOPE");

mutation("15 EN missing", (data) => {
  const item = data.cultureItems.find((row) => row.id === "metro-qr");
  item.titleEn = "";
  item.summaryEn = "";
  item.bodyEn = "";
}, "MISSING_EN");

console.log("PASS 15/15 china-survival-mobility mutations, with positive control.");
