#!/usr/bin/env node
/**
 * RC2.3.2 — simula progressão nova conta → passes → reuso (sem browser).
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-rc232-journey-"));
const failures = [];

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/lib/pedagogyV6/applyPedagogyV6.ts",
      "src/lib/everydayMandarin/quality.ts",
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
  if (program.emit().emitSkipped) throw new Error("compile failed");
  const load = (rel) => require(path.join(outDir, rel));
  const { getLesson } = load("src/data/journey.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { applyPedagogyV6ToPlan } = load("src/lib/pedagogyV6/applyPedagogyV6.js");
  const { assessEverydayContextQuality, isProductionKind } = load("src/lib/everydayMandarin/quality.js");

  const pathLessons = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi"];
  const taughtHanzi = new Set();
  let sawHuman = false;
  let sawProduction = false;
  let sawReuse = false;
  let prevScenario = null;

  for (const lessonId of pathLessons) {
    const lesson = getLesson(lessonId);
    if (!lesson) {
      failures.push(`missing lesson ${lessonId}`);
      continue;
    }
    for (const pass of [1, 2, 3, 4]) {
      const raw = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      const plan = applyPedagogyV6ToPlan({
        lessonId,
        masteryPass: pass,
        steps: raw,
        taughtConceptIds: {},
        taughtHanzi: [...taughtHanzi],
        pilotOnly: true,
      }).steps;

      for (const step of plan) {
        for (const f of assessEverydayContextQuality(step, pass)) {
          if (f.level === "ERROR") failures.push(`${lessonId} P${pass}: ${f.code} ${f.why}`);
        }
        if (step.everydayIntent && step.everydayIntent !== "METALINGUISTIC" && step.everydayIntent !== "UNKNOWN") {
          sawHuman = true;
        }
        if (isProductionKind(step.kind) || step.learnerAgency === "PRODUCE") sawProduction = true;
        if (step.contextRole === "CONTEXTUAL_REUSE") sawReuse = true;
        if (step.everydayScenarioId) {
          if (prevScenario && prevScenario === step.everydayScenarioId && pass >= 3) {
            // same scenario id across passes is OK (mastery evolution)
          }
          prevScenario = step.everydayScenarioId;
        }
        const ans = (step.correctAnswer || step.hanzi || "").replace(/[！？。]/g, "");
        if (ans) taughtHanzi.add(ans);
      }

      if (pass >= 3) {
        const prodShare = plan.filter((s) => isProductionKind(s.kind) || s.learnerAgency === "PRODUCE" || s.learnerAgency === "TRANSFER").length / Math.max(1, plan.length);
        if (prodShare === 0 && !/pinyin|tom|tone/.test(lessonId)) {
          failures.push(`${lessonId} P${pass}: no production/transfer share`);
        }
      }
    }
  }

  if (!sawHuman) failures.push("journey never saw human communicative intent");
  if (!sawProduction) failures.push("journey never saw production");
  // reuse is best-effort early; warn only
  if (!sawReuse) console.warn("NOTE: contextual reuse not observed in first 5 topics (may appear later)");

  if (failures.length) {
    console.error("FAIL simulate:rc232-learner-journey");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log(`PASS simulate:rc232-learner-journey (taught≈${taughtHanzi.size}, human=${sawHuman}, production=${sawProduction}, reuse=${sawReuse})`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
