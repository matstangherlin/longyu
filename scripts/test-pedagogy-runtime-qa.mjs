#!/usr/bin/env node
/**
 * PED-032 — Runtime QA: first 30 lessons × passes; detect bad patterns.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-prq-"));
const failures = [];

try {
  const program = ts.createProgram(
    ["src/features/lesson/lessonTasks.ts", "src/data/journey.ts", "src/data/hanziBuilder.ts"],
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

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
  const { getHanziBuilder, validateHanziBuilderIntegrity } = require(
    path.join(outDir, "src/data/hanziBuilder.js")
  );

  const sample = ALL_LESSONS.filter((l) => !l.isReview && !l.reviewMasteryMode).slice(0, 30);

  for (const lesson of sample) {
    for (const masteryLevel of [0, 1, 2, 3]) {
      if (!lesson.masteryLoop && masteryLevel > 0) continue;
      const plan = lessonRoundStepsFor(lesson, { masteryLevel, silent: true });
      for (let i = 2; i < plan.length; i += 1) {
        const trio = plan.slice(i - 2, i + 1);
        if (trio.every((s) => s.kind === trio[0].kind)) {
          // Labs/fundação podem concentrar um formato; hard-fail fora disso e sempre em hanzi_build.
          const kind = trio[0].kind;
          const foundationLab = String(lesson.id).startsWith("p1-") || lesson.skill === "concept";
          if (kind === "hanzi_build" || kind === "tone" || !foundationLab) {
            failures.push(`${lesson.id}@M${masteryLevel + 1}: 3× ${kind}`);
          }
        }
      }
      for (let i = 1; i < plan.length; i += 1) {
        if (plan[i].kind === "hanzi_build" && plan[i - 1].kind === "hanzi_build") {
          // Dedicated hanzi lessons may still pair — soft unless not hanzi-focused.
          if (lesson.skill !== "hanzi" && !String(lesson.id).includes("hanzi") && !String(lesson.id).includes("nv-zi")) {
            failures.push(`${lesson.id}@M${masteryLevel + 1}: consecutive hanzi_build`);
          }
        }
      }
      for (const step of plan) {
        if (step.kind === "hanzi_build" && step.builderId) {
          const builder = getHanziBuilder(step.builderId);
          if (builder) {
            for (const err of validateHanziBuilderIntegrity(builder)) {
              failures.push(`${lesson.id}: ${err}`);
            }
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error("Pedagogy runtime QA FAILED:");
    for (const f of failures.slice(0, 40)) console.error(" -", f);
    if (failures.length > 40) console.error(` … +${failures.length - 40} more`);
    process.exitCode = 1;
  } else {
    console.log(`Pedagogy runtime QA OK (${sample.length} lessons).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
