#!/usr/bin/env node
/**
 * QA 2026-10 prompt 09 — pontuação, nome, etapa 你好 e enunciados das fases 1–2.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-early-copy-"));
const program = ts.createProgram(["src/lib/text/learnerCopy.ts", "src/lib/learnerName.ts"], {
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
const emit = program.emit();
if (emit.emitSkipped) {
  console.error(emit.diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  process.exit(1);
}
const copy = require(path.join(outDir, "src/lib/text/learnerCopy.js"));
const names = require(path.join(outDir, "src/lib/learnerName.js"));
const journey = require(path.join(root, "src/data/journey.ts"));
const tasks = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
const validation = require(path.join(root, "src/features/lesson/exerciseValidation.ts"));
const objective = require(path.join(root, "src/data/generatedTaskObjective.ts"));
const specs = require(path.join(root, "src/data/topicMasterySpecs.ts"));
const feasibility = require(path.join(root, "src/data/exerciseFeasibility.ts"));
const response = require(path.join(root, "src/lib/learnerResponse.ts"));

assert.equal(copy.joinSentence("Monte:", "Olá."), "Monte: Olá.");
assert.equal(copy.joinSentence("Complete:", "Olá."), "Complete: Olá.");
assert.equal(copy.joinSentence("Você quer dizer:", "Meu nome é Ana."), "Você quer dizer: Meu nome é Ana.");
assert.equal(copy.joinSentence("Monte:", "Tudo bem?"), "Monte: Tudo bem?");
assert.equal(copy.joinSentence("Complete:", "De nada."), "Complete: De nada.");
assert.equal(copy.collapseTerminalPunctuation("我叫..."), "我叫...");
assert.equal(copy.toneQuestion("谢", "谢谢"), "Qual é o tom da 1ª sílaba de 谢谢?");
assert.equal(copy.toneQuestion("谢"), "Qual é o tom de 谢?");
assert.equal(copy.clarifyToneQuestion("Qual é o tom de 谢?", "谢谢"), "Qual é o tom da 1ª sílaba de 谢谢?");

assert.equal(names.personalizeName("Meu nome é Matheus.", undefined), "Meu nome é Lucas.");
assert.equal(names.personalizeName("我叫Matheus", "Ana Souza"), "我叫 Ana");
assert.equal(names.personalizeName("O que Matheus responde?", "Ana"), "O que Ana responde?");
assert.equal(names.learnerSpokenName("Aluno local"), "Lucas");
assert.doesNotMatch(names.personalizeName("Apresente-se: meu nome é Matheus.", undefined), /você/);
assert.match(readFileSync("src/features/lesson/ConversationSceneStep.tsx", "utf8"), /learnerSpokenName\(studentName\)/);
assert.doesNotMatch(readFileSync("src/features/lesson/ConversationSceneStep.tsx", "utf8"), /studentName \?\? "você"/);

const doubled = /(?<!\.)\.\.(?!\.)|[?？]\.|[.。][?？]/;
const phases = journey.JOURNEY.filter((phase) => phase.id === "p1" || phase.id === "p2");
const invalid = [];
for (const phase of phases) {
  for (const unit of phase.units) {
    for (const lesson of unit.lessons) {
      for (const pass of [1, 2, 3, 4]) {
        const steps = tasks.lessonRoundStepsFor(lesson, { masteryPass: pass }) ?? [];
        steps.forEach((step, index) => {
          const materialized = feasibility.materializeRuntimeStep(step);
          const result = validation.validateExercise(materialized);
          if (!result.valid) {
            invalid.push(`${lesson.id}#${pass}:${index} ${step.kind} ${result.errors.join("; ")}`);
          }
          for (const field of ["prompt", "dialoguePrompt", "title", "situationPt", "body", "explanation"]) {
            const polished = copy.polishLearnerText(step[field], step.sourceText);
            if (polished && doubled.test(polished)) {
              invalid.push(`${lesson.id}#${pass} ${field} ainda com pontuação dobrada: ${polished}`);
            }
          }
        });
      }
    }
  }
}
assert.deepEqual(invalid, []);

const lab = journey.getLesson("p1-engine-2-lab");
const spec = specs.topicMasterySpecFor(lab);
for (const pass of [2, 4]) {
  const surfaces = objective.surfacesForObjective(
    objective.resolveGeneratedTaskObjective(lab, pass, spec),
    spec,
    pass,
    lab
  );
  assert.match(surfaces.prompt, /\?$/, `pass ${pass} enunciado: ${surfaces.prompt}`);
  assert.doesNotMatch(surfaces.prompt, /Distinguir ouvir|Aplicar o mesmo motor|Reconhecer de verdade/);
}
const bonus = objective.buildGeneratedBonusStep(lab, 3, spec);
const build = bonus.find((step) => step.kind === "sentence_build");
const recall = bonus.find((step) => step.kind === "reverse_recall");
assert.equal(build.correctAnswer, "你好");
assert.ok(build.bank.includes("好"), `banco sem 好: ${build.bank.join(",")}`);
assert.ok(build.bank.includes("你"));
assert.equal(recall.answer, "你好");
assert.equal(response.evaluateLearnerResponse({ draft: "你 好", acceptedAnswers: [recall.answer] }).accepted, true);
assert.equal(response.evaluateLearnerResponse({ draft: "你好。", acceptedAnswers: [recall.answer] }).accepted, true);
assert.equal(response.evaluateLearnerResponse({ draft: "你", acceptedAnswers: [recall.answer] }).accepted, false);

console.log("test:early-lesson-copy PASS");
