#!/usr/bin/env node
/**
 * TEST — validate:transfer-review (PED-112/113/114 / TEST-122)
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-transfer-review-"));
const failures = [];
const fail = (m) => failures.push(m);

const REQUIRED_IDS = [
  "foundation_transfer",
  "daily_life_transfer",
  "city_transfer",
  "shopping_transfer",
  "communication_survival_transfer",
  "health_daily_transfer",
  "intermediate_transfer",
];

try {
  const program = ts.createProgram(["src/data/masteryCoverage.ts", "src/data/journey.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  });
  if (program.emit().emitSkipped) throw new Error("compile failed");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const masteryIds = new Set(ALL_LESSONS.filter((l) => l.masteryLoop).map((l) => l.id));

  const reviews = coverage.TRANSFER_REVIEWS;
  assert.ok(Array.isArray(reviews) && reviews.length >= 7, `esperava >=7 transfer reviews (tem ${reviews?.length})`);

  for (const id of REQUIRED_IDS) {
    const spec = reviews.find((r) => r.id === id);
    assert.ok(spec, `faltando transfer review ${id}`);
    assert.ok(spec.tasks?.length >= 4, `${id} deve ter >=4 tarefas`);

    const levels = new Set(spec.tasks.map((t) => t.level));
    for (const level of [1, 2, 3, 4]) {
      assert.ok(levels.has(level), `${id} deve cobrir nível ${level}`);
    }

    // Nenhuma tarefa deve citar "aula de" / origem da lição (PED-091).
    for (const task of spec.tasks) {
      const text = `${task.situationPt} ${task.answer}`;
      assert.ok(!/aula de|lição de|licao de/i.test(text), `${id}: tarefa revela origem — ${task.situationPt}`);
      assert.ok(Array.isArray(task.accepts) || Array.isArray(task.options), `${id}: tarefa sem accepts/options`);
    }

    for (const prereq of spec.prerequisiteLessonIds) {
      assert.ok(masteryIds.has(prereq), `${id}: pré-requisito ${prereq} ainda sem masteryLoop`);
    }
  }

  console.log(`OK validate:transfer-review — ${reviews.length} checkpoints; níveis 1–4; equivalências; pré-requisitos migrados`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL validate:transfer-review");
  for (const m of failures) console.error(" -", m);
  process.exit(1);
}
