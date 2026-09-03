#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v490-test-"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/journeyThemes.ts",
      "src/data/journeyOrchestrator.ts",
      "src/data/lessonCapsules.ts",
      "src/data/pedagogicalSpine.ts",
      "src/features/arcade/blitzEngine.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));

  const journey = require(path.join(outDir, "src/data/journey.js"));
  const mastery = require(path.join(outDir, "src/data/topicMastery.js"));
  const themes = require(path.join(outDir, "src/data/journeyThemes.js"));
  const nodes = require(path.join(outDir, "src/data/journeyOrchestrator.js"));
  const capsules = require(path.join(outDir, "src/data/lessonCapsules.js"));
  const blitz = require(path.join(outDir, "src/features/arcade/blitzEngine.js"));
  const chunks = require(path.join(outDir, "src/data/chunks.js"));
  const characters = require(path.join(outDir, "src/data/characters.js"));

  const teachingTopics = journey.ALL_LESSONS.filter(mastery.isTopicMasteryLesson);
  const themedTopicIds = themes.JOURNEY_THEMES.flatMap((theme) => theme.topicIds);
  check(teachingTopics.length === 113, `expected 113 teaching topics, got ${teachingTopics.length}`);
  check(new Set(themedTopicIds).size === teachingTopics.length, "every teaching topic must belong to exactly one theme");
  check(teachingTopics.every((lesson) => themedTopicIds.includes(lesson.id)), "theme metadata omitted a teaching topic");

  const nodeIds = nodes.JOURNEY_NODES.map((node) => node.id);
  check(new Set(nodeIds).size === nodeIds.length, "JourneyNode ids must be stable and unique");
  check(nodes.JOURNEY_NODES.filter((node) => node.type === "CORE_LESSON").length === journey.ALL_LESSONS.length, "core lessons must be referenced, not duplicated or dropped");
  check(nodes.PINYIN_CAPSULE_NODE.affectsCoreMastery === false, "capsule must not mutate core mastery");
  check(nodes.FOUNDATION_BLITZ_NODE.priority === "RECOMMENDED", "Blitz pilot must be recommended, not blocking");
  check(nodes.FOUNDATION_BLITZ_NODE.affectsCoreMastery === false, "Blitz must not grant core mastery");
  check(nodes.FOUNDATION_BLITZ_NODE.maxQuestions === 8, "Journey Blitz maxQuestions must be 8");
  check(nodes.FOUNDATION_BLITZ_NODE.timeLimitSeconds === 45, "Journey Blitz time limit must be 45 seconds");

  const capsule = capsules.PINYIN_FOUNDATION_CAPSULE;
  const pt = capsule.localized["pt-BR"].segments;
  const en = capsule.localized.en.segments;
  check(capsule.topicId === "p1-o-que-e-pinyin", "Pinyin capsule must retain the canonical topic id");
  check(pt.length === en.length && pt.every((segment, index) => segment.id === en[index]?.id), "PT/EN capsule pedagogy must be structurally identical");
  check(pt.map((segment) => segment.hanzi).filter(Boolean).join("|") === en.map((segment) => segment.hanzi).filter(Boolean).join("|"), "PT/EN capsule canonical Chinese drifted");

  const allowedChunkIds = new Set((nodes.FOUNDATION_BLITZ_NODE.allowedKnowledgeTargetIds ?? []).filter((id) => id.startsWith("chunk:")).map((id) => id.slice(6)));
  const allowedCharIds = new Set((nodes.FOUNDATION_BLITZ_NODE.allowedKnowledgeTargetIds ?? []).filter((id) => id.startsWith("char:")).map((id) => id.slice(5)));
  const deck = blitz.buildMandarinBlitzDeck(
    chunks.CHUNKS.filter((item) => allowedChunkIds.has(item.id)),
    characters.CHARACTERS.filter((item) => allowedCharIds.has(item.id)),
    "v490-contract"
  );
  check(deck.length > 0, "bounded Journey Blitz needs a playable taught-content deck");
  check(deck.every((question) => allowedChunkIds.has(question.sourceId) || allowedCharIds.has(question.sourceId)), "Blitz introduced a target outside the taught allowlist");
  check(blitz.reachedBlitzQuestionLimit(7, { timeLimitSeconds: 45, maxQuestions: 8 }) === false, "Blitz ended before maxQuestions");
  check(blitz.reachedBlitzQuestionLimit(8, { timeLimitSeconds: 45, maxQuestions: 8 }) === true, "Blitz did not end at maxQuestions");
  check(blitz.reachedBlitzQuestionLimit(100, { timeLimitSeconds: 60, maxQuestions: null }) === false, "standalone time-only modality was removed");

  const oldLessonIds = journey.ALL_LESSONS.map((lesson) => lesson.id);
  check(oldLessonIds.every((id) => nodes.JOURNEY_NODES.some((node) => node.id === `core:${id}` && node.sourceId === id)), "orchestration changed a canonical lesson id");

  if (failures.length) {
    console.error("FAIL test:v490-orchestration");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`PASS test:v490-orchestration — ${teachingTopics.length}/113 topics · ${themes.JOURNEY_THEMES.length} themes · ${nodeIds.length} stable nodes · capsule PT/EN parity · Blitz ${nodes.FOUNDATION_BLITZ_NODE.timeLimitSeconds}s/8.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
