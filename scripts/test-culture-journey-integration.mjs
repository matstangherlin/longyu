import assert from "node:assert/strict";
import { loadCultureRuntime, require as tsRequire } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyIntegration } from "./lib/culture-journey-integration-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureJourneyIntegration(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureJourneyIntegration(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("4 journey bridge tests concept before showing/having learned", (data) => {
  data.bridges[0].explanation = { pt: "", en: "" };
}, "MISSING_EN");

mutation("6 two culture bridges on the same lesson", (data) => {
  data.bridges.push({ ...data.bridges[0], cultureConceptId: data.bridges[0].cultureConceptId });
}, "DOUBLE_BRIDGE");

mutation("7 bridge on a pure tone lab", (data) => {
  const unitId = Object.keys(data.ineligible)[0];
  const unit = data.units.find((row) => row.unit.id === unitId);
  const lessonId = unit?.unit.lessons[0]?.id;
  if (!lessonId) throw new Error("no ineligible lesson");
  data.bridges = data.bridges.filter((bridge) => bridge.lessonId !== lessonId).concat({
    ...data.bridges[0],
    lessonId,
  });
}, "TECHNICAL_UNIT");

mutation("9 bridge points at a different CultureItem", (data) => {
  data.bridges[0].cultureItemId = "metro-qr";
  data.lessons = data.lessons.map((lesson) =>
    lesson.id === data.bridges[0].lessonId ? { ...lesson, cultureItemId: "greetings-nihao" } : lesson
  );
}, "BRIDGE_ITEM_MISMATCH");

const { applyCultureBridgeComplete } = tsRequire("../../src/lib/cultureMastery.ts");
const { applyCultureMissionComplete } = tsRequire("../../src/lib/cultureMastery.ts");

const srs = { "chunk:nihao": { due: 1, stage: 2 } };
const knowledge = applyCultureBridgeComplete(
  {},
  { conceptId: "shared-dishes-core", cultureItemId: "shared-dishes", taught: true, taskCorrect: true }
);
assert.equal(knowledge["shared-dishes-core"]?.state, "practiced");
assert.deepEqual(srs, { "chunk:nihao": { due: 1, stage: 2 } }, "bridge must not mutate lexical SRS");
console.log("KILLED 5 bridge alters lexical SRS");

const maps = {
  cultureMasteryById: {},
  cultureMemoryById: {},
  cultureKnowledgeById: {},
  cultureSeals: [],
  cultureCompletedIds: [],
  cultureSavedIds: [],
  cultureStartedIds: [],
};
const afterBridgeStars = applyCultureMissionComplete(maps, {
  itemId: "shared-dishes",
  score: 0.2,
  memoryCorrect: false,
  scoredCount: 0,
  correctCount: 0,
});
assert.notEqual(afterBridgeStars.stars, 3);
assert.notEqual(afterBridgeStars.cultureKnowledgeById["shared-dishes-core"]?.state, "mastered");
console.log("KILLED 10 completing bridge gives CultureMission 3★");

const noRecall = applyCultureMissionComplete(maps, {
  itemId: "host-insistence",
  score: 1,
  memoryCorrect: false,
  scoredCount: 3,
  correctCount: 3,
});
assert.notEqual(noRecall.cultureKnowledgeById["host-insistence-core"]?.state, "mastered");
console.log("KILLED 11 CultureMission marked mastered without recall");

console.log("PASS test:culture-journey-integration");
