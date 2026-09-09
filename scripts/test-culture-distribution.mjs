import assert from "node:assert/strict";
import fs from "node:fs";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureDistribution } from "./lib/culture-distribution-validation.mjs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureDistribution(base).failures, [], "positive control must pass");

function fixture() {
  return structuredClone(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureDistribution(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("7 eligible unit with no culture", (data) => {
  const eligible = data.units.find((entry) => !data.ineligible[entry.unit.id]);
  const lessonIds = new Set(eligible.unit.lessons.map((lesson) => lesson.id));
  data.items = data.items.map((item) => ({
    ...item,
    relatedLessonIds: (item.relatedLessonIds ?? []).filter((id) => !lessonIds.has(id)),
  }));
}, "ELIGIBLE_UNIT_EMPTY");

const player = fs.readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
assert.match(player, /completeLesson\(lesson\.id\)/, "player still completes the lesson");
assert.match(player, /CultureTouchpoint/, "victory may show a culture touchpoint");
assert.match(
  player,
  /data-testid="topic-victory-return"/,
  "lesson continue remains independent of culture"
);
assert.match(
  player,
  /cultureTouchpointOpen/,
  "touchpoint can be dismissed without blocking the victory CTA"
);

const touchpoint = fs.readFileSync("src/features/culture/CultureTouchpoint.tsx", "utf8");
assert.match(
  touchpoint,
  /data-testid="culture-touchpoint"/,
  "touchpoint is addressable without replacing the primary continue control"
);
assert.match(touchpoint, /data-testid="culture-touchpoint-continue"/, "continue on the card is optional");

const { applyCultureComplete } = tsRequire("../../src/lib/cultureProgress.ts");
const completePatch = applyCultureComplete(["a"], ["b"], [], "host-insistence");
assert.deepEqual(Object.keys(completePatch).sort(), [
  "cultureCompletedIds",
  "cultureSavedIds",
  "cultureStartedIds",
]);
assert.ok(!("learnedChars" in completePatch));
assert.ok(!("srs" in completePatch));
assert.ok(!("hanziBuilderProgressByChar" in completePatch));
assert.ok(!("lessonMasteryById" in completePatch));
console.log("KILLED 9 culture complete does not touch Hanzi/SRS keys");

console.log("PASS culture-distribution mutations 7–9");
