#!/usr/bin/env node
/**
 * TEST — validate:review-mastery (PED-104/105 / TEST-122)
 *
 * Garante que as 4 revisões especiais usam Review Mastery (não masteryLoop
 * de ensino) e que cada nível Recall→Mixed→Production→Transfer gera passos.
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-mastery-"));
const failures = [];
const fail = (m) => failures.push(m);

try {
  const program = ts.createProgram(
    ["src/data/reviewMastery.ts", "src/data/journey.ts", "src/data/masteryCoverage.ts"],
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
  if (program.emit().emitSkipped) throw new Error("compile failed");

  const review = require(path.join(outDir, "src/data/reviewMastery.js"));
  const { ALL_LESSONS, getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));

  assert.equal(review.REVIEW_MASTERY_LESSON_IDS.length, 4, "deve haver 4 review mastery lessons");

  for (const id of review.REVIEW_MASTERY_LESSON_IDS) {
    const lesson = getLesson(id);
    assert.ok(lesson, `${id} deve existir na Jornada`);
    assert.equal(lesson.reviewMasteryMode, true, `${id} deve ter reviewMasteryMode: true`);
    assert.notEqual(lesson.masteryLoop, true, `${id} NÃO deve ter masteryLoop de ensino`);

    const meta = coverage.getCoverageMeta(id);
    assert.equal(meta?.status, "review-special", `${id} permanece review-special na classificação`);

    for (const level of [1, 2, 3, 4]) {
      const steps = review.reviewMasteryStepsFor(id, level);
      assert.ok(steps.length >= 1, `${id} R${level} deve gerar passos`);
      const profile = review.reviewMasteryProfile(level);
      const discouraged = steps.filter((s) => profile.discouragedKinds.includes(s.kind));
      assert.equal(
        discouraged.length,
        0,
        `${id} R${level} não deve usar kinds desencorajados (${discouraged.map((s) => s.kind).join(",")})`
      );
    }
  }

  const flagged = ALL_LESSONS.filter((l) => l.reviewMasteryMode);
  assert.equal(flagged.length, 4, `exatamente 4 lições com reviewMasteryMode (tem ${flagged.length})`);

  console.log("OK validate:review-mastery — 4 reviews com Recall/Mixed/Production/Transfer; sem masteryLoop de ensino");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL validate:review-mastery");
  for (const m of failures) console.error(" -", m);
  process.exit(1);
}
