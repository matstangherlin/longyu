import assert from "node:assert/strict";
import fs from "node:fs";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureMissions } from "./lib/culture-missions-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureMissions(base).failures, [], "positive control must pass");

function fixture() {
  const { isCultureStepScored, ...rest } = base;
  return { ...structuredClone(rest), isCultureStepScored };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureMissions(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 CultureItem without mission", (data) => {
  data.missions = data.missions.filter((mission) => mission.cultureItemId !== data.items[0].id);
}, "MISSING_MISSION");

mutation("2 mission with only text and zero task", (data) => {
  data.missions[0].steps = [{ id: "text", kind: "story", scored: false, body: { pt: "x", en: "x" } }];
  data.missions[0].memoryTargets = data.missions[0].memoryTargets ?? [{ id: "keep", concept: { pt: "c", en: "c" }, prompt: { pt: "p", en: "p" }, reviewVariants: [{}] }];
}, "NO_TASKS");

mutation("3 mission without memory target", (data) => {
  data.missions[0].memoryTargets = [];
}, "NO_MEMORY");

mutation("4 flagship story without decision", (data) => {
  const flagship = data.missions.find((mission) => mission.flagship) ?? data.missions[0];
  flagship.flagship = true;
  flagship.steps = flagship.steps.filter((step) => step.kind === "story" || step.kind === "culture_summary" || step.kind === "culture_recall");
  if (!flagship.steps.some((step) => step.kind === "story")) {
    flagship.steps.unshift({ id: "story-only", kind: "story", beats: [{ id: "b", text: { pt: "a", en: "a" } }] });
  }
}, "FLAGSHIP_NO_DECISION");

mutation("10 CultureMission without EN", (data) => {
  data.missions[0].titleEn = "   ";
}, "MISSING_EN");

const itemPage = fs.readFileSync("src/features/culture/CultureItemPage.tsx", "utf8");
assert.match(itemPage, /CultureMissionPlayer/, "related lesson must open the mission player, not the old article page");
const touchpoint = fs.readFileSync("src/features/culture/CultureTouchpoint.tsx", "utf8");
assert.match(touchpoint, /\/cultura\/\$\{item\.id\}/, "touchpoint still routes to /cultura/:id");
assert.doesNotMatch(touchpoint, /sectionSituation/, "touchpoint does not send the learner into a static article body");
console.log("KILLED 11 related lesson opens article instead of mission: route");

console.log("PASS culture-missions mutations");
