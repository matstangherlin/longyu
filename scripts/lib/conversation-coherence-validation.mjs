/**
 * Conversation coherence contracts — explicit speech-act pairs, not an LLM judge.
 */

export const INTEGRATED_SCENE_IDS = [
  "encontro-amanha",
  "que-horas-sao",
  "rotina-e-trabalho",
  "pedir-cardapio",
  "imersao-restaurante",
];

export const SPEECH_ACT_PAIRS = {
  greet: ["greet", "acknowledge", "get_attention", "ask_location", "ask_route", "ask_price", "confirm_reservation", "present_document", "tell_wellbeing"],
  farewell: ["farewell"],
  ask_time: ["tell_time"],
  ask_when: ["tell_when"],
  ask_location: ["tell_location", "state_destination"],
  ask_route: ["tell_direction", "acknowledge"],
  tell_direction: ["acknowledge", "ask_route", "ask_repeat"],
  request_stop: ["acknowledge"],
  state_destination: ["acknowledge", "confirm_item"],
  ask_job: ["tell_job"],
  thank: ["acknowledge_thanks"],
  confirm_plan: ["confirm_plan", "acknowledge"],
  ask_name: ["tell_name"],
  ask_wellbeing: ["tell_wellbeing", "praise_food"],
  acknowledge: ["acknowledge", "greet", "request_stop", "ask_room_location", "ask_gate", "ask_wifi", "thank", "request_doctor", "request_help", "ask_location", "ask_repeat"],
  tell_time: ["acknowledge"],
  tell_when: ["acknowledge", "ask_repeat"],
  tell_location: ["acknowledge", "ask_wifi"],
  tell_job: ["acknowledge"],
  acknowledge_thanks: ["acknowledge"],
  tell_name: ["acknowledge"],
  tell_wellbeing: ["acknowledge"],
  ask_party_size: ["tell_party_size"],
  tell_party_size: ["acknowledge"],
  offer_menu: ["request_menu"],
  request_menu: ["acknowledge"],
  ask_order: ["place_order", "accept_offer", "refuse_offer"],
  place_order: ["acknowledge", "confirm_order"],
  confirm_order: ["request_bill", "acknowledge"],
  request_bill: ["acknowledge"],
  refuse_offer: ["acknowledge"],
  accept_offer: ["acknowledge"],
  get_attention: ["acknowledge", "greet"],
  praise_food: ["acknowledge"],
  ask_price: ["tell_price"],
  tell_price: ["acknowledge", "accept_offer", "refuse_offer"],
  confirm_item: ["ask_price", "thank", "acknowledge"],
  confirm_price: ["request_discount", "acknowledge"],
  request_discount: ["acknowledge"],
  ask_payment: ["ask_card", "ask_cash", "acknowledge"],
  ask_card: ["acknowledge"],
  ask_cash: ["acknowledge"],
  ask_reservation: ["confirm_reservation"],
  confirm_reservation: ["acknowledge", "request_document"],
  request_document: ["present_document"],
  present_document: ["acknowledge"],
  ask_nights: ["tell_nights"],
  tell_nights: ["acknowledge"],
  tell_room_number: ["acknowledge", "ask_room_location"],
  ask_room_location: ["tell_location"],
  ask_wifi: ["acknowledge"],
  ask_gate: ["tell_gate"],
  tell_gate: ["acknowledge", "ask_repeat", "ask_route"],
  ask_repeat: ["acknowledge"],
  ask_symptom: ["tell_symptom", "acknowledge"],
  tell_symptom: ["acknowledge", "request_doctor"],
  request_doctor: ["acknowledge", "tell_direction"],
  request_help: ["acknowledge", "tell_direction"],
};

const PUNCT = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/gu;
const GENERIC_REPAIR = "请再说一遍";

export function cleanHanzi(value) {
  return String(value ?? "").replace(PUNCT, "").trim();
}

