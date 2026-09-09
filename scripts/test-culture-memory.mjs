import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureMemory } from "./lib/culture-memory-validation.mjs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureMemory(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureMemory(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("3 mission without memory target", (data) => {
  data.missions[0].memoryTargets = [];
}, "NO_MEMORY");

mutation("8 review presents answer in prompt", (data) => {
  const target = data.missions[0].memoryTargets[0];
  const preferred = target.options.find((option) => option.preferred) ?? target.options[0];
  target.reviewVariants[0].prompt = {
    pt: `A resposta é ${preferred.label.pt}`,
    en: `The answer is ${preferred.label.en}`,
  };
  target.reviewVariants[0].options = target.options;
}, "ANSWER_IN_PROMPT");

const { applyCultureMemoryReview } = tsRequire("../../src/lib/cultureMastery.ts");
const patch = applyCultureMemoryReview(
  {
    "shared-dishes-core": {
      targetId: "shared-dishes-core",
      cultureItemId: "shared-dishes",
      due: 1,
      stage: 0,
      reps: 0,
      lapses: 0,
      updatedAt: 1,
    },
  },
  "shared-dishes-core",
  true,
  10
);
assert.deepEqual(Object.keys(patch["shared-dishes-core"]).sort().includes("due"), true);
assert.ok(!("srs" in patch));
assert.ok(!("learnedChars" in patch));
console.log("KILLED 9 culture review alters lexical SRS: isolated memory map");

const { migrateCultureV21ToQuest } = tsRequire("../../src/lib/cultureMastery.ts");
const migrated = migrateCultureV21ToQuest({
  cultureCompletedIds: ["visiting-home"],
  cultureSavedIds: ["digital-pay"],
  cultureStartedIds: ["host-insistence"],
  now: 1000,
});
assert.equal(migrated.cultureCompletedIds.includes("visiting-home"), true);
assert.equal(migrated.cultureMasteryById["visiting-home"]?.stars, 1);
assert.ok(migrated.cultureMemoryById["visiting-home-core"]);
assert.ok(migrated.cultureMemoryById["visiting-home-core"].due > 1000);
console.log("KILLED 12 v21 progress lost on migration: visiting-home kept at 1 star");

console.log("PASS culture-memory mutations");
