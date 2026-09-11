#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationLexicalBridge } from "./lib/v498b1-gates.mjs";

const base = loadIntegratedLearningRuntime();
assert.equal(validateConversationLexicalBridge(base).failures.length, 0, "positive control");

function fixture() {
  return structuredClone({ lessons: base.lessons, scenes: base.scenes, chunks: base.chunks, characters: base.characters });
}

function killed(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateConversationLexicalBridge(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived; ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("1 conversation ref never taught", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-hotel");
  const step = lesson.steps.find((item) => item.kind === "conversation_scene");
  step.learnedRefs = [...(step.learnedRefs ?? []), "chunk:never-taught-xyz"];
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  scene.learnedRefs = [...(scene.learnedRefs ?? []), "chunk:never-taught-xyz"];
}, "LEXICAL_GAP");

killed("2 newRef only in dialogue", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-hotel");
  const step = lesson.steps.find((item) => item.kind === "conversation_scene");
  step.newRefs = ["chunk:brand-new-only-in-scene"];
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  scene.newRefs = ["chunk:brand-new-only-in-scene"];
}, "NEW_REF_NO_TEACH");

console.log("PASS test:conversation-lexical-bridge");