export function mainPath(nodes, entryNodeId) {
  const byId = new Map((nodes ?? []).map((node) => [node.id, node]));
  const seen = new Set();
  const path = [];
  let current = byId.get(entryNodeId ?? nodes?.[0]?.id);
  while (current && !seen.has(current.id)) {
    path.push(current);
    seen.add(current.id);
    const next = current.interaction?.correctNextNodeId ?? current.nextNodeId;
    current = next ? byId.get(next) : undefined;
  }
  return path;
}

function jobLocationMismatch(npc, prompt, answer) {
  const jobQ = /做什么工作/.test(npc);
  const locQ = /在哪里工作|在哪儿工作/.test(npc);
  const locA = /在.+(上班|工作)|在公司/.test(answer);
  const locPrompt = /onde você trabalha/i.test(prompt);
  const jobPrompt = /o que você faz|profiss/i.test(prompt);
  if (jobQ && locA) return true;
  if (jobQ && locPrompt) return true;
  if (locQ && jobPrompt && !locPrompt) return true;
  return false;
}

export function classifyInteraction(node, repairNode, nextAsk, prevAnswer) {
  const labels = [];
  const npc = node.hanzi ?? "";
  const prompt = node.interaction?.prompt ?? "";
  const answer = node.interaction?.correctAnswer ?? "";
  const repair = repairNode?.hanzi ?? "";
  const speechAct = node.interaction?.speechAct;
  const expected = node.interaction?.expectedResponseAct;
  if (jobLocationMismatch(npc, prompt, answer)) labels.push("INTENT_MISMATCH");
  if (speechAct && expected) {
    const allowed = SPEECH_ACT_PAIRS[speechAct];
    if (allowed && !allowed.includes(expected)) labels.push("INTENT_MISMATCH");
  }
  if (cleanHanzi(repair) === GENERIC_REPAIR) labels.push("GENERIC_REPAIR");
  if (nextAsk && prevAnswer) {
    const prev = cleanHanzi(prevAnswer);
    const follow = cleanHanzi(nextAsk);
    const overlap = [...prev].some((ch, i) => i < prev.length - 1 && follow.includes(prev.slice(i, i + 2)));
    if (!overlap && /[？?]/.test(nextAsk)) labels.push("QUESTION_NOT_USING_PREVIOUS_CONTEXT");
  }
  if ((node.interaction?.accepts ?? []).length <= 1 && answer.length >= 4) labels.push("ANSWER_TOO_NARROW");
  if (labels.length === 0) labels.push("OK");
  return labels;
}

function repairNodeFor(nodes, interaction) {
  const wrong = interaction?.wrongNextNodeId;
  if (!wrong) return null;
  return (nodes ?? []).find((node) => node.id === wrong) ?? null;
}

export function auditScene(scene) {
  const nodes = scene.nodes ?? [];
  const path = mainPath(nodes, scene.entryNodeId);
  const interactions = path.filter((node) => node.interaction);
  const terminal = path[path.length - 1];
  const repairs = [];
  const turns = [];
  for (let i = 0; i < path.length; i += 1) {
    const node = path[i];
    if (!node.interaction) continue;
    const repair = repairNodeFor(nodes, node.interaction);
    if (repair) repairs.push(repair.hanzi);
    const answerNode = path.find((item) => item.id === node.interaction.correctNextNodeId);
    const after = path[path.indexOf(answerNode) + 1];
    const labels = classifyInteraction(node, repair, after?.hanzi, node.interaction.correctAnswer);
    turns.push({
      id: node.id,
      npc: node.hanzi,
      meaning: node.pt,
      prompt: node.interaction.prompt,
      expected: node.interaction.correctAnswer,
      accepts: node.interaction.accepts ?? [],
      speechAct: node.interaction.speechAct ?? "",
      expectedResponseAct: node.interaction.expectedResponseAct ?? "",
      repairType: node.interaction.repairType ?? "",
      repair: repair?.hanzi ?? "",
      next: after?.hanzi ?? terminal?.hanzi ?? "",
      labels,
    });
  }
  const ending = cleanHanzi(terminal?.hanzi);
  if (ending === "好谢谢") {
    for (const turn of turns) {
      if (!turn.labels.includes("UNNATURAL_ENDING")) turn.labels.push("UNNATURAL_ENDING");
    }
  }
  const lastInteraction = interactions[interactions.length - 1];
  return {
    sceneId: scene.sceneId,
    intent: scene.intent,
    ending: terminal?.hanzi ?? "",
    endingClean: ending,
    lastInteractionType: lastInteraction?.interaction?.type ?? "",
    repairs: repairs.map(cleanHanzi),
    turns,
    path,
  };
}

