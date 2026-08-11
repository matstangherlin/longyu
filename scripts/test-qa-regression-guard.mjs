/**
 * Guarda de regressão QA — transferência, produção, revisão, estrela,
 * sentence build em revisão e contratos do player mobile.
 *
 * Protege contra bugs já vistos no QA humano (B002 e afins):
 * - dump concatenado de frases/pinyin na remediação;
 * - status “Pulou…” como alternativa;
 * - “Correto” / pinyin de outro item;
 * - transferência sem estrutura/situação/input;
 * - revisão de montagem sem peças;
 * - CTA/frame mobile quebrados.
 *
 * Roda: npm run test:qa-regression-guard
 *
 * No main bugado (pré-B002), este script FALHA.
 * Com as correções (#143/#144/#145+), PASSA.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-qa-regression-"));
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const assertNoDump = (value, label) => {
  assert(!value || !/[\u3400-\u9fff].*[\/|].*[\u3400-\u9fff]/.test(value), `${label} dump CJK: ${value}`);
  assert(!value || !(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(value) && /[\/|]/.test(value) && value.split(/[\/|]/).length >= 3), `${label} dump pinyin: ${value}`);
};

try {
  const program = ts.createProgram(
    [
      "src/features/lesson/immediateRemediation.ts",
      "src/features/lesson/lessonAttemptReview.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/buildAssemblyFeedback.ts",
      "src/data/errorDiagnosis.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/journey.ts",
      "src/data/productionTasks.ts",
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
  if (emit.emitSkipped) throw new Error("falha ao compilar módulos da guarda QA");

  const {
    buildImmediateRemediationExercise,
    isNonOptionAnswer,
    isConcatenatedDump,
  } = require(path.join(outDir, "src/features/lesson/immediateRemediation.js"));
  const { activityErrorFromMistake, getPendingAttemptReview } = require(
    path.join(outDir, "src/features/lesson/lessonAttemptReview.js")
  );
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { CHUNKS } = require(path.join(outDir, "src/data/chunks.js"));
  const { buildAssemblyFeedback } = require(
    path.join(outDir, "src/features/lesson/buildAssemblyFeedback.js")
  );

  const emptyCtx = {
    completedLessons: [],
    learnedChunks: [],
    learnedChars: [],
    hanziBuilderProgress: {},
    recentErrors: [],
    srs: {},
    recentConversationSceneIds: [],
    recentConversationIntentIds: [],
    conversationHistory: [],
    attemptNumber: 0,
    silent: true,
  };

  // ── 1) Transferência / produção: estrutura + situação ─────────────────
  let transferCount = 0;
  let freeCount = 0;
  let transferWithAnchor = 0;
  let transferWithSituation = 0;
  for (const lesson of ALL_LESSONS.slice(0, 100)) {
    const steps = lessonRoundStepsFor(lesson, emptyCtx);
    for (const step of steps) {
      if (step.kind === "transfer_task") {
        transferCount += 1;
        if (step.transferAnchorHanzi) transferWithAnchor += 1;
        if (step.situationPt || step.prompt) transferWithSituation += 1;
        assert(Boolean(step.transferAnchorHanzi), `transfer sem âncora: ${lesson.id}`);
        assert(Boolean(step.situationPt || step.prompt), `transfer sem situação: ${lesson.id}`);
        assert(Boolean(step.correctAnswer || step.answer), `transfer sem resposta: ${lesson.id}`);
      }
      if (step.kind === "free_production") {
        freeCount += 1;
        assert(Boolean(step.situationPt || step.prompt), `free sem situação: ${lesson.id}`);
      }
    }
  }
  assert(transferCount > 0, "amostra sem transfer_task");
  assert(freeCount > 0, "amostra sem free_production");
  assert(transferWithAnchor === transferCount, "nem todo transfer tem âncora");
  assert(transferWithSituation === transferCount, "nem todo transfer tem situação");

  const stepsSource = await readFile(path.join(rootDir, "src/features/lesson/steps.tsx"), "utf8");
  assert(stepsSource.includes('data-production-step={step.kind}'), "hook data-production-step");
  assert(stepsSource.includes("data-production-learned"), "hook data-production-learned");
  assert(stepsSource.includes("data-production-situation"), "hook data-production-situation");
  assert(stepsSource.includes("data-production-goal"), "hook data-production-goal");
  assert(stepsSource.includes("data-production-answer"), "hook data-production-answer");
  assert(stepsSource.includes("Você já aprendeu"), "copy âncora transferência");
  assert(!/Nenhuma alternativa e nenhuma peça/.test(stepsSource), "meta-copy pesada removida");

  // ── 2–6) Revisão: item único, pinyin↔hanzi, sem dump, sem status ──────
  assert(typeof isConcatenatedDump === "function", "isConcatenatedDump exportado");
  assert(isConcatenatedDump("你好 / 你好吗 / 我很好"), "detecta dump CJK");
  assert(isNonOptionAnswer("Pulou ou respondeu incorretamente"), "status de pulo filtrado");
  assert(isNonOptionAnswer("Resposta incorreta"), "status genérico filtrado");

  const dumpHanzi = "你好 / 你好吗 / 我很好 / 谢谢 / 再见";
  const dumpPinyin = "nǐ hǎo / nǐ hǎo ma / wǒ hěn hǎo / xièxie / zàijiàn";
  const dialogueError = {
    id: "qa-dialogue-1",
    lessonId: "l2",
    moduleId: "u1",
    phaseId: "p1",
    taskId: "t1",
    questionId: "q1",
    exerciseId: "e1",
    type: "dialogue_choice",
    prompt: "Escolha a resposta correta (cena: cumprimento completo)",
    correctAnswer: "我很好",
    selectedAnswer: "Pulou ou respondeu incorretamente",
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
      dialoguePrompt: "你好吗？",
      prompt: "Como você responde que está bem?",
      options: ["谢谢", "我很好", "你好", "再见", "Pulou ou respondeu incorretamente"],
      correctAnswer: "我很好",
      explanation: "我很好 significa estou bem.",
    },
  };

  const exercise = buildImmediateRemediationExercise(dialogueError);
  assert(exercise.kind === "choice", `diálogo deve ser choice, got ${exercise.kind}`);
  assert(exercise.answer === "我很好", `answer único: ${exercise.answer}`);
  assertNoDump(exercise.display, "display");
  assertNoDump(exercise.prompt, "prompt");
  assertNoDump(exercise.answerPinyin, "answerPinyin");
  assertNoDump(exercise.displayPinyin, "displayPinyin");
  assertNoDump(exercise.explanation, "explanation");
  assert(
    !(exercise.options ?? []).some((o) => /pulou|incorretamente/i.test(o)),
    `opções com status: ${(exercise.options ?? []).join(" | ")}`
  );
  assert((exercise.options ?? []).includes("我很好"), "opções incluem a resposta correta");
  assert(exercise.canRecoverStar === true, "canRecoverStar");

  // 3) pinyin da resposta corresponde ao hanzi da resposta (não ao dump)
  const chunk = CHUNKS.find((c) => c.hanzi.replace(/\s+/g, "") === "我很好");
  if (chunk?.pinyin && exercise.answerPinyin) {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
    assert(
      norm(exercise.answerPinyin).includes(norm(chunk.pinyin).slice(0, 4)) ||
        /w[oǒ]|hěn|hǎo/i.test(exercise.answerPinyin),
      `pinyin desalinhado: answer=${exercise.answer} pinyin=${exercise.answerPinyin}`
    );
  } else {
    assert(
      Boolean(exercise.answerPinyin) && /w[oǒ]|hěn|hǎo/i.test(exercise.answerPinyin),
      `answerPinyin ausente/errado: ${exercise.answerPinyin}`
    );
  }

  // 4) “correto” não vem de item diferente
  assert(exercise.answerDisplay === "我很好" || exercise.answer === "我很好", "answerDisplay coerente");
  assert(!String(exercise.answer).includes("/"), "answer sem concatenação");

  // Cena com dump no hanzi do erro
  const sceneError = {
    ...dialogueError,
    id: "qa-scene-1",
    type: "conversation_scene",
    step: {
      kind: "conversation_scene",
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
  assert(sceneEx.kind === "choice", `cena → choice, got ${sceneEx.kind}`);
  assertNoDump(sceneEx.display, "cena display");
  assertNoDump(sceneEx.answerPinyin, "cena answerPinyin");
  assert(!(sceneEx.options ?? []).some((o) => /pulou/i.test(o)), "cena sem status");

  // Source guard: LessonPlayer não junta falas da cena com " / "
  const playerSource = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert(
    !/lines\?\.map\(\(line\) => line\.hanzi\)\.filter\(Boolean\)\.join\(" \/ "\)/.test(playerSource),
    "errorHanziForStep ainda concatena lines com / (bug B002)"
  );
  assert(/Único alvo|único alvo|Sempre um ÚNICO|correctAnswer \?\?/.test(playerSource), "errorHanziForStep usa alvo único");

  // ── 7) Recuperação de estrela ponta a ponta (dados) ───────────────────
  const lessonWithDialogue = ALL_LESSONS.find((lesson) =>
    lesson.steps.some((s) => s.kind === "dialogue_choice" || s.kind === "conversation_scene")
  );
  assert(Boolean(lessonWithDialogue), "precisa de lição com diálogo/cena");
  const stepIndex = lessonWithDialogue.steps.findIndex(
    (s) => s.kind === "dialogue_choice" || s.kind === "conversation_scene"
  );
  const step = lessonWithDialogue.steps[stepIndex];
  const expected = step.correctAnswer ?? step.checkpoint?.correctAnswer ?? step.answer ?? "我很好";
  const mistake = {
    id: "qa-mistake-1",
    lessonId: lessonWithDialogue.id,
    questionId: `${lessonWithDialogue.id}:${stepIndex}:${step.kind}`,
    exerciseType: step.kind,
    prompt: "Escolha",
    expectedAnswer: expected,
    userAnswer: "Pulou ou respondeu incorretamente",
    explanation: dumpHanzi,
    createdAt: Date.now(),
  };
  const restored = activityErrorFromMistake(mistake, lessonWithDialogue);
  assert(Boolean(restored), "activityErrorFromMistake restaura");
  assertNoDump(restored.hanzi, "restored.hanzi");
  assertNoDump(restored.pinyin, "restored.pinyin");
  assert(isNonOptionAnswer(restored.selectedAnswer), "restored selectedAnswer é status");
  const restoredEx = buildImmediateRemediationExercise(restored);
  assert(restoredEx.canRecoverStar === true, "restored canRecoverStar");
  assertNoDump(restoredEx.display, "restored display");
  assert(
    !(restoredEx.options ?? []).some((o) => /pulou|incorretamente/i.test(o)),
    "restored opções limpas"
  );

  const pending = getPendingAttemptReview(
    lessonWithDialogue.id,
    {
      [lessonWithDialogue.id]: [
        {
          id: "attempt-1",
          lessonId: lessonWithDialogue.id,
          finalStars: 2,
          correctCount: 3,
          mistakes: [mistake],
          recoveredMistakes: [],
          createdAt: Date.now(),
        },
      ],
    },
    lessonWithDialogue
  );
  assert(Boolean(pending), "getPendingAttemptReview encontra 2★ com erros");
  assert(pending.errors.length === 1, `pending.errors=${pending.errors.length}`);
  assert(pending.finalStars === 2, "pending finalStars 2");

  // ── 8) Sentence build em revisão: peças corretas ──────────────────────
  const buildError = {
    id: "qa-build-1",
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
  assert((buildEx.pieces ?? []).includes("我"), "peça 我 presente");
  assert((buildEx.pieces ?? []).includes("很"), "peça 很 presente");
  assert((buildEx.pieces ?? []).includes("好"), "peça 好 presente");
  assert(!(buildEx.pieces ?? []).some((p) => /pulou|incorretamente|\//i.test(p)), "peças limpas");
  assertNoDump(buildEx.answerPinyin, "build answerPinyin");

  const orderHint = buildAssemblyFeedback({
    picked: ["我", "好", "很"],
    target: ["我", "很", "好"],
    requiredCount: 3,
    kind: "sentence_build",
  });
  assert(/ordem|lugar|primeir/i.test(orderHint.message), `hint ordem: ${orderHint.message}`);
  assert(!orderHint.message.includes("我很好"), "hint não entrega frase completa");

  assert(playerSource.includes("PieceAssemblyBoard") || playerSource.includes("PieceAssemblyTray"), "revisão usa PieceAssembly");
  assert(stepsSource.includes("PieceAssemblyBoard") || stepsSource.includes("buildAssemblyFeedback"), "lição usa assembly UX");

  // ── 9–10) Contratos mobile: CTA sticky + frame ────────────────────────
  assert(playerSource.includes("data-lesson-player-frame") || playerSource.includes("data-lesson-player"), "frame do player");
  assert(
    stepsSource.includes("data-lesson-sticky-actions") || playerSource.includes("data-lesson-sticky-actions") || stepsSource.includes("StickyActionBar"),
    "sticky actions presentes"
  );
  // StickyActionBar is in steps.tsx
  assert(/function StickyActionBar|data-lesson-sticky-actions/.test(stepsSource), "StickyActionBar definido");
  assert(/mt-auto/.test(stepsSource), "CTA com mt-auto (acessível no fundo)");

  console.log(
    `OK amostra: transfer=${transferCount} free=${freeCount} review=choice/build star=pending assembly=ok`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:qa-regression-guard:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:qa-regression-guard passou (QA B002+transfer+star+build+mobile contracts).");
