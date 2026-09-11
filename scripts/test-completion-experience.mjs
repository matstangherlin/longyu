#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import ts from "typescript";
import { validateCompletionExperience } from "./lib/v498b2-gates.mjs";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText,
    filename
  );

assert.equal(validateCompletionExperience().failures.length, 0, "positive control");

const { buildLessonCompletionSummary } = require("../src/features/lesson/buildLessonCompletionSummary.ts");
const { resolveVictoryContinuePath, nextCoreCultureAfterTopic } = require("../src/features/lesson/nextJourneyContinue.ts");
const perfect = buildLessonCompletionSummary({ accuracy: 100, errorCount: 0, displayName: "Ana" });
assert.equal(perfect.perfect, true);
assert.ok(!perfect.focus);
assert.match(perfect.greeting, /Ana/);
assert.equal(nextCoreCultureAfterTopic("l2")?.itemId, "greetings-nihao");
assert.match(
  resolveVictoryContinuePath({
    lessonId: "l2",
    isCultureLesson: false,
    search: new URLSearchParams("src=jornada"),
  }),
  /culture-greetings-nihao/
);
assert.equal(
  resolveVictoryContinuePath({
    lessonId: "l2",
    isCultureLesson: false,
    search: new URLSearchParams("src=jornada"),
    preferJourney: true,
  }),
  "/jornada"
);
assert.equal(
  resolveVictoryContinuePath({
    lessonId: "culture-greetings-nihao",
    isCultureLesson: true,
    search: new URLSearchParams("src=jornada"),
  }),
  "/jornada"
);

const focused = buildLessonCompletionSummary({
  accuracy: 70,
  errorCount: 2,
  mistakesBySkill: { tone: 2, hanzi: 1 },
});
assert.equal(focused.perfect, false);
assert.ok(focused.focus);

function killed(label, data, code) {
  const failures = validateCompletionExperience(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("Culture card on victory", { lessonVictorySource: `Na vida real\ndata-lesson-victory` }, "CULTURE_CARD");
killed("missions dashboard", { lessonVictorySource: `missionsUpdated\ndata-lesson-victory` }, "DASHBOARD");
killed("two primary CTAs", { lessonVictorySource: `data-victory-primary\ndata-victory-primary` }, "CTA_COUNT");
killed("8 metrics return", { lessonVictorySource: `leaveFeedback\nCollapsibleInfoCard\ndata-lesson-victory` }, "DASHBOARD");
killed("bottom nav + CTA", { lessonVictorySource: `player.navReview\ndata-lesson-victory` }, "BOTTOM_NAV");
killed("generic keep studying", { completionSummarySource: `Continue estudando!` }, "GENERIC_FOCUS");

console.log("PASS test:completion-experience");
