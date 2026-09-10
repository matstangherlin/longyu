/**
 * Valid conversation decisions: accept / bargain / decline are strategies,
 * not a factual quiz. A valid reply must not take the error branch.
 */

import { mainPath } from "./conversation-coherence-validation.mjs";

const SHOPPING_DECISION_SCENES = ["conversa-na-loja", "comprar-itens", "imersao-mercado"];

function edges(node) {
  return [
    node?.nextNodeId,
    node?.interaction?.correctNextNodeId,
    node?.interaction?.wrongNextNodeId,
    ...Object.values(node?.interaction?.nextByAnswer ?? {}),
  ].filter(Boolean);
}

function canFinishFrom(nodes, startId) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const terminals = nodes.filter((node) => edges(node).length === 0).map((node) => node.id);
  const reverse = new Map(nodes.map((node) => [node.id, []]));
  for (const node of nodes) {
    for (const next of edges(node)) reverse.get(next)?.push(node.id);
  }
  const canFinish = new Set();
  const stack = [...terminals];
  while (stack.length) {
    const id = stack.pop();
    if (!id || canFinish.has(id)) continue;
    canFinish.add(id);
    stack.push(...(reverse.get(id) ?? []));
  }
  return canFinish.has(startId);
}

export function validateConversationDecisions(data) {
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const scenes = data.scenes ?? [];
  const player = data.conversationPlayerSource ?? "";

  if (player) {
    if (!/conversationDecisionMatches/.test(player)) {
      fail("FACTUAL_QUIZ", "ConversationSceneStep must treat decision matches as success");
    }
    if (!/interaction\.decision\s*\?\s*conversationDecisionMatches/.test(player) && !/decision[\s\S]{0,200}conversationDecisionMatches/.test(player)) {
      fail("FACTUAL_QUIZ", "decision replies must not be graded as a single-key quiz");
    }
    const onCorrectBlock = player.match(/onCorrect=\{\(attempt\) => \{[\s\S]{0,600}\}\}/);
    if (onCorrectBlock && /onDone\(/.test(onCorrectBlock[0])) {
      fail("DOUBLE_REWARD", "decision onCorrect must not call onDone");
    }
  }

  const decisionScenes = scenes.filter(
    (scene) =>
      SHOPPING_DECISION_SCENES.includes(scene.sceneId) ||
      (scene.nodes ?? []).some((node) => node.interaction?.decision)
  );

  if (!decisionScenes.some((scene) => scene.sceneId === "imersao-mercado")) {
    fail("DECISION", "imersao-mercado missing decision turns");
  }

  for (const scene of decisionScenes) {
    const nodes = scene.nodes ?? [];
    const path = mainPath(nodes, scene.entryNodeId);
    for (const node of nodes) {
      const interaction = node.interaction;
      if (!interaction?.decision) continue;
      const valid = interaction.validAnswers ?? [];
      if (valid.length < 2) fail("FACTUAL_QUIZ", `${scene.sceneId}/${node.id}: decision needs ≥2 validAnswers`);
      const wrong = interaction.wrongNextNodeId;
      for (const answer of valid) {
        const next = interaction.nextByAnswer?.[answer] ?? interaction.correctNextNodeId;
        if (!next) fail("BRANCH_DEAD", `${scene.sceneId}/${node.id}: ${answer} has no next node`);
        if (wrong && next === wrong) {
          fail("VALID_AS_ERROR", `${scene.sceneId}/${node.id}: valid "${answer}" takes the error branch`);
        }
        if (next && !canFinishFrom(nodes, next)) {
          fail("BRANCH_DEAD", `${scene.sceneId}/${node.id}: "${answer}" cannot finish`);
        }
      }
    }
    if (scene.sceneId === "conversa-na-loja") {
      const decision = path.find((node) => node.interaction?.decision);
      const valid = decision?.interaction?.validAnswers ?? [];
      if (!valid.includes("好") || !valid.includes("太贵了") || !valid.includes("不要了")) {
        fail("DECISION", "tagged shop must accept 好 / 太贵了 / 不要了");
      }
      if (decision?.interaction?.correctAnswer === "太贵了" && !valid.includes("好")) {
        fail("ALWAYS_BARGAIN", "tagged shop treats bargaining as the only correct move");
      }
    }
    if (scene.sceneId === "imersao-mercado") {
      const decision = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("太贵了"));
      const valid = decision?.interaction?.validAnswers ?? [];
      if (!valid.includes("好") || !valid.includes("不要了")) {
        fail("DECISION", "stall must keep accept and decline as valid siblings of bargain");
      }
    }
  }

  return { failures, scenes: decisionScenes.map((scene) => scene.sceneId) };
}
