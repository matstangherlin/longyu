import assert from "node:assert/strict";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationCoherence } from "./lib/conversation-coherence-validation.mjs";

const base = loadIntegratedLearningRuntime();
assert.deepEqual(validateConversationCoherence(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateConversationCoherence(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived (expected ${code}); ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 ask_job with location answer", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "rotina-e-trabalho");
  for (const node of scene.nodes) {
    if (node.interaction?.speechAct === "ask_location") {
      node.hanzi = "你做什么工作？";
      node.interaction.speechAct = "ask_job";
      node.interaction.prompt = "Onde você trabalha?";
    }
  }
}, "INTENT_MISMATCH");

mutation("2 all repairs become the same generic line", (data) => {
  for (const scene of data.scenes) {
    for (const node of scene.nodes ?? []) {
      if (String(node.id ?? "").includes("retry") || node.interaction?.wrongNextNodeId) {
        if (String(node.id ?? "").includes("retry")) node.hanzi = "请再说一遍。";
      }
    }
    for (const node of scene.nodes ?? []) {
      const wrong = node.interaction?.wrongNextNodeId;
      if (!wrong) continue;
      const repair = scene.nodes.find((item) => item.id === wrong);
      if (repair) repair.hanzi = "请再说一遍。";
    }
  }
}, "GENERIC_REPAIR");

mutation("shopping tell_price cannot expect place_order", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-na-loja");
  const node = scene.nodes.find((item) => item.id === "loja-2");
  node.interaction.expectedResponseAct = "place_order";
}, "INTENT_MISMATCH");

mutation("8 conversation final production becomes multiple choice", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "que-horas-sao");
  const pathIds = new Set();
  let current = scene.nodes.find((node) => node.id === scene.entryNodeId) ?? scene.nodes[0];
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    pathIds.add(current.id);
    const next = current.interaction?.correctNextNodeId ?? current.nextNodeId;
    current = scene.nodes.find((node) => node.id === next);
  }
  const last = [...seen].reverse().map((id) => scene.nodes.find((node) => node.id === id)).find((node) => node?.interaction);
  last.interaction.type = "choose_reply";
  last.interaction.options = [last.interaction.correctAnswer, "我很好"];
}, "FINAL_NOT_PRODUCTION");

console.log("PASS conversation-coherence mutations 1, 2, shopping-price, 8");
