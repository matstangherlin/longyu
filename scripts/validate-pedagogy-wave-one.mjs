import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-pedagogy-wave-one-"));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/features/arcade/blitzEngine.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
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
  assert(!emit.emitSkipped, "falha ao compilar o grafo pedagógico TypeScript");
  if (emit.emitSkipped) throw new Error(failures[0]);

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { lessonRoundStepsFor, practiceVariantForAttempt } = load("src/features/lesson/lessonTasks.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { buildMandarinBlitzDeck } = load("src/features/arcade/blitzEngine.js");

  const expectedVariants = [
    "audio_same_different",
    "dragon_dictation",
    "meaning_odd_one_out",
    "meaning_spot_error",
    "meaning_intention_match",
    "sentence_lab_distractors",
    "sentence_lab_no_translation",
    "sentence_lab_audio",
    "sentence_lab_repair",
  ];
  const variantCounts = new Map(expectedVariants.map((variant) => [variant, 0]));
  const dictationCounts = new Map(["blocks", "pinyin", "hanzi", "immersion"].map((mode) => [mode, 0]));
  let rotatedLessons = 0;
  let lessonsWithVariants = 0;
  let alternateSentenceAnswers = 0;

  assert(practiceVariantForAttempt(0) === "A", "tentativa 0 deveria usar variante A");
  assert(practiceVariantForAttempt(1) === "B", "tentativa 1 deveria usar variante B");
  assert(practiceVariantForAttempt(2) === "C", "tentativa 2 deveria usar variante C");
  assert(practiceVariantForAttempt(3) === "A", "tentativa 3 deveria reiniciar em A");

  for (const lesson of ALL_LESSONS) {
    const signatures = [];
    let lessonHasVariant = false;
    for (const attemptNumber of [0, 1, 2]) {
      const plan = lessonRoundStepsFor(lesson, { attemptNumber, silent: true });
      signatures.push(plan.map((step) => `${step.pedagogyVariant ?? step.kind}:${step.correctAnswer ?? step.answer ?? ""}`).join("|"));
      assert(plan.every((step) => step.practiceVariant === practiceVariantForAttempt(attemptNumber)), `${lesson.id}: metadado A/B/C inconsistente`);
      for (const step of plan) {
        if (!step.pedagogyVariant) continue;
        lessonHasVariant = true;
        variantCounts.set(step.pedagogyVariant, (variantCounts.get(step.pedagogyVariant) ?? 0) + 1);
        if (step.dictationMode) dictationCounts.set(step.dictationMode, (dictationCounts.get(step.dictationMode) ?? 0) + 1);
        if ((step.acceptedTargetParts?.length ?? 0) > 0) alternateSentenceAnswers += 1;
        const validation = validateExercise(step);
        assert(validation.valid, `${lesson.id}/${step.pedagogyVariant}: ${validation.errors.join("; ")}`);
        if (step.pedagogyVariant === "audio_same_different" || step.pedagogyVariant === "dragon_dictation") {
          assert(step.isNoHint || step.helpMode === "disabled", `${lesson.id}/${step.pedagogyVariant}: áudio avaliativo revelou dica`);
        }
      }
    }
    if (lessonHasVariant) lessonsWithVariants += 1;
    if (new Set(signatures).size >= 2) rotatedLessons += 1;
  }

  for (const variant of expectedVariants) {
    assert((variantCounts.get(variant) ?? 0) > 0, `variante sem cobertura real: ${variant}`);
  }
  for (const mode of ["blocks", "pinyin", "hanzi", "immersion"]) {
    assert((dictationCounts.get(mode) ?? 0) > 0, `modo de ditado sem cobertura real: ${mode}`);
  }
  assert(lessonsWithVariants >= Math.floor(ALL_LESSONS.length * 0.75), `só ${lessonsWithVariants}/${ALL_LESSONS.length} lições receberam nova prática`);
  assert(rotatedLessons >= Math.floor(ALL_LESSONS.length * 0.65), `só ${rotatedLessons}/${ALL_LESSONS.length} lições realmente giraram A/B/C`);
  assert(alternateSentenceAnswers > 0, "Sentence Lab não expôs nenhuma resposta gramatical alternativa");

  const deck = buildMandarinBlitzDeck(CHUNKS, CHARACTERS, "validator");
  const expectedKinds = ["audio_to_hanzi", "hanzi_to_meaning", "meaning_to_hanzi", "missing_piece", "tone_number"];
  const actualKinds = new Set(deck.map((question) => question.kind));
  const chunkIds = new Set(CHUNKS.map((chunk) => chunk.id));
  const charIds = new Set(CHARACTERS.map((character) => character.id));
  const questionIds = new Set();
  for (const kind of expectedKinds) assert(actualKinds.has(kind), `Mandarin Blitz sem pergunta ${kind}`);
  for (const question of deck) {
    assert(!questionIds.has(question.id), `Mandarin Blitz duplicou id ${question.id}`);
    questionIds.add(question.id);
    assert(question.options.length >= 2, `${question.id}: menos de duas opções`);
    assert(new Set(question.options).size === question.options.length, `${question.id}: opções duplicadas`);
    assert(question.options.includes(question.answer), `${question.id}: resposta fora das opções`);
    assert(
      question.sourceType === "chunk" ? chunkIds.has(question.sourceId) : charIds.has(question.sourceId),
      `${question.id}: referência não desbloqueável`
    );
  }

  console.log(`Planos: ${ALL_LESSONS.length} lições × 3 tentativas; ${rotatedLessons} com rotação real.`);
  console.log(`Variantes: ${[...variantCounts].map(([key, value]) => `${key}=${value}`).join(", ")}.`);
  console.log(`Ditado: ${[...dictationCounts].map(([key, value]) => `${key}=${value}`).join(", ")}.`);
  console.log(`Mandarin Blitz: ${deck.length} perguntas; 5 motores cobertos.`);

  if (failures.length > 0) {
    console.error("\nFalhas da onda pedagógica:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: onda pedagógica 1 validada.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
