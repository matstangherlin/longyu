/**
 * test:lesson-perf — PERF-011 source guards.
 * Asserts performance marks are wired and LessonPlayer does not hide
 * adaptive planning behind a fake setTimeout freeze.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const perfLib = await readFile(path.join(rootDir, "src/lib/lessonPerf.ts"), "utf8");
const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
const detail = await readFile(path.join(rootDir, "src/features/lesson/LessonDetailPage.tsx"), "utf8");
const tasks = await readFile(path.join(rootDir, "src/features/lesson/lessonTasks.ts"), "utf8");

const MARKS = [
  "lesson_start_click",
  "lesson_route_mounted",
  "lesson_data_ready",
  "lesson_first_activity_painted",
  "lesson_interactive",
];

for (const mark of MARKS) {
  assert(perfLib.includes(`"${mark}"`) || perfLib.includes(`'${mark}'`), `lessonPerf define mark ${mark}`);
}

assert(/isLessonPerfEnabled/.test(perfLib), "isLessonPerfEnabled");
assert(/markLessonPerf/.test(perfLib), "markLessonPerf");
assert(/measureLessonPerf/.test(perfLib), "measureLessonPerf");
assert(/observeLessonLongTasks/.test(perfLib), "observeLessonLongTasks");
assert(/longyu_lesson_perf/.test(perfLib), "localStorage flag key");
assert(/VITE_LESSON_PERF/.test(perfLib), "VITE_LESSON_PERF");

assert(/LESSON_PERF_MARKS\.startClick|lesson_start_click/.test(detail), "DetailPage marks start click");
assert(/prewarmLessonPlanner/.test(detail), "DetailPage prewarms planner");
assert(/prewarmLessonPlanner/.test(tasks), "lessonTasks exports prewarmLessonPlanner");

assert(/LESSON_PERF_MARKS\.routeMounted|lesson_route_mounted/.test(player), "Player marks route mounted");
assert(/LESSON_PERF_MARKS\.dataReady|lesson_data_ready/.test(player), "Player marks data ready");
assert(/lesson_first_activity_painted|firstActivityPainted/.test(player), "Player marks first paint");
assert(/lesson_interactive|LESSON_PERF_MARKS\.interactive/.test(player), "Player marks interactive");
assert(/startTransition/.test(player), "Player defers plan with startTransition");
assert(/planReady/.test(player), "Player tracks planReady");
assert(/sessionPlanRef/.test(player), "Player locks adaptive plan for the session (sessionPlanRef)");
assert(/planNonce/.test(player), "Player can unlock the session plan via planNonce (retry)");
assert(
  /locked\.lessonId === (?:foundLesson|lesson)\.id && locked\.nonce === planNonce/.test(player),
  "session plan lock early-returns when lesson+nonce match"
);
assert(player.includes("player.preparing"), "Player shows preparing copy while planning");

// No fake setTimeout wrapping lessonRoundStepsFor to hide freeze.
assert(
  !/setTimeout\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>[\s\S]{0,400}lessonRoundStepsFor/.test(player),
  "adaptive path must not defer lessonRoundStepsFor via setTimeout"
);
assert(
  !/setTimeout\s*\(\s*function[\s\S]{0,400}lessonRoundStepsFor/.test(player),
  "adaptive path must not use setTimeout(function…lessonRoundStepsFor)"
);

if (failures.length) {
  console.error("FAIL test:lesson-perf:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:lesson-perf (markers + startTransition deferral, no setTimeout freeze).");
