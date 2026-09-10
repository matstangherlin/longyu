import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureContent } from "./lib/culture-content-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureContent(base).failures, [], "positive control must pass");

function fixture() {
  return cloneCultureRuntime(base);
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureContent(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("1 CultureItem without source", (data) => {
  data.items[0].sources = [];
}, "MISSING_SOURCE");

mutation("2 CultureItem without EN", (data) => {
  data.items[0].titleEn = "   ";
}, "MISSING_EN");

mutation("3 relatedLessonId does not exist", (data) => {
  data.items[0].relatedLessonIds = ["lesson-that-does-not-exist"];
}, "UNKNOWN_LESSON");

mutation("4 duplicate id", (data) => {
  data.items.push({ ...data.items[0] });
}, "DUPLICATE_ID");

mutation("5 CultureItem without scope", (data) => {
  data.items[0].scope = "";
}, "MISSING_SCOPE");

mutation("6 CultureItem associated with missing lesson", (data) => {
  data.lessons.push({ id: "ghost-lesson", cultureItemId: "not-a-real-item" });
}, "UNKNOWN_CULTURE_ON_LESSON");

console.log("PASS culture-content mutations 1–6");
