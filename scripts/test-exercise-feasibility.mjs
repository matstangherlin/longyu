#!/usr/bin/env node
/**
 * V4.6.2 — unit tests for exercise feasibility (taxonomy, sentinel, grading).
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-ex-feas-unit-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(["src/data/exerciseFeasibility.ts", "src/data/journey.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou exerciseFeasibility");

  const feas = require(path.join(outDir, "src/data/exerciseFeasibility.js"));

  const sentinel = feas.auditStepFeasibility(feas.HUMAN_QA_DEAD_SCREEN, {
    lessonId: "p1-primeiros-hanzi",
    pass: 3,
    index: 2,
    stage: "usage",
  });
  if (sentinel.feasible) fail("sentinel: tela observada deveria ser infeasible");
  if (!sentinel.issues.includes("instruction_mismatch")) fail("sentinel: Diga+Monte deve ser mismatch");
  if (!sentinel.issues.includes("answer_leak") && !sentinel.answerVisibleBeforeAttempt) {
    fail("sentinel: suggestion 木 deve vazar a resposta");
  }
  if (!sentinel.issues.includes("invalid_interaction") && !sentinel.issues.includes("dead_screen")) {
    fail("sentinel: reverse_recall+free_reflection deve ser interação inválida ou dead screen");
  }

  const writeNoMode = feas.auditStepFeasibility(
    { kind: "write", title: "Escreva", body: "Complete.", answer: "ok" },
    { lessonId: "x", pass: 1, index: 0 }
  );
  if (!writeNoMode.issues.includes("write_mode_missing")) fail("write sem mode deve hard-fail");

  const leak = feas.auditStepFeasibility(
    {
      kind: "write",
      mode: "guided_write",
      title: "Escreva",
      body: "Escreva a palavra.",
      answer: "木",
      suggestion: "木",
      wordBank: ["木", "人", "口"],
    },
    { lessonId: "x", pass: 1, index: 0 }
  );
  if (!leak.issues.includes("answer_leak")) fail("suggestion === answer deve ser leak");

  const reflection = { kind: "write", mode: "free_reflection", title: "Pense antes de continuar", body: "Opcional." };
  if (feas.isEvaluableQuestionStep(reflection)) fail("free_reflection não é pergunta");
  if (feas.isProductionStep(reflection)) fail("free_reflection não é produção");

  const sayReflection = feas.auditStepFeasibility(
    {
      kind: "write",
      mode: "free_reflection",
      title: "Diga sem apoio extra",
      body: "monte o caractere",
      answer: "木",
      suggestion: "木",
    },
    { lessonId: "x", pass: 3, index: 0 }
  );
  if (sayReflection.feasible) fail("Diga + free_reflection deve falhar");

  const monteTextarea = feas.auditStepFeasibility(
    {
      kind: "write",
      mode: "guided_write",
      title: "Monte o caractere-alvo",
      body: "Monte 木 no campo.",
      answer: "木",
      suggestion: "É o caractere de árvore.",
    },
    { lessonId: "x", pass: 3, index: 0 }
  );
  if (monteTextarea.issues.includes("ime_only")) fail("runtime deve oferecer banco para hànzì, não IME-only");
  if (!monteTextarea.availableInteractions.includes("assembly")) {
    fail("Monte + write CJK precisa de banco de peças no runtime");
  }

  const glossedMonte = feas.auditStepFeasibility(
    {
      kind: "sentence_build",
      title: "Monte a resposta que você usou.",
      prompt: "Monte: Por favor, fale de novo.",
      target: ["请", "再", "说", "一", "遍"],
      bank: ["请", "再", "说", "一", "遍", "谢谢"],
    },
    { lessonId: "l4-rev", pass: 1, index: 0 }
  );
  if (!glossedMonte.feasible) {
    fail(`gloss 'fale' no prompt não pode invalidar Monte: ${glossedMonte.detail.join("; ")}`);
  }
  const glossVerbs = feas.instructionVerbsFor({
    kind: "sentence_build",
    title: "Monte a resposta que você usou.",
    prompt: "Monte: Por favor, fale de novo.",
  });
  if (glossVerbs.includes("fale")) fail("verbo de instrução não pode vir da glosa do alvo");

  const recognizeQual = feas.auditStepFeasibility(
    {
      kind: "recognize",
      title: "Qual hànzì apareceu na conversa?",
      charId: "mu",
    },
    { lessonId: "l15", pass: 1, index: 0 }
  );
  if (!recognizeQual.feasible) fail(`recognize Qual precisa ser escolha: ${recognizeQual.detail.join("; ")}`);
  if (!recognizeQual.availableInteractions.includes("choice")) fail("recognize é escolha, não montagem");

  const dictationHanzi = feas.auditStepFeasibility(
    {
      kind: "dictation",
      title: "Ouça e escreva o hànzì",
      dictationMode: "hanzi",
      audioText: "林木",
      correctAnswer: "林木",
    },
    { lessonId: "p5-mu-mu-lin", pass: 3, index: 0 }
  );
  if (dictationHanzi.issues.includes("ime_only")) fail("ditado de hànzì precisa de peças, não só IME");
  if (!dictationHanzi.feasible) fail(`ditado hànzì deveria ser feasible: ${dictationHanzi.detail.join("; ")}`);

  const ouvirGloss = feas.instructionVerbsFor({
    kind: "reverse_recall",
    title: "Transferencia",
    body: "Numa loja nova, o vendedor fala rapido e voce quer ouvir de novo.",
    situationPt: "Numa loja nova, o vendedor fala rapido e voce quer ouvir de novo.",
    answer: "请再说一遍",
  });
  if (ouvirGloss.includes("ouca")) fail("situação 'quer ouvir' não é o verbo Ouça da UI");

  const build = feas.auditStepFeasibility(
    {
      kind: "hanzi_build",
      title: "Monte 木",
      prompt: "Monte o hànzì de árvore.",
      builderId: "hb-mu-fragments",
      correctAnswer: "木",
    },
    { lessonId: "p1-primeiros-hanzi", pass: 3, index: 0 }
  );
  if (!build.feasible) fail(`hanzi_build de 木 deveria ser feasible: ${build.detail.join("; ")}`);

  const saySpeak = feas.makeReverseRecall("Diga 你好", "Cumprimente em mandarim.", "你好", ["你好"]);
  if (saySpeak.mode === "free_reflection") fail("makeReverseRecall não pode setar free_reflection");
  const sayAudit = feas.auditStepFeasibility(saySpeak, { lessonId: "x", pass: 3, index: 0 });
  if (!sayAudit.feasible) fail(`Diga + reverse_recall materializado deveria passar: ${sayAudit.detail.join("; ")}`);
  if (!sayAudit.availableInteractions.includes("speech")) fail("Diga precisa de speech");
  if (!sayAudit.availableInteractions.includes("assembly")) fail("hànzì precisa de banco, não só IME");

  const numbered = feas.withEvaluableQuestionNumbers([
    { kind: "intro", title: "Abertura", lessonStageId: "usage" },
    { kind: "write", mode: "free_reflection", title: "Pense antes de continuar", lessonStageId: "usage" },
    { kind: "dialogue_choice", title: "Escolha", options: ["a", "b"], correctAnswer: "a", lessonStageId: "usage" },
    { kind: "hanzi_build", title: "Monte", builderId: "hb-mu-fragments", lessonStageId: "usage" },
  ]);
  if (numbered[0].lessonStageQuestion !== 0) fail("intro não conta como pergunta");
  if (numbered[1].lessonStageQuestion !== 0) fail("reflexão não conta como pergunta");
  if (numbered[2].lessonStageQuestion !== 1 || numbered[3].lessonStageQuestion !== 2) {
    fail("só passos avaliáveis entram em pergunta X/Y");
  }
  if (numbered[2].lessonStageQuestionCount !== 2) fail("questionCount deve ignorar intro/reflexão");

  const materialized = feas.materializeRuntimeStep({
    kind: "reverse_recall",
    title: "Diga",
    body: "Cumprimente.",
    answer: "你好",
    mode: "free_reflection",
    suggestion: "你好",
  });
  if (materialized.mode === "free_reflection") fail("runtime não pode manter free_reflection em reverse_recall");
  if (materialized.suggestion === "你好") fail("runtime deve remover suggestion = answer");
  if (!Array.isArray(materialized.productionHelpBuildBank) || materialized.productionHelpBuildBank.length < 2) {
    fail("runtime deve oferecer banco de hànzì");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("ERRO: test:exercise-feasibility falhou.");
  for (const error of failures) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("OK: test:exercise-feasibility passou.");
