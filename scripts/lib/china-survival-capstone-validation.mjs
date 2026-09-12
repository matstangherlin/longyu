import { mainPath } from "./conversation-coherence-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const CAPSTONE_ID = "p7-china-survival";
const CAPSTONE_SCENE_IDS = [
  "conversa-cotidiana",
  "imersao-restaurante",
  "conversa-na-loja",
  "imersao-estacao",
  "pegar-taxi",
  "checkin-hotel",
  "no-aeroporto",
  "nao-me-sinto-bem",
  "na-clinica",
];
const GLOBAL_ARCS = [
  "FIRST_CONTACT",
  "IDENTITY",
  "ROUTINE_TIME",
  "RESTAURANT",
  "SHOPPING",
  "MOBILITY",
  "HOTEL",
  "AIRPORT",
  "HEALTH",
  "EVERYDAY",
];
const GLOBAL_COVERAGE = {
  A: ["FIRST_CONTACT", "EVERYDAY", "RESTAURANT", "MOBILITY", "HOTEL"],
  B: ["FIRST_CONTACT", "EVERYDAY", "SHOPPING", "MOBILITY", "AIRPORT"],
  C: ["EVERYDAY", "ROUTINE_TIME", "IDENTITY", "HEALTH"],
};

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function independent(step, fail, location) {
  const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
  const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
  if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
}

function sceneIdsOf(steps = []) {
  return steps.filter((step) => step.kind === "conversation_scene").map((step) => step.sceneId);
}

export function validateChinaSurvivalCapstone(data) {
  const { lessons, scenes, capstoneVariants, lessonPlayerSource = "", conversationPlayerSource = "" } = data;
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });

  const lesson = (lessons ?? []).find((item) => item.id === CAPSTONE_ID);
  if (!lesson) fail("SCENE", "p7-china-survival missing");
  if (lesson && (lesson.isReview !== true || lesson.curriculumRole !== "immersion")) {
    fail("NOVELTY", "capstone must be isReview + immersion");
  }
  if (lesson && (lesson.newRefs ?? []).length) fail("NO_NEW_VOCAB", "capstone lesson newRefs must be empty");

  const variants = capstoneVariants ?? {};
  const names = ["A", "B", "C"];
  for (const name of names) {
    if (!Array.isArray(variants[name]) || variants[name].length === 0) fail("ROTATION", `variant ${name} missing`);
  }
  if (variants.A && variants.B && variants.C) {
    const seq = (steps) => sceneIdsOf(steps).join(">");
    if (seq(variants.A) === seq(variants.B) && seq(variants.B) === seq(variants.C)) {
      fail("ROTATION", "all variants use the same scene sequence");
    }
    const coverage = {
      first_contact: /conversa-cotidiana/,
      restaurant: /imersao-restaurante|pedir-cardapio/,
      shopping: /conversa-na-loja|imersao-mercado/,
      mobility: /imersao-estacao|pegar-taxi/,
      hotel_airport: /checkin-hotel|no-aeroporto/,
      health: /nao-me-sinto-bem|na-clinica/,
    };
    const union = names.flatMap((name) => sceneIdsOf(variants[name])).join(" ");
    for (const [capability, pattern] of Object.entries(coverage)) {
      if (!pattern.test(union)) fail("CAPABILITY", `${capability} missing across variants`);
    }
    for (const name of names) {
      const steps = variants[name] ?? [];
      if (!steps.some((step) => step.kind === "conversation_scene")) fail("CAPABILITY", `${name} missing conversation`);
      if (!steps.some((step) => step.kind === "free_production" && step.productionOpen)) {
        fail("CAPABILITY", `${name} missing speaking production`);
      }
      if (steps.every((step) => step.kind === "dialogue_choice" || step.kind === "listen_select")) {
        fail("CAPABILITY", `${name} is quiz-only`);
      }
      const productions = steps.filter((step) => step.kind === "free_production");
      for (const step of productions) independent(step, fail, `${CAPSTONE_ID}/${name}/${step.title ?? step.kind}`);
      if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", `${name} missing open production`);
    }
    if (data.capstoneHighMastery) {
      const warm = (variants.A ?? []).filter((step) => step.kind === "fill_blank").length;
      const highWarm = data.capstoneHighMastery.filter((step) => step.kind === "fill_blank").length;
      if (warm > 0 && highWarm >= warm) fail("WARMUP", "high mastery must skip or shrink the warm-up");
    }
  }

  const hosted = new Set(CAPSTONE_SCENE_IDS);
  for (const sceneId of hosted) {
    const scene = (scenes ?? []).find((item) => item.sceneId === sceneId);
    if (!scene) {
      fail("SCENE", `${sceneId} missing`);
      continue;
    }
    if ((scene.newRefs ?? []).length) fail("NO_NEW_VOCAB", `${sceneId} introduces newRefs in the capstone`);
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    if (path.some((node) => node.interaction?.type === "listen_reply")) {
      // listening present in at least one hosted scene
    }
    const repeat = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
    if (repeat && (repeat.interaction.nextByAnswer ?? {})["请再说一遍"] === (repeat.interaction.nextByAnswer ?? {})["请慢一点"]) {
      fail("REPAIR_BRANCH", `${sceneId}: slow and repeat share a branch`);
    }
  }

  const unionSteps = names.flatMap((name) => variants[name] ?? []);
  if (!unionSteps.some((step) => step.kind === "listen_select" || step.kind === "listen" || step.kind === "conversation_scene")) {
    fail("CAPABILITY", "capstone missing listening surface");
  }
  const listenScenes = (scenes ?? []).filter((scene) => hosted.has(scene.sceneId));
  if (!listenScenes.some((scene) => (scene.nodes ?? []).some((node) => node.interaction?.type === "listen_reply"))) {
    if (!unionSteps.some((step) => step.kind === "listen_select" || step.kind === "listen")) {
      fail("CAPABILITY", "capstone missing listening");
    }
  }
  if (!listenScenes.some((scene) => (scene.nodes ?? []).some((node) => node.interaction?.type === "produce_reply"))) {
    fail("CAPABILITY", "capstone missing speaking in conversation");
  }
  if (!listenScenes.some((scene) => (scene.nodes ?? []).some((node) => node.interaction?.decision))) {
    fail("CAPABILITY", "capstone missing decisions");
  }
  if (!listenScenes.some((scene) => (scene.nodes ?? []).some((node) => (node.interaction?.validAnswers ?? []).includes("请再说一遍")))) {
    fail("CAPABILITY", "capstone missing repair");
  }

  for (const arc of GLOBAL_ARCS) {
    const covered = Object.values(GLOBAL_COVERAGE).some((list) => list.includes(arc));
    if (!covered) fail("CAPABILITY", `global arc ${arc} never covered`);
  }

  if (lessonPlayerSource) {
    if (/CapstoneVictory|ChinaSurvivalVictory/.test(lessonPlayerSource)) {
      fail("COMPLETION", "capstone must keep the standard LessonVictory");
    }
    if (!/lessonSessionStepById/.test(lessonPlayerSource)) {
      fail("CHECKPOINT", "capstone resume needs the standard lesson cursor");
    }
    if (!/claimReward/.test(lessonPlayerSource)) {
      fail("REPLAY_XP", "capstone XP must use claimReward");
    }
  }
  if (conversationPlayerSource && /CultureMission card|culture card/.test(conversationPlayerSource)) {
    fail("CULTURE", "conversation player must not revive a post-lesson culture card");
  }

  return { failures };
}
