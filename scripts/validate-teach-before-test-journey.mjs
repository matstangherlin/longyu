#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-journey-tbt-"));

try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/topicMastery.ts", "src/data/foundationTopicPlans.ts", "src/data/pedagogicalSpine.ts", "src/data/journeyOrchestrator.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false, jsx: ts.JsxEmit.ReactJSX }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));
  const journey = require(path.join(outDir, "src/data/journey.js"));
  const mastery = require(path.join(outDir, "src/data/topicMastery.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const nodes = require(path.join(outDir, "src/data/journeyOrchestrator.js"));

  const topics = journey.ALL_LESSONS.filter(mastery.isTopicMasteryLesson);
  const hardViolations = [];
  const warnings = [];
  for (const lessonId of plans.conceptFoundationLessonIds()) {
    for (const pass of [1, 2, 3, 4]) {
      const steps = plans.foundationAuthoredPlanFor(lessonId, pass) ?? [];
      for (const [index, step] of steps.entries()) {
        if (!step.pedagogicalEvidence) hardViolations.push(`${lessonId}/M${pass}/step${index + 1}:missing-evidence`);
        if (step.pedagogicalEvidence?.graded && !step.pedagogicalEvidence.knowledgeTargetIds?.length) {
          hardViolations.push(`${lessonId}/M${pass}/step${index + 1}:graded-without-target`);
        }
      }
    }
  }
  for (const lesson of topics) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      const isLexicalGrade = ["dialogue_choice", "contextual_choice", "comprehend", "listen_select", "recognize", "tone", "hanzi_build"].includes(step.kind);
      if (isLexicalGrade && !step.pedagogicalEvidence && !plans.hasFoundationAuthoredPlan(lesson.id)) {
        warnings.push(`${lesson.id}/step${index + 1}:inferred-lexical-target-needs-metadata`);
      }
    }
  }
  for (const node of nodes.JOURNEY_NODES.filter((item) => item.type !== "CORE_LESSON" && item.requiredKnowledgeTargetIds?.length)) {
    for (const target of node.requiredKnowledgeTargetIds) {
      if (!node.minimumKnowledgeStages?.[target]) hardViolations.push(`${node.id}:missing-readiness:${target}`);
    }
  }

  if (topics.length !== 113) hardViolations.push(`teaching-topic-count:${topics.length}`);
  if (hardViolations.length) {
    console.error(`FAIL validate:teach-before-test:journey — ${hardViolations.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:teach-before-test:journey — ${topics.length}/113 topics walked · high-confidence violations 0 · progressive metadata warnings ${warnings.length}.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
