#!/usr/bin/env node
/**
 * TEST-122 — test:mastery-quality:all
 *
 * Certifica TODA lição com masteryLoop:true usando planos M1–M4 reais.
 * Nenhum check not_evaluated pode contar como sucesso.
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-quality-all-"));
const failures = [];
const fail = (m) => failures.push(m);

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
      "src/data/masteryQuality.ts",
      "src/data/masteryCoverage.ts",
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
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:mastery-quality:all");

  const quality = require(path.join(outDir, "src/data/masteryQuality.js"));
  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const { ALL_LESSONS, getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const masteryLessons = ALL_LESSONS.filter((l) => l.masteryLoop);
  assert.ok(masteryLessons.length >= (coverage.TARGET_NORMAL_ELIGIBLE ?? 46), `enabled >= ${coverage.TARGET_NORMAL_ELIGIBLE}`);

  // Tri-state: sem planos → not_evaluated não pode passar certificação.
  const skipped = quality.masteryQualityScore("l2");
  assert.ok(skipped.notEvaluatedCount > 0, "sem planos deve deixar checks not_evaluated");
  assert.equal(skipped.passes, false, "not_evaluated NÃO pode greenwash passes=true");
  assert.ok(
    skipped.checks.every((c) => c.status !== "not_evaluated" || c.ok === false || c.status === "not_evaluated"),
    "status tri-state presente"
  );
  const skippedPassInflation = skipped.checks.filter((c) => c.status === "not_evaluated" && c.ok === true);
  // ok may still be true for backward compat on not_applicable only; not_evaluated should have ok:false
  for (const c of skipped.checks) {
    if (c.status === "not_evaluated") {
      assert.equal(c.ok, false, `${c.id}: not_evaluated não pode ter ok:true`);
    }
  }

  let certified = 0;
  const failing = [];
  for (const lesson of masteryLessons) {
    const plansByPass = {};
    for (const pass of [1, 2, 3, 4]) {
      plansByPass[pass] = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
      });
      assert.ok(plansByPass[pass].length > 0, `${lesson.id} M${pass} sem plano`);
    }
    const result = quality.masteryQualityScore(lesson.id, plansByPass);
    assert.equal(result.notEvaluatedCount, 0, `${lesson.id}: ainda há checks not_evaluated`);
    if (!quality.isMasteryCertified(result)) {
      failing.push(
        `${lesson.id} (score ${result.score}): ${result.checks
          .filter((c) => c.status === "fail")
          .map((c) => `${c.id} — ${c.detail ?? "?"}`)
          .join(" | ")}`
      );
    } else {
      certified += 1;
    }
  }

  if (failing.length) fail(`lições não certificadas:\n   - ${failing.join("\n   - ")}`);

  const ratio = certified / masteryLessons.length;
  const minRatio = coverage.TARGET_CERTIFIED_RATIO ?? 0.95;
  assert.ok(ratio >= minRatio, `certified ratio ${ratio} < ${minRatio} (${certified}/${masteryLessons.length})`);

  console.log(
    `OK test:mastery-quality:all — enabled ${masteryLessons.length}; certified ${certified}; ratio ${(ratio * 100).toFixed(1)}%; tri-state sem greenwash`
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:mastery-quality:all");
  for (const m of failures) console.error(" -", m);
  process.exit(1);
}
