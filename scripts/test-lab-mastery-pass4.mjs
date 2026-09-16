#!/usr/bin/env node
/**
 * Regression: perception/hanzi labs must reach MASTERED (4/4) after Domínio.
 *
 * Bug: advanceLessonMastery clamped Pass 4 to level 3 when the session had no
 * production/transfer kind. Labs never ship those kinds, so "1º tom com ma"
 * (and siblings) stayed on Continuar / Progresso do tema 3/4 forever.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lab-pass4-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/curriculumRole.ts",
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
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:lab-mastery-pass4");

  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const role = require(path.join(outDir, "src/data/curriculumRole.js"));
  const { ALL_LESSONS, getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  assert.equal(role.isLabCurriculumRole("perception_lab"), true);
  assert.equal(role.isLabCurriculumRole("hanzi_lab"), true);
  assert.equal(role.isLabCurriculumRole("acquisition"), false);
  assert.equal(
    role.requiresProductionOrTransferForMastery({ id: "p2-ma-primeiro-tom", curriculumRole: "perception_lab" }),
    false,
    "lab de tom não exige produção no Domínio"
  );
  assert.equal(
    role.requiresProductionOrTransferForMastery({ id: "l2", curriculumRole: "acquisition" }),
    true,
    "aquisição ainda exige produção/transfer no Domínio"
  );

  // Acquisition without production still clamps (gate preserved).
  const clamped = mastery.advanceLessonMastery({
    current: { level: 3, passCount: 3, lastPass: 3, updatedAt: 1 },
    pass: 4,
    accuracy: 1,
    mistakeCount: 0,
    hadProductionOrTransfer: false,
    requireProductionOrTransfer: true,
    allowSkipAhead: false,
    commitPass: true,
  });
  assert.equal(clamped.record.level, 3, "aquisição sem produção permanece em 3/4");

  const labOk = mastery.advanceLessonMastery({
    current: { level: 3, passCount: 3, lastPass: 3, updatedAt: 1 },
    pass: 4,
    accuracy: 1,
    mistakeCount: 0,
    hadProductionOrTransfer: false,
    requireProductionOrTransfer: false,
    allowSkipAhead: false,
    commitPass: true,
  });
  assert.equal(labOk.record.level, 4, "lab sem produção chega a 4/4 no Domínio");

  const stuck = [];
  const freed = [];
  for (const lesson of ALL_LESSONS) {
    if (lesson.isReview || lesson.reviewMasteryMode || lesson.lessonDomain === "culture") continue;
    const full = getLesson(lesson.id) ?? lesson;
    const curriculumRole = full.curriculumRole ?? role.inferCurriculumRole(full);
    if (!role.isLabCurriculumRole(curriculumRole)) continue;

    let plan4 = [];
    try {
      plan4 = lessonRoundStepsFor(full, { masteryPass: 4, masteryMode: true }) ?? [];
    } catch (error) {
      stuck.push(`${lesson.id}: plano Pass 4 falhou (${error instanceof Error ? error.message : error})`);
      continue;
    }
    const hasProd = plan4.some((step) => mastery.isProductionOrTransferKind(step.kind));
    const requireProd = role.requiresProductionOrTransferForMastery(full);
    const advanced = mastery.advanceLessonMastery({
      current: { level: 3, passCount: 3, lastPass: 3, updatedAt: 1 },
      pass: 4,
      accuracy: 1,
      mistakeCount: 0,
      hadProductionOrTransfer: hasProd,
      requireProductionOrTransfer: requireProd,
      allowSkipAhead: false,
      commitPass: true,
    });
    if (advanced.record.level < 4) {
      stuck.push(
        `${lesson.id} (${curriculumRole}): Pass 4 ficou em ${advanced.record.level}/4 ` +
          `(hasProd=${hasProd}, requireProd=${requireProd}, kinds=${[...new Set(plan4.map((s) => s.kind))].join(",")})`
      );
    } else {
      freed.push(lesson.id);
    }
  }

  assert.ok(freed.includes("p2-ma-primeiro-tom"), "1º tom com ma deve dominar após Pass 4");
  assert.equal(stuck.length, 0, `labs ainda presos em 3/4:\n${stuck.join("\n")}`);
  assert.ok(freed.length >= 10, `esperava ≥10 labs liberados, vi ${freed.length}`);

  const playerSrc = await readFile(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert.match(playerSrc, /requireProductionOrTransfer:\s*requiresProductionOrTransferForMastery\(lesson\)/);
  const storeSrc = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(storeSrc, /requireProductionOrTransfer:\s*input\.requireProductionOrTransfer/);

  console.log(
    "OK test:lab-mastery-pass4 —",
    `${freed.length} labs alcançam 4/4 no Domínio; clamp de aquisição preservado; player/store ligados`
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:lab-mastery-pass4");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
