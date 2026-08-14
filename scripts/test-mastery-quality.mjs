#!/usr/bin/env node
/**
 * TEST — masteryQualityScore (src/data/masteryQuality.ts).
 *
 * Complementa test-mastery-coverage.mjs (que só consegue chamar
 * masteryQualityScore(lessonId) sem planos, de forma defensiva) testando o
 * caso real de uso: plansByPass montados com lessonRoundStepsFor +
 * masteryBonusStepsFor, como um chamador de produção faria.
 *
 * Cobre:
 * - toda lição do piloto (masteryPilot.ts) passa no quality score com
 *   planos reais;
 * - o score não é vazio/vácuo: um plano propositalmente ruim (mesma pass
 *   repetida 4x, sem produção) deve FALHAR os checks certos;
 * - chamar sem plansByPass (uso "core", sem lessonTasks.ts) nunca lança e
 *   ainda avalia os checks lexicais/scaffold de verdade.
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-quality-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
      "src/data/masteryQuality.ts",
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
  if (emit.emitSkipped) throw new Error("TypeScript não compilou a suite de masteryQualityScore");

  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const quality = require(path.join(outDir, "src/data/masteryQuality.js"));
  const { getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const { masteryQualityScore } = quality;
  assert.equal(typeof masteryQualityScore, "function", "masteryQualityScore deve ser exportado como função");

  function plansByPassFor(lessonId) {
    const lesson = getLesson(lessonId);
    const plansByPass = {};
    for (const pass of [1, 2, 3, 4]) {
      plansByPass[pass] = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true });
    }
    return plansByPass;
  }

  // ————————————————————————————————————————————————————————————————
  // 1) Toda lição do piloto, com planos reais, deve passar no quality score.
  // ————————————————————————————————————————————————————————————————
  let checkedCount = 0;
  const failingLessons = [];
  for (const lessonId of pilot.MASTERY_PILOT_LESSON_IDS) {
    const lesson = getLesson(lessonId);
    if (!lesson) {
      fail(`${lessonId}: lição do piloto não existe na Jornada`);
      continue;
    }
    const plansByPass = plansByPassFor(lessonId);
    const result = masteryQualityScore(lessonId, plansByPass);
    assert.equal(typeof result.score, "number", `${lessonId}: score deve ser number`);
    assert.equal(typeof result.passes, "boolean", `${lessonId}: passes deve ser boolean`);
    assert.ok(Array.isArray(result.checks) && result.checks.length >= 6, `${lessonId}: checks deve ter >= 6 itens`);
    checkedCount += 1;
    if (!result.passes) {
      failingLessons.push(
        `${lessonId} (score ${result.score}): ${result.checks
          .filter((c) => !c.ok)
          .map((c) => `${c.id} — ${c.detail ?? "sem detalhe"}`)
          .join(" | ")}`
      );
    }
  }
  if (failingLessons.length > 0) {
    fail(`lições do piloto que não atingem quality.passes:\n   - ${failingLessons.join("\n   - ")}`);
  }

  // ————————————————————————————————————————————————————————————————
  // 2) O score não é vácuo: planos artificialmente ruins devem reprovar.
  // ————————————————————————————————————————————————————————————————
  const sameStepEveryPass = { kind: "flashcard", title: "Repetido", correctAnswer: "你好" };
  const badPlans = { 1: [sameStepEveryPass], 2: [sameStepEveryPass], 3: [sameStepEveryPass], 4: [sameStepEveryPass] };
  const badResult = masteryQualityScore("l2", badPlans);
  assert.ok(!badResult.passes, "plano ruim (mesma pass repetida) não deveria passar no quality score");
  assert.ok(
    badResult.checks.find((c) => c.id === "plans_differ" && !c.ok),
    "plano ruim deveria falhar o check plans_differ"
  );
  assert.ok(
    badResult.checks.find((c) => c.id === "m3_production" && !c.ok),
    "plano ruim (sem produção em M3) deveria falhar o check m3_production"
  );

  // ————————————————————————————————————————————————————————————————
  // 3) Plano com kind desencorajado em pass avançada detecta "profundidade falsa".
  // ————————————————————————————————————————————————————————————————
  const l2Plans = plansByPassFor("l2");
  const falseDepthPlans = {
    ...l2Plans,
    4: [...l2Plans[4], { kind: "flashcard", title: "Intruso", correctAnswer: "你好" }],
  };
  const falseDepthResult = masteryQualityScore("l2", falseDepthPlans);
  assert.ok(
    falseDepthResult.checks.find((c) => c.id === "no_false_depth" && !c.ok),
    "flashcard em M4 deveria disparar o check no_false_depth"
  );

  // ————————————————————————————————————————————————————————————————
  // 4) Chamar sem plansByPass nunca lança e ainda avalia lexical/scaffold.
  // ————————————————————————————————————————————————————————————————
  const noPlansResult = masteryQualityScore("l2");
  assert.equal(typeof noPlansResult.score, "number", "sem plansByPass ainda retorna score number");
  assert.equal(noPlansResult.passes, false, "sem planos: passes deve ser false (not_evaluated não greenwash)");
  assert.ok(noPlansResult.notEvaluatedCount > 0, "sem planos: deve haver checks not_evaluated");
  assert.ok(
    noPlansResult.checks.find((c) => c.id === "lexical_targets")?.status === "pass",
    "l2 tem PILOT_LEXICAL_TARGETS — lexical_targets deve passar mesmo sem planos"
  );
  assert.ok(
    noPlansResult.checks.find((c) => c.id === "scaffold_decreases")?.status === "pass",
    "check scaffold_decreases não depende de planos e deve passar"
  );
  assert.ok(
    noPlansResult.checks.every((c) => c.status !== "not_evaluated" || c.ok === false),
    "not_evaluated nunca ok:true"
  );

  const unknownLessonResult = masteryQualityScore("licao-inexistente-xyz");
  assert.equal(typeof unknownLessonResult.score, "number", "lição desconhecida não deve lançar");
  assert.equal(
    unknownLessonResult.checks.find((c) => c.id === "lexical_targets")?.status,
    "not_applicable",
    "lição fora do currículo marca lexical_targets como not_applicable"
  );

  // Bad plans should use status:fail
  assert.ok(
    badResult.checks.find((c) => c.id === "plans_differ" && c.status === "fail"),
    "plano ruim deveria falhar plans_differ com status fail"
  );

  console.log(
    "OK test:mastery-quality —",
    [
      `${checkedCount} lições do piloto avaliadas com planos reais`,
      "plano ruim reprovado",
      "profundidade falsa detectada",
      "tri-state: not_evaluated não greenwash",
    ].join("; ")
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:mastery-quality");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
