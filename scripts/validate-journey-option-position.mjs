#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-journey-options-"));
const CHOICE_KINDS = new Set(["dialogue_choice", "contextual_choice", "comprehend", "listen_select", "image_choice", "recognize"]);

try {
  const program = ts.createProgram(
    ["src/lib/stableOptionPermutation.ts", "src/data/journey.ts", "src/data/foundationTopicPlans.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false, jsx: ts.JsxEmit.ReactJSX }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));
  const { stableOptionPermutation } = require(path.join(outDir, "src/lib/stableOptionPermutation.js"));
  const journey = require(path.join(outDir, "src/data/journey.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));

  const questions = [];
  for (const lesson of journey.ALL_LESSONS) {
    for (let index = 0; index < (lesson.steps ?? []).length; index += 1) {
      const step = lesson.steps[index];
      const answer = step.correctAnswer ?? step.answer ?? step.blankAnswer;
      if (CHOICE_KINDS.has(step.kind) && step.options?.length >= 2 && answer != null && step.options.includes(answer)) {
        questions.push({ id: `${lesson.id}:${index}`, options: step.options, answer });
      }
    }
  }
  for (const lessonId of plans.conceptFoundationLessonIds()) {
    for (const pass of [1, 2, 3, 4]) {
      for (const [index, step] of (plans.foundationAuthoredPlanFor(lessonId, pass) ?? []).entries()) {
        const answer = step.correctAnswer ?? step.answer ?? step.blankAnswer;
        if (CHOICE_KINDS.has(step.kind) && step.options?.length >= 2 && answer != null && step.options.includes(answer)) {
          questions.push({ id: `${lessonId}:m${pass}:${index}`, options: step.options, answer });
        }
      }
    }
  }

  const distributions = new Map();
  let stable = true;
  for (let session = 0; session < 100; session += 1) {
    for (const question of questions) {
      const seed = `session-${session}:${question.id}:attempt-1`;
      const first = stableOptionPermutation(question.options, seed, question.id);
      const second = stableOptionPermutation(question.options, seed, question.id);
      if (first.join("|") !== second.join("|")) stable = false;
      const key = question.options.length;
      const row = distributions.get(key) ?? Array.from({ length: key }, () => 0);
      row[first.indexOf(question.answer)] += 1;
      distributions.set(key, row);
    }
  }

  const concentrated = [...distributions.entries()].some(([optionCount, row]) => {
    const total = row.reduce((sum, value) => sum + value, 0);
    return optionCount >= 3 && row.some((value) => value / total < 0.14 || value / total > 0.42);
  });
  if (!questions.length || !stable || concentrated) {
    console.error(`FAIL validate:journey-option-position — questions=${questions.length} stable=${stable} distributions=${JSON.stringify([...distributions])}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:journey-option-position — ${questions.length} conventional choices · stable session order · distributions ${JSON.stringify(Object.fromEntries(distributions))}.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
