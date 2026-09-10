import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureNativeLessons } from "./lib/culture-native-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureNativeLessons(base).failures, [], "positive control must pass");

function fixture() {
  return {
    ...base,
    nativeLessons: structuredClone(base.nativeLessons),
    lessons: structuredClone(base.lessons),
    items: structuredClone(base.items),
    hasEnglishOverlay: base.hasEnglishOverlay,
    isTopicMasteryLesson: base.isTopicMasteryLesson,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  data.hasEnglishOverlay = base.hasEnglishOverlay;
  data.isTopicMasteryLesson = base.isTopicMasteryLesson;
  edit(data);
  const failures = validateCultureNativeLessons(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("4 only MCQ remains", (data) => {
  for (const lesson of data.nativeLessons) {
    lesson.steps = (lesson.steps ?? []).map((step) =>
      STANDARD_TO_CHOICE(step)
    );
  }
}, "ONLY_MCQ");

function STANDARD_TO_CHOICE(step) {
  if (step.kind === "intro") return step;
  return {
    ...step,
    kind: "contextual_choice",
    options: step.options ?? ["a", "b", "c"],
    correctAnswer: step.correctAnswer ?? "a",
  };
}

mutation("5 fill/match/dialogue removed globally", (data) => {
  for (const lesson of data.nativeLessons) {
    lesson.steps = (lesson.steps ?? []).filter(
      (step) => step.kind !== "fill_blank" && step.kind !== "match_pairs" && step.kind !== "dialogue_choice"
    );
  }
}, "MISSING_ENGINE");

mutation("6 teach after test", (data) => {
  const lesson = data.nativeLessons[0];
  const intros = lesson.steps.filter((step) => step.kind === "intro");
  const rest = lesson.steps.filter((step) => step.kind !== "intro");
  lesson.steps = [...rest, ...intros];
}, "TEACH_AFTER_TEST");

mutation("12 story with no activity", (data) => {
  const lesson = data.nativeLessons[0];
  lesson.steps = lesson.steps.filter((step) => step.kind === "intro");
}, "STORY_NO_ACTIVITY");

mutation("13 EN missing", (data) => {
  data.hasEnglishOverlay = () => false;
  data.nativeLessons[0].steps[0].title = "Texto sem overlay de teste";
}, "MISSING_EN");

mutation("3 Hub/Journey id mismatch via domain leak into ALL_LESSONS", (data) => {
  data.lessons = [...data.lessons, data.nativeLessons[0]];
}, "TOPIC_COUNT");

console.log("PASS test:culture-native-lessons");
