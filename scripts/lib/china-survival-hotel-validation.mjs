import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";
import { validateConversationDecisions } from "./conversation-decisions-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const HOTEL_SCENE_IDS = ["checkin-hotel"];
const HOTEL_LESSON_IDS = ["p6-survival-mandarin", "p7-imersao-hotel"];
const NEW_CHUNK_ALLOW = new Set(["zhujiwan", "sanlingwu", "dengjikou"]);

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function blobOf(step) {
  return [
    step.title,
    step.body,
    step.prompt,
    step.promptPt,
    step.dialoguePrompt,
    step.explanation,
    step.situationPt,
    step.productionHintPt,
    step.text,
    step.audioText,
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateChinaSurvivalHotel(data) {
  const { lessons, scenes, chunks } = data;
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

  for (const sceneId of HOTEL_SCENE_IDS) {
    if (!(scenes ?? []).some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const hotelLessons = (lessons ?? []).filter((lesson) => HOTEL_LESSON_IDS.includes(lesson.id));
  if (hotelLessons.length !== HOTEL_LESSON_IDS.length) {
    fail("SCENE", `missing hotel lessons: ${HOTEL_LESSON_IDS.filter((id) => !hotelLessons.some((lesson) => lesson.id === id)).join(",")}`);
  }

  const teach = hotelLessons.find((lesson) => lesson.id === "p6-survival-mandarin");
  const mission = hotelLessons.find((lesson) => lesson.id === "p7-imersao-hotel");
  if (!teach) fail("SCENE", "p6-survival-mandarin missing");
  if (!mission) fail("SCENE", "p7-imersao-hotel missing");

  if (teach) {
    const steps = teach.steps ?? [];
    const teachReserve = steps.findIndex(
      (step) =>
        (step.kind === "listen" && /我有预订/.test(String(step.text ?? ""))) ||
        (step.kind === "flashcard" && step.chunkId === "woyouyuding")
    );
    const testReserve = steps.findIndex(
      (step) =>
        (step.kind === "dialogue_choice" && /我有预订/.test(clean(step.correctAnswer ?? ""))) ||
        (step.kind === "free_production" && /我有预订/.test(clean(step.answer ?? step.correctAnswer ?? "")))
    );
    if (testReserve >= 0 && (teachReserve < 0 || teachReserve >= testReserve)) {
      fail("TEACH_BEFORE_TEST", "p6-survival-mandarin tests 我有预订 before teaching it");
    }
    const teachNights = steps.findIndex(
      (step) =>
        (step.kind === "listen" && /住几晚/.test(String(step.text ?? ""))) ||
        (step.kind === "flashcard" && step.chunkId === "zhujiwan")
    );
    const testNights = steps.findIndex((step) => step.kind === "dialogue_choice" && /两晚/.test(clean(step.correctAnswer ?? "")));
    if (testNights >= 0 && (teachNights < 0 || teachNights >= testNights)) {
      fail("TEACH_BEFORE_TEST", "p6-survival-mandarin tests 两晚 / 几晚 before teaching 住几晚");
    }
    if (!steps.some((step) => step.kind === "listen_select" && /三零五/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "room_number listening missing from hotel teach lesson");
    }
    const productions = steps.filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /我有预订/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "independent reservation production missing from hotel teach");
    }
    if (!productions.some((step) => /房间在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "independent room-location production missing from hotel teach");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: hotel teach productions must allow speech");
    for (const step of productions) independent(step, teach.id, `${teach.id}/${step.title ?? step.kind}`);
  }

  if (mission) {
    if (teach?.cultureItemId !== "hotel-checkin-register") fail("CULTURE", "hotel teach lesson must keep hotel-checkin-register");
    if (!(mission.steps ?? []).some((step) => step.sceneId === "checkin-hotel")) fail("SCENE", "mission without checkin-hotel");
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && /三零五/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "room_number listening missing from hotel mission");
    }
    const productions = (mission.steps ?? []).filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /我有预订/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "reservation production missing from hotel mission");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: hotel mission productions must allow speech");
    for (const step of productions) independent(step, mission.id, `${mission.id}/${step.title ?? step.kind}`);
    if (!(mission.steps ?? []).some((step) => /房卡|cartão do quarto/.test(`${step.correctAnswer ?? ""}${blobOf(step)}`))) {
      fail("CAPABILITY", "room_card visual task missing from hotel mission");
    }
    if (!(mission.steps ?? []).some((step) => /前台/.test(`${step.signHanzi ?? ""}${step.correctAnswer ?? ""}`))) {
      fail("CAPABILITY", "find_reception sign missing");
    }
  }

  for (const lesson of hotelLessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      const stimulus = AUDIO_KINDS.has(step.kind) ? (step.audioText ?? step.audioSequence?.[0]) : "";
      if (AUDIO_KINDS.has(step.kind)) {
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
        if (/三零五/.test(String(step.audioText ?? "")) && /305/.test(`${step.title ?? ""}${step.prompt ?? ""}`)) {
          fail("TARGET_LEAK", `${lesson.id}: Arabic 305 shown before audio`);
        }
      }
      if (/Matheus/.test(blobOf(step))) fail("MATHEUS", `${lesson.id}/${index + 1}: hardcoded Matheus`);
    }
  }

  const hotelScenes = (scenes ?? []).filter((scene) => HOTEL_SCENE_IDS.includes(scene.sceneId));
  for (const scene of hotelScenes) {
    if (scene.setting !== "hotel") fail("SCENE", `${scene.sceneId}: setting must be hotel`);
    const roles = (scene.characters ?? []).map((character) => character.role);
    if (!roles.includes("Recepcionista") || !roles.includes("Viajante")) {
      fail("SCENE", `${scene.sceneId}: receptionist and traveller roles must be explicit`);
    }
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    let hasPassport = false;
    let hasReserve = false;
    let hasRoomListen = false;
    let hasNights = false;
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") independent(node.interaction, scene.sceneId, `${scene.sceneId}/${node.id}`);
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (answer) evidence.push({ lesson: scene.sceneId, location: node.id, answer, kind: node.interaction?.type ?? "npc" });
      if (/我有预订/.test(answer)) hasReserve = true;
      if (/这是我的护照/.test(answer) || /护照/.test(cleanHanzi(node.hanzi))) hasPassport = true;
      if (node.interaction?.type === "listen_reply" && /三零五/.test(String(node.interaction.listenAudioText ?? node.hanzi ?? ""))) {
        hasRoomListen = true;
        if (/305/.test(node.hanzi ?? "")) fail("TARGET_LEAK", "room number Arabic leaked in NPC line");
      }
      if (/两晚/.test(answer) || /住几晚/.test(cleanHanzi(node.hanzi))) hasNights = true;
      if (node.interaction) {
        const prompt = node.interaction.prompt ?? "";
        const valid = node.interaction.validAnswers ?? [];
        if (/também vale|ambas|as duas servem|also works/i.test(prompt) && !node.interaction.decision) {
          fail("ANSWER_CONTRACT", `${scene.sceneId}/${node.id}: prompt treats two answers as valid without a decision`);
        }
        if (node.interaction.decision) {
          for (const item of valid) {
            const next = node.interaction.nextByAnswer?.[item] ?? node.interaction.correctNextNodeId;
            if (next && next === node.interaction.wrongNextNodeId) {
              fail("ANSWER_CONTRACT", `${scene.sceneId}/${node.id}: valid "${item}" takes the wrong branch`);
            }
          }
        }
        const wrong = node.interaction.wrongNextNodeId;
        const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
        if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
      }
      if (/Matheus/.test(`${node.interaction?.prompt ?? ""}${node.pt ?? ""}`)) {
        fail("MATHEUS", `${scene.sceneId}/${node.id}`);
      }
    }
    if (!hasReserve) fail("CAPABILITY", "reservation missing from hotel scene");
    if (!hasPassport) fail("CAPABILITY", "check-in ends without document");
    if (!hasRoomListen) fail("CAPABILITY", "room number listening missing from hotel scene");
    if (!hasNights) fail("CAPABILITY", "nights missing from hotel scene");
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: every repair is 请再说一遍`);
    }
  }

  const added = (chunks ?? []).filter((chunk) => NEW_CHUNK_ALLOW.has(chunk.id) === false && /hotel|airport|aeroporto/i.test(`${chunk.tags ?? []}${chunk.id}`));
  const hotelNew = (chunks ?? []).filter((chunk) => ["zhujiwan", "sanlingwu"].includes(chunk.id));
  if (hotelNew.length > 4) fail("NOVELTY", "too many new hotel chunks");
  void added;

  const decisions = validateConversationDecisions(data);
  return { failures, evidence, decisions: decisions.scenes?.filter((id) => HOTEL_SCENE_IDS.includes(id)) ?? [] };
}
