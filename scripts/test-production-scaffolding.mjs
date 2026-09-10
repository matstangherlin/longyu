#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadHotelRuntime } from "./lib/v495a-runtime.mjs";
import { validateProductionScaffolding } from "./lib/v498b1-gates.mjs";

const base = loadHotelRuntime();
assert.equal(validateProductionScaffolding(base).failures.length, 0, "positive control");

function fixture() {
  return {
    ...structuredClone({
      lessons: base.lessons,
      scenes: base.scenes,
      chunks: base.chunks,
      characters: base.characters,
    }),
    conversationPlayerSource: base.conversationPlayerSource,
  };
}

function killed(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateProductionScaffolding(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("3 teach to open without rung", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p6-survival-mandarin");
  lesson.steps = lesson.steps.filter(
    (step) => !(step.kind === "fill_blank" && /护照|预订|房间/.test(`${step.blankAnswer ?? ""}${step.sentenceBefore ?? ""}`)) &&
      !(step.kind === "sentence_build" && /护照|房间/.test((step.targetParts ?? []).join("")))
  );
}, "NO_GUIDED");

killed("4 transfer over-scaffolded", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "no-aeroporto");
  const node = scene.nodes.find((item) => item.interaction?.capabilityId === "zheshiwodehuzhao");
  node.interaction.productionScaffold = "first";
}, "OVER_SCAFFOLD");

killed("5 guided hotel missing bank", (data) => {
  const scene = data.scenes.find((item) => item.sceneId === "checkin-hotel");
  const node = scene.nodes.find((item) => item.interaction?.capabilityId === "zheshiwodehuzhao");
  node.interaction.productionHelpBuildBank = [];
  node.interaction.productionScaffold = "transfer";
}, "GUIDED_CONTRACT");

killed("8 speaking missing with pieces", (data) => {
  data.conversationPlayerSource = data.conversationPlayerSource.replace(/micOnly/g, "hiddenMic").replace(/FreeAnswerField/g, "TextOnlyField");
}, "SPEAKING");

killed("13 airport re-teaches passport", (data) => {
  const lesson = data.lessons.find((item) => item.id === "p7-imersao-aeroporto");
  lesson.steps.unshift({ kind: "flashcard", chunkId: "huzhao" });
}, "LEXICAL_NOVELTY");

killed("14 different evaluator", (data) => {
  data.conversationPlayerSource = data.conversationPlayerSource.replace(/evaluateLearnerResponse/g, "otherEvaluator");
}, "EVALUATOR");

console.log("PASS test:production-scaffolding");
