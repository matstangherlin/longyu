#!/usr/bin/env node
/**
 * RC2.3.4 — geometry unit tests for handwriting acceptance.
 * Pure math — no pixel snapshots.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-hwg-"));

const files = [
  "src/lib/hanziWriting/gates.ts",
  "src/lib/hanziWriting/stages.ts",
  "src/lib/hanziWriting/types.ts",
  "src/lib/hanziWriting/references/verifiedWave1.ts",
  "src/lib/hanziWriting/handwritingReference.ts",
  "src/lib/hanziWriting/geometry.ts",
];

try {
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript emit failed for hanzi writing geometry");

  const { evaluateStrokeAttempt, evaluateCharacterAttempt, __geometryTestUtils } = require(
    path.join(outDir, "src/lib/hanziWriting/geometry.js")
  );
  const { handwritingReferenceFor, gradingSourcePolicy } = require(
    path.join(outDir, "src/lib/hanziWriting/handwritingReference.js")
  );

  const policy = gradingSourcePolicy();
  assert.equal(policy.gradingSource, "HANDWRITING_REFERENCE");
  assert.equal(policy.builderGeometry, "BUILDER_GEOMETRY_NOT_GRADING_SOURCE");

  const mu = handwritingReferenceFor("木");
  assert.ok(mu);
  assert.equal(mu.status, "VERIFIED");
  assert.equal(mu.source.geometrySource, "HANDWRITING_REFERENCE");
  assert.equal(mu.strokes.length, 4);

  // Perfect first stroke
  const s0 = evaluateStrokeAttempt(mu, 0, {
    points: [
      { x: 22, y: 36 },
      { x: 50, y: 36 },
      { x: 78, y: 36 },
    ],
  });
  assert.equal(s0.accepted, true, "perfect horizontal should accept");

  // Wrong start
  const badStart = evaluateStrokeAttempt(mu, 0, {
    points: [
      { x: 80, y: 80 },
      { x: 90, y: 90 },
    ],
  });
  assert.equal(badStart.accepted, false);
  assert.equal(badStart.category, "START_POSITION");

  // Wrong direction (vertical instead of horizontal for stroke 0)
  const badDir = evaluateStrokeAttempt(mu, 0, {
    points: [
      { x: 22, y: 36 },
      { x: 22, y: 90 },
    ],
  });
  assert.equal(badDir.accepted, false);
  assert.ok(badDir.category === "DIRECTION" || badDir.category === "END_POSITION" || badDir.category === "SHAPE");

  // Full character good path
  const good = evaluateCharacterAttempt(mu, [
    { points: [{ x: 22, y: 36 }, { x: 78, y: 36 }] },
    { points: [{ x: 50, y: 18 }, { x: 50, y: 86 }] },
    { points: [{ x: 50, y: 50 }, { x: 28, y: 82 }] },
    { points: [{ x: 50, y: 50 }, { x: 72, y: 82 }] },
  ]);
  assert.equal(good.complete, true);
  assert.ok(good.verdict === "Ótimo" || good.verdict === "Quase");

  // Missing stroke
  const missing = evaluateCharacterAttempt(mu, [
    { points: [{ x: 22, y: 36 }, { x: 78, y: 36 }] },
  ]);
  assert.equal(missing.complete, false);
  assert.ok(missing.strokeResults.some((r) => r.category === "MISSING_STROKE"));

  // Extra stroke
  const extra = evaluateCharacterAttempt(mu, [
    { points: [{ x: 22, y: 36 }, { x: 78, y: 36 }] },
    { points: [{ x: 50, y: 18 }, { x: 50, y: 86 }] },
    { points: [{ x: 50, y: 50 }, { x: 28, y: 82 }] },
    { points: [{ x: 50, y: 50 }, { x: 72, y: 82 }] },
    { points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] },
  ]);
  assert.ok(extra.strokeResults.some((r) => r.category === "EXTRA_STROKE"));

  // Wrong order detection: draw stroke 2 geometry as first attempt
  const wrongOrder = evaluateCharacterAttempt(mu, [
    { points: [{ x: 50, y: 50 }, { x: 28, y: 82 }] },
  ]);
  assert.equal(wrongOrder.complete, false);

  // Tolerance: slightly offset start still OK
  const soft = evaluateStrokeAttempt(mu, 0, {
    points: [
      { x: 22 + 10, y: 36 + 8 },
      { x: 78 + 5, y: 36 - 4 },
    ],
  });
  assert.equal(soft.accepted, true, "finger imprecision within tolerance");

  assert.ok(__geometryTestUtils.dist({ x: 0, y: 0 }, { x: 3, y: 4 }) === 5);

  console.log("PASS test-hanzi-writing-geometry");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
