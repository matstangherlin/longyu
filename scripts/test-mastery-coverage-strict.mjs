#!/usr/bin/env node
/**
 * TEST-122 — test:mastery-coverage:strict
 *
 * Modo release: qualquer falha de compilação / planner / quality = FAIL.
 * Sem warnings convertidos em falso green.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-coverage-strict-"));
const failures = [];
const fail = (m) => failures.push(m);

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/masteryCoverage.ts",
      "src/data/masteryPilot.ts",
      "src/data/masteryQuality.ts",
      "src/data/reviewMastery.ts",
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("compilação falhou — strict mode não tolera");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const quality = require(path.join(outDir, "src/data/masteryQuality.js"));
  const review = require(path.join(outDir, "src/data/reviewMastery.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  assert.equal(typeof quality.masteryQualityScore, "function");
  assert.equal(typeof lessonRoundStepsFor, "function");

  const enabled = ALL_LESSONS.filter((l) => l.masteryLoop);
  const reviewMode = ALL_LESSONS.filter((l) => l.reviewMasteryMode);
  const later = coverage.listByStatus("later");

  assert.ok(enabled.length >= (coverage.TARGET_NORMAL_ELIGIBLE ?? 46), `Mastery enabled ${enabled.length} < ${coverage.TARGET_NORMAL_ELIGIBLE}`);
  assert.equal(later.length, 0, `ainda há candidatas later: ${later.map((m) => m.lessonId).join(", ")}`);
  assert.equal(reviewMode.length, coverage.TARGET_REVIEW_MASTERY ?? 4, "Review Mastery count");

  let certified = 0;
  for (const lesson of enabled) {
    const plansByPass = {};
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true });
      if (!plan?.length) throw new Error(`${lesson.id} M${pass}: plano vazio`);
      plansByPass[pass] = plan;
    }
    const result = quality.masteryQualityScore(lesson.id, plansByPass);
    if (result.notEvaluatedCount > 0) throw new Error(`${lesson.id}: not_evaluated > 0 no strict`);
    if (!quality.isMasteryCertified(result)) {
      throw new Error(
        `${lesson.id} não certificada: ${result.checks
          .filter((c) => c.status === "fail")
          .map((c) => c.id)
          .join(", ")}`
      );
    }
    certified += 1;
  }

  const ratio = certified / enabled.length;
  assert.ok(ratio >= (coverage.TARGET_CERTIFIED_RATIO ?? 0.95), `certified ratio ${ratio}`);

  // Intermediate category must be 100% among normal eligible
  const intermediate = coverage.MASTERY_LESSON_COVERAGE.filter((m) => m.category === "intermediate");
  const intermediateEnabled = intermediate.filter((m) => enabled.some((l) => l.id === m.lessonId));
  const intermediateLater = intermediate.filter((m) => m.status === "later");
  assert.equal(intermediateLater.length, 0, "intermediário ainda tem later");
  assert.equal(intermediateEnabled.length, intermediate.filter((m) => m.status !== "not-applicable").length);

  for (const id of review.REVIEW_MASTERY_LESSON_IDS) {
    assert.ok(reviewMode.some((l) => l.id === id), `${id} sem reviewMasteryMode`);
  }

  console.log(
    `OK test:mastery-coverage:strict — enabled ${enabled.length}; certified ${certified}; review ${reviewMode.length}; later 0; ratio ${(ratio * 100).toFixed(1)}%`
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:mastery-coverage:strict");
  for (const m of failures) console.error(" -", m);
  process.exit(1);
}
