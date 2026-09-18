/**
 * Validate Journey Culture Moments registry (presentation only).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );

const root = process.cwd();
const {
  JOURNEY_CULTURE_MOMENTS,
  JOURNEY_CULTURE_MOMENT_MAX,
  cultureMomentsAfterTopic,
} = require("../src/data/journeyCultureMoments.ts");
const { CULTURE_ITEMS } = require("../src/data/culture.ts");
const { CULTURE_JOURNEY_PLACEMENT, CULTURE_HUB_ONLY_ITEM_IDS } = require("../src/data/cultureNative.ts");
const { JOURNEY_NODES } = require("../src/data/journeyOrchestrator.ts");
const { ALL_LESSONS } = require("../src/data/journey.ts");
const { CURRICULUM_SOURCES } = require("./lib/report-meta.mjs");

const itemIds = new Set(CULTURE_ITEMS.map((item) => item.id));
const topicIds = new Set(ALL_LESSONS.map((lesson) => lesson.id));
const hubOnly = new Set(CULTURE_HUB_ONLY_ITEM_IDS);
const journeyCultureItemIds = new Set(CULTURE_JOURNEY_PLACEMENT.map((row) => row.itemId));

const failures = [];

function fail(code, detail) {
  failures.push({ code, detail });
}

if (JOURNEY_CULTURE_MOMENTS.length < 4 || JOURNEY_CULTURE_MOMENTS.length > JOURNEY_CULTURE_MOMENT_MAX) {
  fail("COUNT", `expected 4–${JOURNEY_CULTURE_MOMENT_MAX} moments, got ${JOURNEY_CULTURE_MOMENTS.length}`);
}

const seenIds = new Set();
const seenItems = new Set();
for (const moment of JOURNEY_CULTURE_MOMENTS) {
  if (!moment.id || seenIds.has(moment.id)) fail("DUPLICATE_ID", moment.id);
  seenIds.add(moment.id);
  if (!moment.cultureItemId || seenItems.has(moment.cultureItemId)) {
    fail("DUPLICATE_ITEM", moment.cultureItemId);
  }
  seenItems.add(moment.cultureItemId);
  if (!itemIds.has(moment.cultureItemId)) fail("MISSING_ITEM", moment.cultureItemId);
  if (!topicIds.has(moment.afterTopicId)) fail("BAD_ANCHOR", `${moment.id} after ${moment.afterTopicId}`);
  if (moment.optional !== true) fail("NOT_OPTIONAL", moment.id);
  if (!hubOnly.has(moment.cultureItemId) && journeyCultureItemIds.has(moment.cultureItemId)) {
    // Allowed only if we intentionally dual-surface; default wave should prefer hub-only.
    fail("ALREADY_JOURNEY_NODE", moment.cultureItemId);
  }
  const item = CULTURE_ITEMS.find((entry) => entry.id === moment.cultureItemId);
  if (moment.cultureItemId === "sun-wukong" && item?.kind !== "literature") {
    fail("WUKONG_KIND", item?.kind);
  }
  if (moment.cultureItemId === "chinese-dragon" && item?.kind !== "symbol") {
    fail("DRAGON_KIND", item?.kind);
  }
  if (moment.cultureItemId === "china-history-timeline" && item?.kind !== "history") {
    fail("TIMELINE_KIND", item?.kind);
  }
}

// Moments must NOT inflate JOURNEY_NODES culture count
const cultureNodes = JOURNEY_NODES.filter((node) => node.type === "CULTURE_LESSON");
if (cultureNodes.length !== 20) {
  fail("JOURNEY_NODE_COUNT", `expected 20 CULTURE_LESSON nodes, got ${cultureNodes.length}`);
}

// Registry must not be listed as curriculum source
if (CURRICULUM_SOURCES.some((rel) => rel.includes("journeyCultureMoments"))) {
  fail("CURRICULUM_SOURCE_LEAK", "journeyCultureMoments must stay out of CURRICULUM_SOURCES");
}

// JourneyPage must render moments without loading all culture lessons eagerly
const journeyPage = fs.readFileSync(path.join(root, "src/features/journey/JourneyPage.tsx"), "utf8");
assert.match(journeyPage, /JourneyCultureMomentCard|cultureMomentsAfterTopic/, "JourneyPage must render moments");
assert.doesNotMatch(
  journeyPage,
  /CULTURE_NATIVE_LESSONS/,
  "JourneyPage must not import full CULTURE_NATIVE_LESSONS"
);

const card = fs.readFileSync(path.join(root, "src/features/journey/JourneyCultureMomentCard.tsx"), "utf8");
assert.doesNotMatch(card, /JourneyCultureQuiz/, "must not create JourneyCultureQuiz");
assert.match(card, /cultureLessonPlayerPath/, "must open canonical culture lesson");

if (failures.length) {
  console.error("FAIL validate:journey-culture-moments", failures);
  process.exit(1);
}

// smoke: anchors resolve
assert.ok(cultureMomentsAfterTopic("l25").some((m) => m.cultureItemId === "lantern-festival"));
assert.ok(cultureMomentsAfterTopic("l9").some((m) => m.cultureItemId === "sun-wukong"));

console.log(
  `PASS validate:journey-culture-moments — ${JOURNEY_CULTURE_MOMENTS.length} moments · ${cultureNodes.length} journey culture nodes`
);
