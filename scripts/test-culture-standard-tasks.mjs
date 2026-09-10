import assert from "node:assert/strict";
import { loadCultureRuntime, require as tsRequire } from "./lib/v495a-runtime.mjs";
import { validateCultureStandardTasks } from "./lib/culture-native-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureStandardTasks(base).failures, [], "positive control must pass");

function fixture() {
  return {
    ...base,
    nativeLessons: structuredClone(base.nativeLessons),
    lessonPlayerSource: base.lessonPlayerSource,
    storeSource: base.storeSource,
    cultureItemPageSource: base.cultureItemPageSource,
    cultureHubSource: base.cultureHubSource,
    cultureReviewSource: base.cultureReviewSource,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureStandardTasks(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 Hub opens MissionPlayer", (data) => {
  data.cultureItemPageSource = 'export { CultureMissionPlayer as CultureItemPage } from "./CultureMissionPlayer";\n';
}, "HUB_MISSION_PLAYER");

mutation("16 save for later in player", (data) => {
  data.lessonPlayerSource = `${data.lessonPlayerSource}\n<button data-testid="culture-save">Salvar para depois</button>\n`;
}, "SAVE_IN_PLAYER");

mutation("17 fake review sequence overlay", (data) => {
  data.cultureReviewSource = `${data.cultureReviewSource}\n<button data-testid="culture-seq-open">x</button>\n`;
}, "FAKE_SEQUENCE");

mutation("8 replay perfect XP", (data) => {
  data.storeSource = data.storeSource.replace(/grantXp: false/g, "grantXp: true");
}, "REPLAY_XP");

mutation("10 lexical SRS leak", (data) => {
  data.lessonPlayerSource = data.lessonPlayerSource.replace(/isCultureDomain/g, "neverCulture");
}, "SRS_LEAK");

mutation("11 migration wipes mastery", (data) => {
  data.storeSource += "\nconst wiped = migrateNativeCultureProgress(state); cultureMasteryById: {}\n";
}, "MIGRATION_WIPES_MASTERY");

const { migrateNativeCultureProgress } = tsRequire("../../src/data/cultureNative.ts");
const synced = migrateNativeCultureProgress({
  completedLessons: ["l2"],
  cultureCompletedIds: ["metro-qr"],
});
assert.ok(synced.completedLessons.includes("culture-metro-qr"));
assert.ok(synced.cultureCompletedIds.includes("metro-qr"));
const reverse = migrateNativeCultureProgress({
  completedLessons: ["culture-digital-pay"],
  cultureCompletedIds: [],
});
assert.ok(reverse.cultureCompletedIds.includes("digital-pay"));
console.log("KILLED 9 Hub/Journey sync both ways");

const mastery = { "metro-qr": { stars: 3, completed: true } };
const after = migrateNativeCultureProgress({
  completedLessons: [],
  cultureCompletedIds: ["metro-qr"],
});
assert.equal(mastery["metro-qr"].stars, 3);
assert.ok(after.completedLessons.includes("culture-metro-qr"));
console.log("KILLED 11 migration keeps mastery maps");

console.log("PASS test:culture-standard-tasks");
