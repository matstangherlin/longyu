#!/usr/bin/env node
/**
 * RC2.3.3 — lightweight automated checks for Culture Moment / Deep Dive / return path.
 */

import assert from "node:assert/strict";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const { stepsForCultureMode, cultureModeFromQuery, estimatedMinutesForMode } = tsRequire(
  "../../src/lib/cultureDeep/modes.ts"
);
const { getCultureMission } = tsRequire("../../src/data/cultureMissions.ts");
const { cultureLessonPlayerPath } = tsRequire("../../src/data/cultureNative.ts");
const { cultureReturnPath } = tsRequire("../../src/features/lesson/nextJourneyContinue.ts");
const { CULTURE_FLAGSHIP_ITEM_IDS } = tsRequire("../../src/data/cultureQuest.ts");
const mastery = tsRequire("../../src/lib/cultureMastery.ts");

const visiting = getCultureMission("visiting-home");
assert.ok(visiting, "visiting-home mission");
const momentSteps = stepsForCultureMode(visiting, "journey");
const deepSteps = stepsForCultureMode(visiting, "deep");
assert.ok(momentSteps.length < deepSteps.length, "moment shorter than deep");
assert.ok(momentSteps.some((s) => s.kind === "story"), "moment has story");
assert.ok(
  momentSteps.some((s) => s.kind === "scenario_choice" || s.kind === "dialogue_choice"),
  "moment has decision"
);
assert.equal(cultureModeFromQuery("?src=jornada&gate=gate-social-etiquette"), "journey");
assert.equal(cultureModeFromQuery("?src=cultura"), "deep");
assert.ok(estimatedMinutesForMode(visiting, "journey") <= 3);

const path = cultureLessonPlayerPath("visiting-home", "?src=jornada&gate=gate-social-etiquette");
assert.match(path, /mode=journey/);
assert.match(path, /gate=gate-social-etiquette/);

const ret = cultureReturnPath(
  new URLSearchParams("src=jornada&from=/jornada&gate=gate-urban-china"),
  true
);
assert.equal(ret, "/jornada?gate=gate-urban-china&cultureDone=1");

// Mastery: teach-only (scoredCount 0) cannot jump to mastered
function blankMaps() {
  return {
    cultureMasteryById: {},
    cultureMemoryById: {},
    cultureKnowledgeById: {},
    cultureSeals: [],
    cultureCompletedIds: [],
    cultureSavedIds: [],
    cultureStartedIds: [],
  };
}

let maps = blankMaps();
maps = mastery.applyCultureMissionComplete(maps, {
  itemId: "visiting-home",
  score: 1,
  memoryCorrect: true,
  scoredCount: 0,
  correctCount: 0,
});
const know = maps.cultureKnowledgeById[Object.keys(maps.cultureKnowledgeById)[0]];
assert.notEqual(know?.state, "mastered", "scoredCount 0 must not master");

const done = mastery.applyCultureMissionComplete(blankMaps(), {
  itemId: "visiting-home",
  score: 0.9,
  memoryCorrect: true,
  scoredCount: 3,
  correctCount: 3,
});
const know2 = done.cultureKnowledgeById[Object.keys(done.cultureKnowledgeById)[0]];
assert.equal(know2?.state, "mastered");

assert.equal(CULTURE_FLAGSHIP_ITEM_IDS.length, 9);

console.log("PASS test:culture-deep-flow");
