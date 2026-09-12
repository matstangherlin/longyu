import assert from "node:assert/strict";
import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateCapstoneTransfer } from "./lib/capstone-transfer-validation.mjs";

const base = loadCapstoneRuntime();
assert.deepEqual(validateCapstoneTransfer(base).failures, [], "positive control must pass before mutation tests");

function fixture() {
  return structuredClone({
    lessons: base.lessons,
    scenes: base.scenes,
  });
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCapstoneTransfer(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("22 drop 我要 from shopping", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "conversa-na-loja");
  for (const node of scene.nodes ?? []) {
    if (node.hanzi) node.hanzi = String(node.hanzi).replaceAll("我要", "你好");
    if (node.interaction?.correctAnswer) node.interaction.correctAnswer = String(node.interaction.correctAnswer).replaceAll("我要", "你好");
    if (node.interaction?.accepts) {
      node.interaction.accepts = node.interaction.accepts.map((item) => String(item).replaceAll("我要", "你好"));
    }
  }
}, "TRANSFER");

console.log("PASS test:capstone-transfer");
