/**
 * B002+ — remediação imediata / star recovery:
 * - um único contexto coerente;
 * - pinyin alinhado ao alvo;
 * - sem status de pulo nas alternativas;
 * - sem dumps concatenados;
 * - kinds (choice/build/listen/recognize) consistentes.
 *
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
const assertNoDump = (value, label) => {
  assert(!value || !/[\/|]/.test(value), `${label} concatenado: ${value}`);
};
const assertNoSkip = (options, label) => {
  assert(
    !(options ?? []).some((o) => /pulou|incorretamente/i.test(o)),
    `${label} contém status de pulo: ${(options ?? []).join(" | ")}`
  );
};

try {
  const program = ts.createProgram(
    [
      "src/features/lesson/immediateRemediation.ts",
      "src/features/lesson/lessonAttemptReview.ts",
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

  const {
    buildImmediateRemediationExercise,
    isNonOptionAnswer,
    isConcatenatedDump,
    isDebugExplanation,
  } = require(path.join(outDir, "src/features/lesson/immediateRemediation.js"));
  const { activityErrorFromMistake } = require(
    path.join(outDir, "src/features/lesson/lessonAttemptReview.js")
  );
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));

  assert(isNonOptionAnswer("Pulou ou respondeu incorretamente"), "status de pulo deve ser filtrado");
  assert(isConcatenatedDump("你好 / 你好吗"), "dump com / deve ser detectado");
  assert(isDebugExplanation("Sugestão: 你好"), "Sugestão: deve ser debug");

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
    diagnosis: "goal_production",
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

  assert(exercise.kind === "choice", `dialogue+goal_production deve ser choice, got ${exercise.kind}`);
  assertNoDump(exercise.display, "display");
  assertNoDump(exercise.displayPinyin, "displayPinyin");
  assertNoDump(exercise.answerPinyin, "answerPinyin");
  assert(exercise.answer === "我很好", `answer deve ser 我很好, got ${exercise.answer}`);
  assertNoSkip(exercise.options, "opções dialogue");
  assert(
    (exercise.options ?? []).includes("我很好"),
    `opções devem incluir a resposta: ${(exercise.options ?? []).join(" | ")}`
  );
  assert(
    !(exercise.options ?? []).some((o) => /estou bem|obrigado|hello/i.test(o) && !/[\u3400-\u9fff]/.test(o)),
    `opções misturam pt com hànzì: ${(exercise.options ?? []).join(" | ")}`
  );
  assertNoDump(exercise.explanation, "explanation");
  assert(
    /你好吗|responde|situação|combina/i.test(exercise.prompt),
    `prompt sem contexto situacional: ${exercise.prompt}`
  );
  assert(
    Boolean(exercise.answerPinyin) && /w[oǒ]|hěn|hǎo/i.test(exercise.answerPinyin),
    `answerPinyin deve ser de 我很好: ${exercise.answerPinyin}`
  );
  assert(exercise.canRecoverStar === true, "canRecoverStar deve ser true");

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
  assert(sceneEx.kind === "choice", `cena deve ser choice, got ${sceneEx.kind}`);
  assertNoDump(sceneEx.display, "cena display");
  assertNoSkip(sceneEx.options, "cena opções");

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

  // sentence_build → build com peças coerentes
  const buildError = {
    id: "test-build-1",
    lessonId: "l5",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "sentence_build",
    prompt: "Monte a frase",
    correctAnswer: "我很好",
    selectedAnswer: "很好我",
    hanzi: "我很好",
    pinyin: "wǒ hěn hǎo",
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "uso",
    targets: [{ type: "chunk", itemId: "wohenhao", domain: "significado", track: "fala" }],
    step: {
      kind: "sentence_build",
      prompt: "Monte a frase",
      correctAnswer: "我很好",
      targetParts: ["我", "很", "好"],
      bank: ["我", "很", "好", "你", "吗"],
    },
  };
  const buildEx = buildImmediateRemediationExercise(buildError);
  assert(buildEx.kind === "build", `sentence_build → build, got ${buildEx.kind}`);
  assert((buildEx.pieces ?? []).includes("我"), "build precisa da peça 我");
  assertNoDump(buildEx.answerPinyin, "build answerPinyin");
  assert(
    Boolean(buildEx.answerPinyin) && /w[oǒ]/i.test(buildEx.answerPinyin),
    `build pinyin alinhado: ${buildEx.answerPinyin}`
  );

  // recognize → hanzi meaning choice
  const recognizeError = {
    id: "test-recognize-1",
    lessonId: "l3",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "recognize",
    prompt: "Significado",
    correctAnswer: "eu / eu mesmo",
    selectedAnswer: "você",
    hanzi: "我",
    pinyin: "wǒ",
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "hanzi",
    targets: [{ type: "char", itemId: "wo", domain: "significado", track: "hanzi" }],
    step: {
      kind: "recognize",
      hanzi: "我",
      pinyin: "wǒ",
      correctAnswer: "eu / eu mesmo",
      options: ["eu / eu mesmo", "você", "bom"],
    },
  };
  const recognizeEx = buildImmediateRemediationExercise(recognizeError);
  assert(recognizeEx.kind === "hanzi" || recognizeEx.kind === "choice", `recognize kind: ${recognizeEx.kind}`);
  assert(recognizeEx.display === "我", `recognize display: ${recognizeEx.display}`);
  assertNoDump(recognizeEx.displayPinyin, "recognize pinyin");
  assertNoSkip(recognizeEx.options, "recognize opções");

  // listen_select → listen, sem misturar pt
  const listenError = {
    id: "test-listen-1",
    lessonId: "l4",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "listen_select",
    prompt: "Ouça",
    correctAnswer: "你好",
    selectedAnswer: "谢谢",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    meaningPt: "olá",
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "som",
    targets: [{ type: "chunk", itemId: "nihao", domain: "som", track: "som" }],
    step: {
      kind: "listen_select",
      options: ["你好", "谢谢", "再见"],
      correctAnswer: "你好",
      audioText: "你好",
    },
  };
  const listenEx = buildImmediateRemediationExercise(listenError);
  assert(listenEx.kind === "listen", `listen_select → listen, got ${listenEx.kind}`);
  assertNoSkip(listenEx.options, "listen opções");
  assert(
    !(listenEx.options ?? []).some((o) => o === "olá"),
    `listen não deve misturar significado pt: ${(listenEx.options ?? []).join(" | ")}`
  );

  // free_production → build (PieceAssembly path), alvo único, sem dump nas peças
  const freeProdError = {
    id: "test-free-prod-1",
    lessonId: "l6",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "free_production",
    prompt: "Situação: pedir chá",
    correctAnswer: "我要茶",
    selectedAnswer: "Pulou ou respondeu incorretamente",
    hanzi: dumpHanzi,
    pinyin: dumpPinyin,
    timestamp: Date.now(),
    wrongCount: 1,
    skill: "fala",
    targets: [{ type: "chunk", itemId: "woyaocha", domain: "significado", track: "fala" }],
    step: {
      kind: "free_production",
      prompt: "Situação: pedir chá",
      correctAnswer: "我要茶",
      targetParts: ["我", "要", "茶"],
      bank: ["我", "要", "茶", "不", "喝"],
    },
  };
  const freeProdEx = buildImmediateRemediationExercise(freeProdError);
  assert(freeProdEx.kind === "build", `free_production → build, got ${freeProdEx.kind}`);
  assert(freeProdEx.answer === "我要茶", `free_production answer: ${freeProdEx.answer}`);
  assertNoDump(freeProdEx.display, "free_production display");
  assertNoDump(freeProdEx.answerPinyin, "free_production answerPinyin");
  assert((freeProdEx.pieces ?? []).includes("我"), "free_production peças incluem 我");
  assertNoSkip(freeProdEx.pieces, "free_production peças");

  // transfer_task → build, mesmas garantias de alvo único
  const transferError = {
    ...freeProdError,
    id: "test-transfer-1",
    type: "transfer_task",
    step: {
      kind: "transfer_task",
      prompt: "Use o que aprendeu na situação",
      correctAnswer: "我不喝茶",
      targetParts: ["我", "不", "喝", "茶"],
      bank: ["我", "不", "喝", "茶", "要"],
    },
  };
  transferError.correctAnswer = "我不喝茶";
  const transferEx = buildImmediateRemediationExercise(transferError);
  assert(transferEx.kind === "build", `transfer_task → build, got ${transferEx.kind}`);
  assert(transferEx.answer === "我不喝茶", `transfer_task answer: ${transferEx.answer}`);
  assertNoDump(transferEx.display, "transfer_task display");
  assertNoSkip(transferEx.pieces, "transfer_task peças");

  // Restore path: activityErrorFromMistake não propaga dump de cena
  const lessonWithScene = ALL_LESSONS.find((lesson) =>
    lesson.steps.some((step) => step.kind === "conversation_scene" || step.kind === "dialogue_choice")
  );
  assert(Boolean(lessonWithScene), "precisa de lição com diálogo/cena no corpus");
  if (lessonWithScene) {
    const stepIndex = lessonWithScene.steps.findIndex(
      (step) => step.kind === "conversation_scene" || step.kind === "dialogue_choice"
    );
    const step = lessonWithScene.steps[stepIndex];
    const expected =
      step.correctAnswer ?? step.checkpoint?.correctAnswer ?? step.answer ?? "我很好";
    const restored = activityErrorFromMistake(
      {
        id: "restore-1",
        lessonId: lessonWithScene.id,
        questionId: `${lessonWithScene.id}:${stepIndex}:${step.kind}`,
        exerciseType: step.kind,
        prompt: "Escolha",
        expectedAnswer: expected,
        userAnswer: "Pulou ou respondeu incorretamente",
        explanation: dumpHanzi,
        createdAt: Date.now(),
      },
      lessonWithScene
    );
    assert(Boolean(restored), "activityErrorFromMistake deve restaurar");
    assertNoDump(restored.hanzi, "restored hanzi");
    assertNoDump(restored.pinyin, "restored pinyin");
    assert(isNonOptionAnswer(restored.selectedAnswer), "restored selectedAnswer status");
    const restoredEx = buildImmediateRemediationExercise(restored);
    assertNoDump(restoredEx.display, "restored display");
    assertNoSkip(restoredEx.options, "restored opções");
    assertNoDump(restoredEx.answerPinyin, "restored answerPinyin");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:immediate-remediation:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:immediate-remediation passou (B002 coerência + kinds + restore).");
