import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";

const GENERIC_REPAIR = "请再说一遍";
const HEALTH_SCENES = ["nao-me-sinto-bem", "na-clinica"];

function classifyNode(node, sceneId) {
  const npc = node.hanzi ?? "";
  const prompt = node.interaction?.prompt ?? "";
  const answer = node.interaction?.correctAnswer ?? "";
  if (/Matheus/.test(prompt)) return "ANSWER_CONTRACT_BUG";
  if (sceneId === "nao-me-sinto-bem" && node.speakerId === "mei" && /医院在哪里/.test(cleanHanzi(npc)) && node.interaction) {
    return "ROLE_CONFUSION";
  }
  if (sceneId === "nao-me-sinto-bem" && /看医生/.test(cleanHanzi(npc)) && /需要医生/.test(answer) === false && /医院/.test(prompt)) {
    return "CONTEXT_JUMP";
  }
  if (sceneId === "na-clinica" && (node.speakerId === "mei" || /amigo/i.test(prompt))) {
    return "ROLE_CONFUSION";
  }
  if (sceneId === "na-clinica" && /你好.*怎么样/.test(cleanHanzi(npc)) && node.interaction?.type === "produce_reply") {
    return "CONTEXT_JUMP";
  }
  if (/请再说一遍/.test(cleanHanzi(npc)) && /我头疼|医院在哪里|我不舒服/.test(cleanHanzi(npc))) {
    return "GENERIC_REPAIR";
  }
  if (sceneId === "nao-me-sinto-bem" && /医院在哪里/.test(cleanHanzi(answer)) && /怎么样/.test(cleanHanzi(npc))) {
    return "UNNATURAL";
  }
  return "OK";
}

export function validateHealthConversationNaturalness(data) {
  const { scenes } = data;
  const failures = [];
  const rows = [];
  const fail = (code, message) => failures.push({ code, message });

  const healthScenes = (scenes ?? []).filter((scene) => HEALTH_SCENES.includes(scene.sceneId));
  if (healthScenes.length !== HEALTH_SCENES.length) fail("SCENE", "health scenes missing");

  for (const scene of healthScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    for (const node of path) {
      const label = classifyNode(node, scene.sceneId);
      rows.push({ sceneId: scene.sceneId, nodeId: node.id, label });
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
    if (scene.sceneId === "nao-me-sinto-bem" && scene.setting !== "street") {
      fail("CONTEXT_JUMP", "friend scene must stay on the street");
    }
    if (scene.sceneId === "na-clinica" && scene.setting !== "clinic") {
      fail("ROLE_CONFUSION", "clinic setting missing");
    }
    if (scene.sceneId === "na-clinica") {
      const repeat = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
      if (!repeat) fail("LEXICAL_GAP", "clinic missing repair strategies");
      else if ((repeat.interaction.nextByAnswer ?? {})["请再说一遍"] === (repeat.interaction.nextByAnswer ?? {})["请慢一点"]) {
        fail("UNNATURAL", "slow and repeat must branch differently");
      }
    }
  }

  return { failures, rows };
}
