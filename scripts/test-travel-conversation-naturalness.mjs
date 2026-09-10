import assert from "node:assert/strict";
import { loadTravelRuntime } from "./lib/v495a-runtime.mjs";
import { validateTravelConversationNaturalness } from "./lib/travel-conversation-naturalness-validation.mjs";

const base = loadTravelRuntime();
assert.deepEqual(validateTravelConversationNaturalness(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return structuredClone({
    lessons: base.lessons,
    scenes: base.scenes,
    chunks: base.chunks,
  });
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateTravelConversationNaturalness(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("11 all repairs become 请再说一遍", (data) => {
  for (const scene of data.scenes.filter((item) => ["checkin-hotel", "no-aeroporto"].includes(item.sceneId))) {
    for (const node of scene.nodes) {
      if (node.interaction?.wrongNextNodeId) {
        const repair = scene.nodes.find((item) => item.id === node.interaction.wrongNextNodeId);
        if (repair) repair.hanzi = "请再说一遍";
      }
    }
  }
}, "GENERIC_REPAIR");

mutation("12 hardcoded Matheus", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  const node = scene.nodes.find((item) => item.interaction);
  node.interaction.prompt = "O que Matheus perguntou?";
}, "ANSWER_CONTRACT_BUG");

mutation("20 master travel teaches new vocab", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-viagem");
  lesson.steps.unshift({ kind: "flashcard", chunkId: "zhujiwan", title: "住几晚？" });
}, "TRANSFER_INTEGRITY");

console.log("PASS test:travel-conversation-naturalness");
