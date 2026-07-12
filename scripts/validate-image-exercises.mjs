import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-image-exercises-"));

const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function hasDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    const key = norm(value);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

try {
  const program = ts.createProgram(
    [
      "src/data/visualVocabulary.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
      "src/data/chunks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/features/revisao/reviewExerciseBuilder.ts",
      "src/lib/srs.ts",
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
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:image-exercises.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
  const { VISUAL_CONCEPTS, VISUAL_CONCEPT_IDS, resolveVisualConcept, isVisualConceptAllowed } = load(
    "src/data/visualVocabulary.js"
  );
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { validateReviewExercise, buildImageChoiceReview } = load("src/features/revisao/reviewExerciseBuilder.js");
  const { newItem } = load("src/lib/srs.js");

  const units = JOURNEY.flatMap((phase) => phase.units);
  const unitIndexById = new Map(units.map((unit, index) => [unit.id, index]));

  if (VISUAL_CONCEPT_IDS.length < 10) {
    err("catalog", "visual", "Esperava ao menos 10 conceitos visuais iniciais.");
  }

  for (const concept of VISUAL_CONCEPTS) {
    if (!concept.id || !concept.charId || !concept.hanzi) err("catalog", concept.id, "Conceito visual incompleto.");
    if (String(concept.emoji ?? "").includes("http")) err("catalog", concept.id, "Emoji/ícone externo detectado.");
    if (!resolveVisualConcept(concept.id)) err("catalog", concept.id, "resolveVisualConcept falhou.");
  }

  const imageSteps = [];
  for (const lesson of ALL_LESSONS) {
    const unitIndex = unitIndexById.get(lesson.unitId) ?? -1;
    for (const [stepIndex, step] of (lesson.steps ?? []).entries()) {
      if (step.kind !== "image_choice") continue;
      const ref = `${lesson.id}#${stepIndex + 1}`;
      imageSteps.push({ lesson, step, ref, unitIndex });

      const validation = validateExercise(step);
      if (!validation.valid) {
        for (const message of validation.errors) err("step", ref, message);
      }

      const imagePick = step.imageChoiceMode === "choose_image" || step.imageChoiceMode === "listen_and_choose_image";
      const answer = imagePick ? step.correctImageId : step.correctAnswer;
      const options = imagePick ? step.imageOptions ?? [] : step.options ?? [];

      if (!answer) err("step", ref, "sem resposta correta");
      if (options.length < 2) err("step", ref, "menos de 2 opções");
      if (hasDuplicate(options)) err("step", ref, "opções duplicadas");
      if (!options.some((option) => norm(option) === norm(answer))) err("step", ref, "resposta correta fora das opções");

      // Proxy de renderização mobile: a grade é 2 colunas — mais de 4 opções
      // estoura a dobra em 360×667; prompt longo empurra as opções para fora.
      if (options.length > 4) err("mobile", ref, `${options.length} opções não cabem na grade 2×2 do mobile`);
      const promptText = String(step.promptPt ?? step.prompt ?? "");
      if (promptText.length > 90) err("mobile", ref, `prompt com ${promptText.length} chars (máx. 90 para mobile)`);

      // Nunca imagem externa: ids internos apenas, sem URL/caminho de arquivo.
      for (const field of [step.imageId, step.iconId, step.correctImageId, ...(step.imageOptions ?? [])]) {
        const value = String(field ?? "");
        if (/https?:|\/|\.png|\.jpe?g|\.webp|\.gif|\.svg/iu.test(value)) {
          err("step", ref, `referência de imagem externa/arquivo: "${value}"`);
        }
      }

      const conceptId = step.imageId ?? step.iconId;
      if (!resolveVisualConcept(conceptId)) err("step", ref, `imageId desconhecido: ${conceptId}`);
      if (imagePick) {
        for (const option of options) {
          if (!resolveVisualConcept(option)) err("step", ref, `imageOption desconhecida: ${option}`);
        }
      }

      if (conceptId && unitIndex >= 0 && !isVisualConceptAllowed(conceptId, unitIndex)) {
        err("progression", ref, `conceito "${conceptId}" aparece antes de ser ensinado (unidade ${unitIndex}).`);
      }
    }
  }

  if (imageSteps.length === 0) {
    err("journey", "image_choice", "Nenhum passo image_choice encontrado na jornada.");
  }

  const modes = new Set(imageSteps.map((entry) => entry.step.imageChoiceMode));
  for (const required of ["choose_hanzi", "choose_pinyin", "listen_and_choose_image", "choose_image"]) {
    if (!modes.has(required)) err("modes", required, "Modo obrigatório ausente na jornada.");
  }

  if (typeof buildImageChoiceReview !== "function") {
    err("review", "buildImageChoiceReview", "Builder de revisão visual ausente.");
  } else {
    const reviewSample = buildImageChoiceReview(
      {
        item: newItem("char", "mu", { reviewDomain: "forma" }),
        learnedItems: [],
        domain: "forma",
      },
      { type: "char", itemId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore" }
    );
    if (!validateReviewExercise(reviewSample)) {
      err("review", "buildImageChoiceReview", "Revisão visual gerada inválida.");
    }
  }

  if (errors.length > 0) {
    console.error(`validate:image-exercises falhou com ${errors.length} problema(s):`);
    for (const issue of errors) {
      console.error(`- [${issue.area}] ${issue.ref}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`validate:image-exercises OK (${imageSteps.length} passos · ${VISUAL_CONCEPT_IDS.length} ícones).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
