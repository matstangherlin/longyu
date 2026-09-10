import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";

const GENERIC_REPAIR = "请再说一遍";
const TRAVEL_SCENES = ["checkin-hotel", "no-aeroporto"];
const TRANSFER_ID = "p7-imersao-viagem";
const NEW_TRAVEL_CHUNKS = new Set(["zhujiwan", "sanlingwu", "dengjikou"]);

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function classifyNode(node, sceneId) {
  const npc = node.hanzi ?? "";
  const prompt = node.interaction?.prompt ?? "";
  if (/Matheus/.test(prompt)) return "ANSWER_CONTRACT_BUG";
  if (sceneId === "checkin-hotel" && /também vale|ambas servem/i.test(prompt) && !node.interaction?.decision) {
    return "ANSWER_CONTRACT_BUG";
  }
  if (sceneId === "no-aeroporto" && node.speakerId === "wang" && /登机口在哪里/.test(cleanHanzi(npc)) && node.interaction) {
    return "ROLE_CONFUSION";
  }
  if (sceneId === "no-aeroporto" && /机场在哪里/.test(cleanHanzi(npc)) && /护照|登机口/.test(prompt)) {
    return "CONTEXT_JUMP";
  }
  if (sceneId === "checkin-hotel" && /有预订吗/.test(cleanHanzi(npc)) && /护照/.test(node.interaction?.correctAnswer ?? "") && !node.interaction?.decision) {
    return "UNNATURAL";
  }
  return "OK";
}

export function validateTravelConversationNaturalness(data) {
  const { lessons, scenes, chunks } = data;
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });

  const travelScenes = (scenes ?? []).filter((scene) => TRAVEL_SCENES.includes(scene.sceneId));
  if (travelScenes.length !== TRAVEL_SCENES.length) fail("SCENE", "hotel/airport scenes missing");

  for (const scene of travelScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    for (const node of path) {
      const label = classifyNode(node, scene.sceneId);
      if (label !== "OK") fail(label, `${scene.sceneId}/${node.id}`);
      if (node.interaction?.wrongNextNodeId) {
        const repair = (scene.nodes ?? []).find((item) => item.id === node.interaction.wrongNextNodeId);
        if (repair?.hanzi) repairs.push(cleanHanzi(repair.hanzi));
      }
    }
    const unique = [...new Set(repairs.filter(Boolean))];
    if (unique.length && unique.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: all repairs are 请再说一遍`);
    }
    if (scene.sceneId === "no-aeroporto") {
      if (scene.setting !== "airport") fail("CONTEXT_JUMP", "no-aeroporto must be airport, not street");
      const first = path[0];
      if (first && /机场在哪里/.test(cleanHanzi(first.hanzi))) fail("CONTEXT_JUMP", "airport starts on the street");
    }
    if (scene.sceneId === "checkin-hotel" && scene.setting !== "hotel") {
      fail("ROLE_CONFUSION", "checkin-hotel setting must be hotel");
    }
  }

  const transfer = (lessons ?? []).find((lesson) => lesson.id === TRANSFER_ID);
  if (!transfer) fail("TRANSFER_INTEGRITY", "p7-imersao-viagem missing");
  else {
    const blob = (transfer.steps ?? []).map((step) => [step.title, step.body, step.situationPt, step.correctAnswer, step.answer, step.audioText].join(" ")).join("\n");
    if (!/酒店|hotel/i.test(blob) || !/机场|aeroporto/i.test(blob) || !/地铁|一直走|登机口/.test(blob)) {
      fail("TRANSFER_INTEGRITY", "master travel must connect hotel, mobility, and airport");
    }
    if ((transfer.steps ?? []).some((step) => step.kind === "flashcard" && NEW_TRAVEL_CHUNKS.has(step.chunkId))) {
      fail("TRANSFER_INTEGRITY", "master travel must not teach new hotel/airport chunks");
    }
    const productions = (transfer.steps ?? []).filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /机场在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("TRANSFER_INTEGRITY", "transfer must reuse 机场在哪里");
    }
    if (!productions.some((step) => /登机口在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("TRANSFER_INTEGRITY", "transfer must reuse 登机口在哪里");
    }
  }

  const newIds = (chunks ?? []).filter((chunk) => NEW_TRAVEL_CHUNKS.has(chunk.id));
  if (newIds.length > 6) fail("NOVELTY", "travel wave added too many chunks");

  return { failures };
}
