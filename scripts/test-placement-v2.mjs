#!/usr/bin/env node
/**
 * TEST-035 — Placement 2.0 adaptivity fixtures.
 * Roda: npm run test:placement-v2
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-placement-v2-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    ["src/lib/placement/types.ts", "src/lib/placement/questions.ts", "src/lib/placement/engine.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:placement-v2");

  const engine = require(path.join(outDir, "src/lib/placement/engine.js"));
  const questions = require(path.join(outDir, "src/lib/placement/questions.js"));
  const types = require(path.join(outDir, "src/lib/placement/types.js"));

  function wrongAnswer(question) {
    return question.options.find((option) => option !== question.answer) ?? question.options[0];
  }

  function runLoop(declared, pick) {
    const answers = [];
    const asked = [];
    let guard = 0;
    while (!engine.shouldStopPlacement(declared, answers) && guard < 40) {
      guard += 1;
      const question = engine.chooseNextQuestion(declared, answers, asked);
      if (!question) break;
      asked.push(question.id);
      const choice = pick(question, answers.length);
      answers.push({
        questionId: question.id,
        answer: choice.answer,
        hintUsed: Boolean(choice.hintUsed),
        responseMode: "choice",
      });
    }
    return {
      answers,
      asked,
      analysis: engine.evaluatePlacementEvidence(declared, answers),
    };
  }

  const zero = runLoop("zero", (question) => ({ answer: wrongAnswer(question), hintUsed: false }));
  if (zero.answers.length > types.MAX_QUIZ_LENGTH.zero) {
    fail(`zero beginner excedeu o teto (${zero.answers.length} > ${types.MAX_QUIZ_LENGTH.zero})`);
  }
  if (zero.answers.length > 10) fail(`zero beginner ainda longo demais: ${zero.answers.length}`);
  if (zero.analysis.placement.targetLessonId !== "p1-o-que-e-mandarim") {
    fail(`zero deveria começar do início, obteve ${zero.analysis.placement.targetLessonId}`);
  }
  if (/mal|falhou|nível baixo/i.test(zero.analysis.resultMessage)) {
    fail("copy de beginner não pode parecer vestibular");
  }
  if (zero.analysis.placement.masteredByPlacement.some((id) => String(id).startsWith("p1-o-que-e-"))) {
    fail("zero beginner não pode grandfather fundamentos");
  }

  const advanced = runLoop("advanced", (question) => ({ answer: question.answer, hintUsed: false }));
  if (advanced.analysis.placement.targetLessonId === "p1-o-que-e-mandarim" && advanced.answers.length < 8) {
    fail("advanced acertando tudo não deveria ficar preso no primeiro contato");
  }
  const advancedDifficulties = advanced.asked.map((id) => questions.getPlacementQuestion(id)?.difficulty ?? 0);
  if (Math.max(...advancedDifficulties) < 3) {
    fail("advanced deveria escalar dificuldade");
  }

  const hinted = runLoop("studied", (question) => ({ answer: question.answer, hintUsed: true }));
  const hintedFoundations = hinted.analysis.foundationProofs.filter((row) => row.proven);
  if (hintedFoundations.length > 0) {
    fail("acerto com dica não prova fundamento para skip");
  }
  if (hinted.analysis.placement.masteredByPlacement.includes("p1-o-que-e-pinyin")) {
    fail("pinyin não pode ser skipped só com dica");
  }

  const inconsistent = runLoop("phrases", (question, index) => ({
    answer: index % 2 === 0 ? question.answer : wrongAnswer(question),
    hintUsed: false,
  }));
  if (inconsistent.answers.length <= zero.answers.length) {
    fail("aprendiz inconsistente deveria receber mais evidência que o zero estável");
  }

  const modest = runLoop("words", (question) => ({ answer: wrongAnswer(question), hintUsed: false }));
  if (modest.analysis.placement.targetLessonId === "l19") {
    fail("self-assessment words errando o básico não pode pular até hànzì avançado");
  }

  const fakeSkip = engine.validatePlacementEvidence({
    placementVersion: 2,
    declaredExperience: "advanced",
    answers: [{ questionId: "nao-existe", answer: "x", hintUsed: false, responseMode: "choice" }],
  });
  if (fakeSkip.ok) fail("questionId desconhecido deve falhar na validação");

  const versionGuard = engine.validatePlacementEvidence({
    placementVersion: 1,
    declaredExperience: "zero",
    answers: zero.answers,
  });
  if (versionGuard.ok) fail("placement v1 não pode ser aceito como v2");

  if (types.PLACEMENT_VERSION !== 2) fail("PLACEMENT_VERSION deve ser 2");
  if (types.BASE_QUIZ_LENGTH.zero > 6) fail("BASE zero está acima da meta 4–6");
  if (types.MAX_QUIZ_LENGTH.zero > 10) fail("MAX zero está acima da meta 8–10");

  console.log(`OK zero=${zero.answers.length} advanced=${advanced.answers.length} inconsistent=${inconsistent.answers.length} hinted=${hinted.answers.length}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:placement-v2:");
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:placement-v2");