export function validateConversationCoherence(data) {
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const scenes = data.scenes ?? [];
  const audits = scenes.map(auditScene);
  const important = audits.filter((item) => INTEGRATED_SCENE_IDS.includes(item.sceneId));

  for (const audit of audits) {
    for (const turn of audit.turns) {
      if (turn.labels.includes("INTENT_MISMATCH")) {
        fail("INTENT_MISMATCH", `${audit.sceneId}@${turn.id}: pergunta/prompt/resposta cobram intenções diferentes`);
      }
    }
  }

  for (const audit of important) {
    if (audit.turns.length === 0) {
      fail("BROKEN_CONTINUITY", `${audit.sceneId}: cena importante sem interação`);
      continue;
    }
    const declared = audit.turns.filter((turn) => turn.speechAct && turn.expectedResponseAct);
    if (declared.length < audit.turns.length) {
      fail("SPEECH_ACT", `${audit.sceneId}: interação importante sem speechAct/expectedResponseAct`);
    }
    const uniqueRepairs = [...new Set(audit.repairs.filter(Boolean))];
    if (uniqueRepairs.length <= 1 && uniqueRepairs[0] === GENERIC_REPAIR) {
      fail("GENERIC_REPAIR", `${audit.sceneId}: reparo único genérico 请再说一遍`);
    }
    if (uniqueRepairs.length < 2 && audit.turns.length >= 2) {
      fail("GENERIC_REPAIR", `${audit.sceneId}: reparos sem variedade`);
    }
    const reactions = audit.path.filter((node, index) => {
      if (node.interaction) return false;
      const prev = audit.path[index - 1];
      return prev && prev.speakerId === "lin";
    });
    const hasEcho = reactions.some((node) =>
      audit.turns.some((turn) => {
        const answer = cleanHanzi(turn.expected);
        const hanzi = cleanHanzi(node.hanzi);
        return answer.length >= 2 && [...answer].some((_, i) => i < answer.length - 1 && hanzi.includes(answer.slice(i, i + 2)));
      })
    );
    if (!hasEcho) fail("BROKEN_CONTINUITY", `${audit.sceneId}: NPC não reage ao que o aluno acabou de dizer`);
    if (audit.endingClean === "好谢谢") {
      fail("UNNATURAL_ENDING", `${audit.sceneId}: fechamento genérico 好！谢谢！`);
    }
    if (audit.lastInteractionType && audit.lastInteractionType !== "produce_reply") {
      fail("FINAL_NOT_PRODUCTION", `${audit.sceneId}: produção final da conversa não é produce_reply (${audit.lastInteractionType})`);
    }
  }

  const importantEndings = new Set(important.map((item) => item.endingClean).filter(Boolean));
  if (important.length >= 2 && importantEndings.size < 2) {
    fail("UNNATURAL_ENDING", "cenas importantes compartilham o mesmo fechamento");
  }

  const allImportantRepairs = important.flatMap((item) => item.repairs);
  if (allImportantRepairs.length > 1 && new Set(allImportantRepairs).size === 1) {
    fail("GENERIC_REPAIR", `todos os reparos importantes são o mesmo texto: ${allImportantRepairs[0]}`);
  }

  return { failures, audits };
}
