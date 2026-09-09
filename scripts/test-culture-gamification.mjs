import assert from "node:assert/strict";
import fs from "node:fs";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureGamification } from "./lib/culture-gamification-validation.mjs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureGamification(base).failures, [], "positive control must pass");

const store = fs.readFileSync("src/lib/store.ts", "utf8");
assert.match(store, /startCultureItem:/);
assert.doesNotMatch(
  store.slice(store.indexOf("startCultureItem:"), store.indexOf("saveCultureItem:")),
  /claimReward/
);
console.log("KILLED 5 XP granted on open: startCultureItem does not claimReward");

const { applyCultureMissionComplete } = tsRequire("../../src/lib/cultureMastery.ts");
const { cultureStarsForAttempt } = tsRequire("../../src/data/cultureQuest.ts");
const maps = {
  cultureMasteryById: {},
  cultureMemoryById: {},
  cultureSeals: [],
  cultureCompletedIds: [],
  cultureSavedIds: [],
  cultureStartedIds: [],
};
const first = applyCultureMissionComplete(maps, {
  itemId: "visiting-home",
  score: 1,
  memoryCorrect: true,
  scoredCount: 4,
  correctCount: 4,
});
assert.equal(first.grantedXp, true);
assert.equal(first.stars, 3);
const second = applyCultureMissionComplete(first, {
  itemId: "visiting-home",
  score: 1,
  memoryCorrect: true,
  scoredCount: 4,
  correctCount: 4,
});
assert.equal(second.grantedXp, false, "replay must not grant XP again");
console.log("KILLED 6 replay duplicates XP");

assert.equal(cultureStarsForAttempt(0.5, false), 1);
assert.notEqual(cultureStarsForAttempt(0.5, false), 3);
const auto = applyCultureMissionComplete(maps, {
  itemId: "shared-dishes",
  score: 0.5,
  memoryCorrect: false,
  scoredCount: 0,
  correctCount: 0,
});
assert.equal(auto.stars, 1);
assert.notEqual(auto.stars, 3);
console.log("KILLED 7 completing item automatically gives 3 stars");

console.log("PASS culture-gamification mutations");
