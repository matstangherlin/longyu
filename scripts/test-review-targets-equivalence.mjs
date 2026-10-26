#!/usr/bin/env node
/**
 * A extração de reviewTargetsForMistake cobre todas as etapas de runtime.
 * O digest trava o comportamento: mudar a regra muda o hash.
 */
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-targets-"));
const program = ts.createProgram(["src/data/journey.ts", "src/features/lesson/lessonTasks.ts", "src/features/lesson/reviewTargets.ts"], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: root,
  outDir,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
});
if (program.emit().emitSkipped) {
  console.error("falha ao compilar reviewTargets");
  process.exit(1);
}
const load = (relative) => require(path.join(outDir, relative));
const { ALL_LESSONS } = load("src/data/journey.js");
const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
const { reviewTargetsForMistake, taughtRefsForLesson, SKILL_TRACK } = load("src/features/lesson/reviewTargets.js");

const hash = createHash("sha256");
let steps = 0;
for (const lesson of ALL_LESSONS) {
  const introduced = taughtRefsForLesson(lesson);
  const track = SKILL_TRACK[lesson.skill] ?? "fala";
  for (const pass of [1, 2, 3, 4]) {
    const plan = lessonRoundStepsFor(lesson, { masteryPass: pass }) ?? [];
    plan.forEach((step, index) => {
      const targets = reviewTargetsForMistake(step, track, introduced);
      assert.ok(Array.isArray(targets));
      hash.update(`${lesson.id}|${pass}|${index}|${step.kind}|`);
      hash.update(targets.map((item) => `${item.type}:${item.itemId}:${item.domain}:${item.track}`).join(","));
      hash.update("\n");
      steps += 1;
    });
  }
}
const digest = hash.digest("hex").slice(0, 16);
const expected = "05d656ecf10d3a1e";
assert.equal(digest, expected, `${steps} etapas`);
assert.equal(steps, 6018);
console.log(`test:review-targets-equivalence PASS ${steps} etapas ${digest}`);
