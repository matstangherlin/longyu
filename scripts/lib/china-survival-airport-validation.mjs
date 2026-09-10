import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const AIRPORT_SCENE_IDS = ["no-aeroporto"];
const AIRPORT_LESSON_IDS = ["p6-china-cidades-2", "p7-imersao-aeroporto"];

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function blobOf(step) {
  return [step.title, step.body, step.prompt, step.promptPt, step.dialoguePrompt, step.explanation, step.situationPt, step.text, step.audioText]
    .filter(Boolean)
    .join("\n");
}

export function validateChinaSurvivalAirport(data) {
  const { lessons, scenes } = data;
  const failures = [];
  const evidence = [];
  const fail = (code, message) => failures.push({ code, message });

  function independent(step, lessonId, location) {
    const answer = step.kind === "write" || step.kind === "free_production" ? (step.answer ?? step.correctAnswer) : step.correctAnswer;
    const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
    const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
    if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
    evidence.push({ lesson: lessonId, location, answer: clean(answer), kind: step.kind ?? "produce_reply" });
  }

  for (const sceneId of AIRPORT_SCENE_IDS) {
    if (!(scenes ?? []).some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const airportLessons = (lessons ?? []).filter((lesson) => AIRPORT_LESSON_IDS.includes(lesson.id));
  if (airportLessons.length !== AIRPORT_LESSON_IDS.length) {
    fail("SCENE", `missing airport lessons: ${AIRPORT_LESSON_IDS.filter((id) => !airportLessons.some((lesson) => lesson.id === id)).join(",")}`);
  }

  const street = airportLessons.find((lesson) => lesson.id === "p6-china-cidades-2");
  const mission = airportLessons.find((lesson) => lesson.id === "p7-imersao-aeroporto");
  if (street && (street.steps ?? []).some((step) => step.sceneId === "no-aeroporto")) {
    fail("NATURALNESS", "p6-china-cidades-2 must not host the inside-airport scene");
  }
  if (street && !(street.steps ?? []).some((step) => /机场在哪里/.test(`${step.text ?? ""}${step.correctAnswer ?? ""}`))) {
    fail("CAPABILITY", "street find-airport (机场在哪里) missing from mobility/city lesson");
  }

  if (!mission) fail("SCENE", "p7-imersao-aeroporto missing");
  else {
    if (!(mission.steps ?? []).some((step) => step.sceneId === "no-aeroporto")) fail("SCENE", "mission without no-aeroporto");
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && /十八|登机口/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "airport listening missing from mission");
    }
    if (!(mission.steps ?? []).some((step) => /登机口/.test(`${step.signHanzi ?? ""}${step.correctAnswer ?? ""}`))) {
      fail("CAPABILITY", "gate sign missing");
    }
    const productions = (mission.steps ?? []).filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /这是我的护照/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "passport production missing from airport mission");
    }
    if (!productions.some((step) => /登机口在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "gate question production missing from airport mission");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: airport productions must allow speech");
    for (const step of productions) independent(step, mission.id, `${mission.id}/${step.title ?? step.kind}`);
    if ((mission.steps ?? []).some((step) => /机场在哪里/.test(blobOf(step)) && step.kind === "conversation_scene")) {
      fail("NATURALNESS", "airport mission conversation must not start by asking where the airport is");
    }
  }

  for (const lesson of airportLessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      const stimulus = AUDIO_KINDS.has(step.kind) ? (step.audioText ?? step.audioSequence?.[0]) : "";
      if (AUDIO_KINDS.has(step.kind)) {
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
      }
      if (/Matheus/.test(blobOf(step))) fail("MATHEUS", `${lesson.id}/${index + 1}`);
    }
  }

  const airportScenes = (scenes ?? []).filter((scene) => AIRPORT_SCENE_IDS.includes(scene.sceneId));
  for (const scene of airportScenes) {
    if (scene.setting !== "airport") fail("SCENE", `${scene.sceneId}: setting must be airport`);
    if (scene.setting === "street") fail("NATURALNESS", "inside-airport scene must not use street");
    const roles = (scene.characters ?? []).map((character) => character.role);
    if (!roles.includes("Funcionário") || !roles.includes("Viajante")) {
      fail("SCENE", `${scene.sceneId}: staff and traveller roles must be explicit`);
    }
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const first = path[0];
    if (first && /机场在哪里/.test(cleanHanzi(first.hanzi))) {
      fail("NATURALNESS", "airport scene starts by asking where the airport is");
    }
    const repairs = [];
    let hasGateAsk = false;
    let hasListen = false;
    let staffAsksGate = false;
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") independent(node.interaction, scene.sceneId, `${scene.sceneId}/${node.id}`);
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (/登机口在哪里/.test(answer)) hasGateAsk = true;
      if (node.interaction?.type === "listen_reply" || /十八/.test(String(node.interaction?.listenAudioText ?? node.hanzi ?? ""))) {
        hasListen = true;
      }
      if (node.speakerId === "wang" && /登机口在哪里/.test(cleanHanzi(node.hanzi)) && node.interaction) {
        staffAsksGate = true;
      }
      if (node.interaction) {
        const wrong = node.interaction.wrongNextNodeId;
        const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
        if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
      }
      if (/Matheus/.test(node.interaction?.prompt ?? "")) fail("MATHEUS", `${scene.sceneId}/${node.id}`);
    }
    if (staffAsksGate) fail("NATURALNESS", "airport staff asks the learner where the gate is");
    if (!hasGateAsk) fail("CAPABILITY", "gate question missing from airport scene");
    if (!hasListen) fail("CAPABILITY", "airport listening missing from scene");
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: every repair is 请再说一遍`);
    }
    const repeat = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
    if (!repeat) fail("CAPABILITY", "repair decision missing from airport");
    else if ((repeat.interaction.nextByAnswer ?? {})["请再说一遍"] === (repeat.interaction.nextByAnswer ?? {})["请慢一点"]) {
      fail("CAPABILITY", "repeat and slower-chunk must change the conversation");
    }
  }

  return { failures, evidence };
}
