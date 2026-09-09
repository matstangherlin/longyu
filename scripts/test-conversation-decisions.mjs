import assert from "node:assert/strict";
import { loadShoppingRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationDecisions } from "./lib/conversation-decisions-validation.mjs";

const base = loadShoppingRuntime();
assert.deepEqual(validateConversationDecisions(base).failures, [], "positive control must pass before mutation tests");

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
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateConversationDecisions(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 valid accept takes the error branch", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-na-loja");
  for (const node of scene.nodes ?? []) {
    if (!node.interaction?.decision) continue;
    node.interaction.nextByAnswer = { ...node.interaction.nextByAnswer, 好: node.interaction.wrongNextNodeId };
  }
}, "VALID_AS_ERROR");

mutation("2 decision collapses to a single quiz key", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "imersao-mercado");
  for (const node of scene.nodes ?? []) {
    if (!node.interaction?.decision) continue;
    node.interaction.validAnswers = [node.interaction.correctAnswer];
  }
}, "FACTUAL_QUIZ");

mutation("3 bargain branch cannot finish", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "imersao-mercado");
  for (const node of scene.nodes ?? []) {
    if (node.interaction?.nextByAnswer?.["太贵了"]) {
      node.interaction.nextByAnswer["太贵了"] = "ghost-terminal";
      scene.nodes.push({ id: "ghost-terminal", hanzi: "…", pinyin: "…", pt: "…", nextNodeId: "ghost-loop" });
      scene.nodes.push({ id: "ghost-loop", hanzi: "…", pinyin: "…", pt: "…", nextNodeId: "ghost-terminal" });
    }
  }
}, "BRANCH_DEAD");

mutation("4 player grades a decision as a local mistake", (data) => {
  data.conversationPlayerSource = (data.conversationPlayerSource ?? "").replaceAll("conversationDecisionMatches", "conversationAnswersMatch");
}, "FACTUAL_QUIZ");

console.log("PASS 4/4 conversation-decisions mutations, with positive control.");
