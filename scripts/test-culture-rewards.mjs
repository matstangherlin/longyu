import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureRewards } from "./lib/v498a2-gates.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureRewards(base).failures, [], "rewards positive");

function kill(label, edit, code) {
  const data = cloneCultureRuntime(base);
  edit(data);
  const failures = validateCultureRewards(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived; ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

kill("7 culture victory without XP chip", (data) => {
  data.lessonPlayerSource = data.lessonPlayerSource.replace(/culture-xp/g, "culture-no-xp");
}, "NO_REWARD");

kill("8 replay grants XP", (data) => {
  data.storeSource = data.storeSource.replace(/grantXp: false/g, "grantXp: true");
}, "REPLAY_XP");

kill("9 culture XP skips league key", (data) => {
  data.lessonPlayerSource = data.lessonPlayerSource.replace(/leagueXpKeyLesson/g, "otherXpKey");
}, "LEAGUE_XP");

console.log("PASS test:culture-rewards");
