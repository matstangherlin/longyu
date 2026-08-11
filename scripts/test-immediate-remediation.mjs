/**
 * B002 — remediação imediata / star recovery não pode concatenar dumps.
 * Roda: npm run test:immediate-remediation
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-immediate-remediation-"));
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

try {
  const program = ts.createProgram(
    [
      "src/features/lesson/immediateRemediation.ts",
      "src/data/errorDiagnosis.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/journey.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("falha ao compilar immediateRemediation");

  const { buildImmediateRemediationExercise } = require(
    path.join(outDir, "src/features/lesson/immediateRemediation.js")
  );

  const dumpHanzi = "你好 / 你好吗 / 我很好 / 谢谢 / 再见";
  const dumpPinyin = "nǐ hǎo / nǐ hǎo ma / wǒ hěn hǎo / xièxie / zàijiàn";

  const dialogueError = {
    id: "test-dialogue-1",
    lessonId: "l2",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "dialogue_choice",
    prompt: "Escolha a resposta correta",
    correctAnswer: "我很好",
    selectedAnswer: "Pulou ou respondeu incorretamente",
    topic: "Cumprimento",
    tokens: ["你好", "你好吗", "我很好", "谢谢", "再见"],
    hanzi: dumpHanzi,
    pinyin: dumpPinyin,
    meaningPt: "estou bem",
    explanation: dumpHanzi,
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "fala",
    targets: [{ type: "chunk", itemId: "wohenhao", domain: "significado", track: "fala" }],
    step: {
      kind: "dialogue_choice",
      title: "Escolha no diálogo",
      dialoguePrompt: "你好吗？",
      prompt: "Como você responde que está bem?",
      options: ["谢谢", "我很好", "你好", "再见"],
      correctAnswer: "我很好",
      explanation: "我很好 significa estou bem.",
    },
  };

  const exercise = buildImmediateRemediationExercise(dialogueError);

  assert(exercise.kind === "choice", `expected choice, got ${exercise.kind}`);
  assert(!/[\/|]/.test(exercise.display ?? ""), `display concatenado: ${exercise.display}`);
  assert(!/[\/|]/.test(exercise.displayPinyin ?? ""), `displayPinyin concatenado: ${exercise.displayPinyin}`);
  assert(!/[\/|]/.test(exercise.answerPinyin ?? ""), `answerPinyin concatenado: ${exercise.answerPinyin}`);
  assert(exercise.answer === "我很好", `answer deve ser 我很好, got ${exercise.answer}`);
  assert(
    !(exercise.options ?? []).some((o) => /pulou|incorretamente/i.test(o)),
    `opções contêm status de pulo: ${(exercise.options ?? []).join(" | ")}`
  );
  assert(
    (exercise.options ?? []).includes("我很好"),
    `opções devem incluir a resposta: ${(exercise.options ?? []).join(" | ")}`
  );
  assert(!/[\/|]/.test(exercise.explanation ?? ""), `explanation concatenada: ${exercise.explanation}`);
  assert(
    /你好吗|responde|situação|combina/i.test(exercise.prompt),
    `prompt sem contexto situacional: ${exercise.prompt}`
  );
  assert(
    Boolean(exercise.answerPinyin) && /w[oǒ]|hěn|hǎo/i.test(exercise.answerPinyin),
    `answerPinyin deve ser de 我很好: ${exercise.answerPinyin}`
  );

  const sceneError = {
    ...dialogueError,
    id: "test-scene-1",
    type: "conversation_scene",
    step: {
      kind: "conversation_scene",
      title: "Conversa",
      checkpoint: {
        prompt: "Como você responde que está bem?",
        options: ["谢谢", "我很好", "你好", "再见"],
        correctAnswer: "我很好",
        explanation: "我很好 — estou bem.",
      },
      lines: [
        { speakerId: "a", hanzi: "你好" },
        { speakerId: "b", hanzi: "你好吗" },
        { speakerId: "a", hanzi: "我很好" },
      ],
      correctAnswer: "我很好",
    },
  };

  const sceneEx = buildImmediateRemediationExercise(sceneError);
  assert(!/[\/|]/.test(sceneEx.display ?? ""), `cena display concatenado: ${sceneEx.display}`);
  assert(
    !(sceneEx.options ?? []).some((o) => /pulou|incorretamente/i.test(o)),
    `cena opções com status: ${(sceneEx.options ?? []).join(" | ")}`
  );

  // validate:error-diagnosis cobre erros sem prompt — não pode crashar.
  const bareError = {
    id: "test-bare-1",
    lessonId: "l2",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "dialogue_choice",
    correctAnswer: "我很好",
    selectedAnswer: "谢谢",
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "fala",
    targets: [{ type: "chunk", itemId: "wohenhao", domain: "significado", track: "fala" }],
  };
  const bareEx = buildImmediateRemediationExercise(bareError);
  assert(Boolean(bareEx.prompt), `prompt ausente no bare: ${bareEx.prompt}`);
  assert(bareEx.answer === "我很好", `bare answer: ${bareEx.answer}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:immediate-remediation:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:immediate-remediation passou (B002 anti-concatenação).");
