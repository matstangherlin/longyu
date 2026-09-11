import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const EVERYDAY_SCENE_ID = "conversa-cotidiana";
const EVERYDAY_LESSON_ID = "p7-conversa-cotidiana";

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function independent(step, fail, location) {
  const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
  const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
  if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
}

function classifyEverydayNode(node) {
  const npc = node.hanzi ?? "";
  const prompt = node.interaction?.prompt ?? "";
  const answer = node.interaction?.correctAnswer ?? "";
  if (/Matheus/.test(prompt)) return "ANSWER_CONTRACT_BUG";
  if (/很好/.test(cleanHanzi(npc)) && /我不舒服/.test(clean(answer))) return "RESPONSE_NOT_CONNECTED";
  if (node.interaction?.type === "choose_reply" && (node.interaction.options ?? []).length >= 4 && !node.interaction.decision) {
    return "OVER_SCRIPTED";
  }
  return "OK";
}

export function validateChinaSurvivalEveryday(data) {
  const { lessons, scenes } = data;
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });

  const lesson = (lessons ?? []).find((item) => item.id === EVERYDAY_LESSON_ID);
  const scene = (scenes ?? []).find((item) => item.sceneId === EVERYDAY_SCENE_ID);
  if (!lesson) fail("SCENE", "p7-conversa-cotidiana missing");
  if (!scene) fail("SCENE", "conversa-cotidiana missing");
  if (lesson && (lesson.isReview !== true || lesson.curriculumRole !== "immersion")) {
    fail("NOVELTY", "p7-conversa-cotidiana must be isReview + immersion");
  }
  if (lesson && !lesson.premium) fail("NOVELTY", "everyday lesson must stay premium review");

  if (lesson) {
    const steps = lesson.steps ?? [];
    if (steps.some((step) => step.kind === "flashcard")) fail("NOVELTY", "everyday must not teach new flashcards");
    if ((lesson.newRefs ?? []).length) fail("NOVELTY", "everyday lesson has newRefs");
    if (!(steps ?? []).some((step) => step.sceneId === EVERYDAY_SCENE_ID)) fail("SCENE", "lesson without conversa-cotidiana");
    if (!steps.some((step) => step.kind === "listen_select" && /明天见/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "everyday missing functional listening for 明天见");
    }
    if (!steps.some((step) => step.kind === "listen_select" && /O que ficou combinado/.test(String(step.title ?? "")))) {
      fail("CAPABILITY", "everyday listening must ask for the plan, not show the target");
    }
    if (!steps.some((step) => step.kind === "fill_blank" && /是/.test(String(step.blankAnswer ?? "")))) {
      fail("CAPABILITY", "identity Hanzi recall missing");
    }
    if (!steps.some((step) => step.kind === "fill_blank" && /天/.test(String(step.blankAnswer ?? "")))) {
      fail("CAPABILITY", "明天见 Hanzi recall missing");
    }
    if (!steps.some((step) => step.kind === "sentence_build" && (step.targetParts ?? []).join("").includes("你呢"))) {
      fail("RECIPROCAL", "你呢 must be built as a reciprocal question");
    }
    const productions = steps.filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /你呢/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("RECIPROCAL", "everyday production missing 你呢");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: everyday production must allow speech");
    for (const step of productions) independent(step, fail, `${lesson.id}/${step.title ?? step.kind}`);
    if (steps.every((step) => step.kind === "dialogue_choice" || step.kind === "listen_select")) {
      fail("CAPABILITY", "everyday conversation became a quiz");
    }
    for (const [index, step] of steps.entries()) {
      const stimulus = AUDIO_KINDS.has(step.kind) ? (step.audioText ?? step.audioSequence?.[0]) : "";
      if (AUDIO_KINDS.has(step.kind)) {
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
      }
    }
  }

  if (scene) {
    if (scene.setting !== "street") fail("CONTEXT_JUMP", "everyday scene must stay on the street");
    if (scene.newRefs?.length) fail("NOVELTY", "everyday scene has newRefs");
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const blob = (scene.nodes ?? []).map((node) => `${node.hanzi}${node.interaction?.correctAnswer ?? ""}${node.interaction?.validAnswers?.join("") ?? ""}`).join("\n");
    const prompts = path.filter((node) => node.interaction).map((node) => node.hanzi);
    if (prompts.length >= 4 && prompts.every((hanzi) => /[？?]/.test(hanzi ?? ""))) {
      fail("NATURALNESS", "everyday conversation is a disconnected question list");
    }
    if (!/你呢/.test(blob)) fail("RECIPROCAL", "scene missing 你呢");
    let hasGreeting = false;
    let hasWellbeing = false;
    let hasWeather = false;
    let hasPlan = false;
    let hasClosing = false;
    let hasSpeaking = false;
    let hasListening = false;
    let hasProduce = false;
    const repairs = [];
    for (const node of path) {
      const label = classifyEverydayNode(node);
      if (label !== "OK") fail(label, `${scene.sceneId}/${node.id}`);
      if (node.interaction?.type === "produce_reply") {
        independent(node.interaction, fail, `${scene.sceneId}/${node.id}`);
        hasSpeaking = true;
        hasProduce = true;
      }
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (/你好/.test(answer) || /你好/.test(cleanHanzi(node.hanzi ?? ""))) hasGreeting = true;
      if (/我很好|我不舒服/.test(answer) || /你好吗|怎么样/.test(cleanHanzi(node.hanzi ?? ""))) hasWellbeing = true;
      if (/今天很冷|今天很热|está frio/.test(`${answer}${node.interaction?.correctAnswer ?? ""}`)) hasWeather = true;
      if (/明天见|我要工作/.test(answer)) hasPlan = true;
      if (/再见|明天见/.test(answer) && node.interaction?.expectedResponseAct === "farewell") hasClosing = true;
      if (node.interaction?.type === "listen_reply") hasListening = true;
      if (node.interaction?.wrongNextNodeId) {
        const repair = (scene.nodes ?? []).find((item) => item.id === node.interaction.wrongNextNodeId);
        if (repair?.hanzi) repairs.push(cleanHanzi(repair.hanzi));
      }
    }
    if (!hasGreeting) fail("CAPABILITY", "greeting missing");
    if (!hasWellbeing) fail("CAPABILITY", "wellbeing missing");
    if (!hasWeather) fail("CAPABILITY", "weather_or_day missing");
    if (!hasPlan) fail("CAPABILITY", "plan missing");
    if (!hasClosing) fail("CAPABILITY", "closing missing");
    if (!hasSpeaking) fail("CAPABILITY", "speaking missing");
    if (!hasProduce) fail("CAPABILITY", "open production missing");
    if (!hasListening) fail("CAPABILITY", "everyday listening missing");
    const unique = [...new Set(repairs.filter(Boolean))];
    if (unique.length && unique.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", "everyday repairs are all 请再说一遍");
    }
    const repeat = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
    if (!repeat) fail("CAPABILITY", "everyday missing repair strategies");
    else if ((repeat.interaction.nextByAnswer ?? {})["请再说一遍"] === (repeat.interaction.nextByAnswer ?? {})["请慢一点"]) {
      fail("REPAIR_BRANCH", "slow and repeat must branch differently");
    }
    const unwell = (scene.nodes ?? []).find((node) => (node.interaction?.validAnswers ?? []).some((item) => /我不舒服/.test(item)));
    if (unwell) {
      const nextId = unwell.interaction.nextByAnswer?.["我不舒服"] ?? unwell.interaction.nextByAnswer?.["我不舒服。"];
      const next = (scene.nodes ?? []).find((node) => node.id === nextId);
      const reactId = next?.nextNodeId;
      const react = (scene.nodes ?? []).find((node) => node.id === reactId) ?? next;
      if (/很好/.test(cleanHanzi(react?.hanzi ?? "")) && !/不舒服/.test(cleanHanzi(react?.hanzi ?? ""))) {
        fail("COHERENCE", "NPC ignores 我不舒服");
      }
    }
    const chooseOnly = path.filter((node) => node.interaction).every((node) => node.interaction.type === "choose_reply");
    if (chooseOnly) fail("OVER_SCRIPTED", "everyday is only multiple choice");
  }

  return { failures };
}
