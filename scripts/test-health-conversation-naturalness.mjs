import assert from "node:assert/strict";
import { loadHealthRuntime } from "./lib/v495a-runtime.mjs";
import { validateHealthConversationNaturalness } from "./lib/health-conversation-naturalness-validation.mjs";

const base = loadHealthRuntime();
assert.deepEqual(validateHealthConversationNaturalness(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return structuredClone({ scenes: base.scenes, lessons: base.lessons });
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateHealthConversationNaturalness(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("7 friend NPC asks 医院在哪里", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "nao-me-sinto-bem");
  const node = scene.nodes.find((item) => item.interaction?.type === "produce_reply");
  node.speakerId = "mei";
  node.hanzi = "医院在哪里？";
  node.interaction.correctAnswer = "医院在哪里？";
}, "ROLE_CONFUSION");

mutation("clinic uses friend greeting", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "na-clinica");
  scene.setting = "street";
}, "ROLE_CONFUSION");

mutation("8 slow equals repeat", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "na-clinica");
  const node = scene.nodes.find((item) => item.interaction?.validAnswers?.includes("请慢一点"));
  node.interaction.nextByAnswer = { 请再说一遍: "clinic-repeat", 请慢一点: "clinic-repeat" };
}, "UNNATURAL");

console.log("PASS test:health-conversation-naturalness");
