import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-compare-image-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/visualVocabulary.ts",
      "src/data/characters.ts",
      "src/data/chunks.ts",
      "src/data/types.ts",
      "src/features/lesson/exerciseValidation.ts",
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
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript não compilou o validador de compare_with_image");

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { resolveVisualConcept, isVisualConceptAllowed } = require(
    path.join(outDir, "src/data/visualVocabulary.js")
  );
  const { validateExercise } = require(path.join(outDir, "src/features/lesson/exerciseValidation.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const units = [];
  for (const lesson of ALL_LESSONS) {
    if (!units.includes(lesson.unitId)) units.push(lesson.unitId);
  }

  const rows = [];
  for (const lesson of ALL_LESSONS) {
    const unitIndex = units.indexOf(lesson.unitId);
    for (const [index, step] of lesson.steps.entries()) {
      if (step.kind !== "compare_with_image") continue;
      const ref = `${lesson.id}#${index + 1}`;
      rows.push({ lesson, step, ref });
      const result = validateExercise(step);
      for (const error of result.errors) fail(`${ref}: ${error}`);

      const imagePick = step.compareWithImageMode === "word_to_image";
      const answer = imagePick ? step.correctImageId : step.correctAnswer;
      const options = imagePick ? step.imageOptions ?? [] : step.options ?? [];
      if (options.length !== 2) fail(`${ref}: comparação precisa de exatamente 2 opções`);
      if (!options.includes(answer)) fail(`${ref}: resposta correta fora das opções`);
      if (new Set(options).size !== options.length) fail(`${ref}: opções duplicadas`);
      if (!isVisualConceptAllowed(step.imageId, unitIndex)) {
        fail(`${ref}: conceito ${step.imageId} apareceu antes da unidade permitida`);
      }
      if (imagePick) {
        for (const option of options) {
          const concept = resolveVisualConcept(option);
          if (!concept?.imageSrc) fail(`${ref}: opção ${option} sem asset local`);
          if (concept?.imageOnlySafe === false) fail(`${ref}: opção relacional ambígua ${option}`);
        }
      }

      const comparedConcepts = imagePick
        ? options.map((option) => resolveVisualConcept(option)).filter(Boolean)
        : [resolveVisualConcept(step.imageId), ...options.map((option) => resolveVisualConcept(option))].filter(Boolean);
      const earlierSteps = lesson.steps.slice(0, index);
      const earlierText = earlierSteps
        .flatMap((earlier) => [
          earlier.text,
          earlier.hanzi,
          earlier.audioText,
          earlier.targetHanzi,
          earlier.imageId,
          earlier.correctImageId,
          ...(earlier.imageOptions ?? []),
        ])
        .filter(Boolean)
        .join(" ");
      for (const concept of comparedConcepts) {
        if (concept.afterUnitIndex < unitIndex) continue;
        if (!earlierText.includes(concept.id) && !earlierText.includes(concept.hanzi)) {
          fail(`${ref}: comparação cobra ${concept.hanzi} antes de qualquer scaffold na lição`);
        }
      }
    }
  }

  const levels = new Set(rows.map(({ step }) => step.compareWithImageLevel));
  for (const level of [1, 2, 3]) {
    if (!levels.has(level)) fail(`progressão sem exemplo de nível ${level}`);
  }
  const modes = new Set(rows.map(({ step }) => step.compareWithImageMode));
  for (const mode of ["word_to_image", "image_to_word"]) {
    if (!modes.has(mode)) fail(`modo obrigatório ausente: ${mode}`);
  }
  if (rows.length < 4) fail(`esperava pelo menos 4 passos autorais; encontrei ${rows.length}`);

  const lessonsWithCompare = new Map(rows.map(({ lesson }) => [lesson.id, lesson]));
  for (const lesson of lessonsWithCompare.values()) {
    const planned = lessonRoundStepsFor(lesson, { silent: true }).filter(
      (step) => step.kind === "compare_with_image"
    );
    if (planned.length === 0) {
      fail(`${lesson.id}: compare_with_image autoral não chegou ao plano real`);
    }
  }

  if (failures.length > 0) {
    console.error("FAIL validate:compare-with-image:");
    for (const message of failures) console.error(` - ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: validate:compare-with-image (${rows.length} passos · níveis 1–3 · 2 modos).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
