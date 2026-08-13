#!/usr/bin/env node
/**
 * TEST-047 — Acceptance tests Pedagogia V3 (Mastery Loop).
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
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
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript não compilou o suite de mastery");

  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const lesson = getLesson("l2");
  assert.ok(lesson?.masteryLoop, "l2 deve participar do mastery loop");

  const plan1 = lessonRoundStepsFor(lesson, { masteryLevel: 0, masteryPass: 1, silent: true });
  const plan2 = lessonRoundStepsFor(lesson, { masteryLevel: 1, masteryPass: 2, silent: true });
  const plan3 = lessonRoundStepsFor(lesson, { masteryLevel: 2, masteryPass: 3, silent: true });
  const plan4 = lessonRoundStepsFor(lesson, { masteryLevel: 3, masteryPass: 4, silent: true });

  const sig = (plan) => plan.map((s) => `${s.kind}:${s.title ?? s.correctAnswer ?? s.audioText ?? ""}`).join("|");
  assert.notEqual(sig(plan1), sig(plan2), "1ª execução ≠ 2ª execução");
  assert.notEqual(sig(plan2), sig(plan3), "2ª execução ≠ 3ª execução");

  const scaffold1 = mastery.scaffoldForMasteryPass(1);
  const scaffold3 = mastery.scaffoldForMasteryPass(3);
  const scaffold4 = mastery.scaffoldForMasteryPass(4);
  assert.equal(scaffold1.showPortuguese, true, "M1 mostra PT");
  assert.equal(scaffold3.showPortuguese, false, "M3 remove PT antecipado");
  assert.equal(scaffold4.productionHelpInitial, 0, "M4 ajuda mínima");
  assert.ok(scaffold1.productionHelpInitial > scaffold4.productionHelpInitial, "scaffold diminui");

  const prodShare = (plan) =>
    plan.filter((s) => mastery.isProductionOrTransferKind(s.kind)).length / Math.max(1, plan.length);
  assert.ok(prodShare(plan3) >= prodShare(plan1), "dificuldade/produção sobe até pass 3");

  const dims = {
    "chunk:nihao": { meaning: 0.95, listening: 0.8, form: 0.7, production: 0.2, updatedAt: Date.now() },
  };
  const planDim = lessonRoundStepsFor(lesson, {
    masteryLevel: 2,
    masteryPass: 3,
    itemDimensionsByRef: dims,
    silent: true,
  });
  assert.ok(
    planDim.some(
      (s) =>
        mastery.isProductionOrTransferKind(s.kind) ||
        s.kind === "reverse_recall" ||
        s.kind === "sentence_transform"
    ),
    "com meaning alto, planner ainda traz produção"
  );

  const scoreSame = pilot.semanticExpansionScore("l2", 1, ["comprehend", "listen", "image_choice", "sentence_build"]);
  const scoreBase = pilot.semanticExpansionScore("l2", 1);
  assert.equal(scoreSame.score, scoreBase.score, "repetir modalidade não aumenta semanticExpansionScore");

  assert.ok(
    plan4.some((s) => mastery.isProductionOrTransferKind(s.kind)),
    "mastery 4 contém produção/transferência"
  );

  const advanced = mastery.advanceLessonMastery({
    current: { level: 0, passCount: 0, updatedAt: 0 },
    pass: 1,
    accuracy: 0.9,
    mistakeCount: 0,
    hadProductionOrTransfer: false,
  });
  assert.equal(advanced.record.level, 1, "1º pass → mastery 1");

  const migrated = mastery.migrateLessonMasteryFromCompletion(["l2", "l3"], { l2: 3, l3: 1 }, {});
  assert.equal(migrated.l2.level, 2, "conta antiga 3★ → M2 (não M4)");
  assert.equal(migrated.l3.level, 1, "conta antiga 1★ → M1");

  const mergedMastery = mastery.mergeLessonMasteryRecords(
    { l2: { level: 2, passCount: 2, updatedAt: 1 } },
    { l2: { level: 3, passCount: 3, updatedAt: 2 } }
  );
  assert.equal(mergedMastery.l2.level, 3, "sync cloud preserva maior mastery");

  const mergedDims = mastery.mergeItemDimensionScores(
    { "chunk:nihao": { meaning: 0.5, listening: 0.4, form: 0.3, production: 0.2, updatedAt: 10 } },
    { "chunk:nihao": { meaning: 0.9, listening: 0.8, form: 0.7, production: 0.6, updatedAt: 20 } }
  );
  assert.ok(mergedDims["chunk:nihao"].production >= 0.6, "merge preserva dimensões");

  assert.equal(pilot.isFalseDepth("l2", 4, 5), true, "muitos kinds sem lexema novo = falsa profundidade");

  for (const id of pilot.MASTERY_PILOT_LESSON_IDS) {
    const l = getLesson(id);
    assert.ok(l?.masteryLoop, `${id} deve ter masteryLoop`);
  }

  const storeSrc = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(storeSrc, /lessonMasteryById/, "store persiste lessonMasteryById");
  assert.match(storeSrc, /recordLessonMasteryPass/, "store expõe recordLessonMasteryPass");
  assert.match(storeSrc, /version: 19/, "migração v19");

  const syncSrc = await readFile(path.join(root, "src/lib/syncMerge.ts"), "utf8");
  assert.match(syncSrc, /mergeLessonMasteryRecords/, "syncMerge une mastery");
  assert.match(syncSrc, /mergeItemDimensionScores/, "syncMerge une dimensões");

  const journeySrc = await readFile(path.join(root, "src/features/journey/JourneyPage.tsx"), "utf8");
  assert.match(journeySrc, /masteryLevel/, "UX da Jornada mostra domínio");

  console.log(
    "OK test:mastery-loop —",
    [
      "plans diferem por pass",
      "scaffold diminui",
      "produção sobe",
      "dimensões",
      "semantic expansion",
      "M4 transfer",
      "migração",
      "merge cloud",
    ].join("; ")
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:mastery-loop");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
