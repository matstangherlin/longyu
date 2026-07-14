import { createRequire } from "node:module";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-image-exercises-"));
const MAX_IMAGE_BYTES = 200 * 1024;

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

const REQUIRED_CANONICAL_MODES = [
  "image_to_hanzi",
  "image_to_pinyin",
  "image_to_meaning",
  "image_to_audio",
  "audio_to_image",
  "hanzi_to_image",
  "meaning_to_image",
  "image_sentence_choice",
];

try {
  const program = ts.createProgram(
    [
      "src/data/visualVocabulary.ts",
      "src/data/visualScenes.ts",
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
  const {
    VISUAL_CONCEPTS,
    VISUAL_CONCEPT_IDS,
    CANONICAL_IMAGE_CHOICE_MODES,
    resolveVisualConcept,
    isVisualConceptAllowed,
    normalizeImageChoiceMode,
    imageChoiceUsesImageOptions,
  } = load("src/data/visualVocabulary.js");
  const { VISUAL_SCENES, VISUAL_SCENE_IDS, resolveVisualScene, isVisualSceneAllowed } = load("src/data/visualScenes.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { validateReviewExercise, buildImageChoiceReview } = load("src/features/revisao/reviewExerciseBuilder.js");
  const { newItem } = load("src/lib/srs.js");

  const units = JOURNEY.flatMap((phase) => phase.units);
  const unitIndexById = new Map(units.map((unit, index) => [unit.id, index]));

  if (VISUAL_CONCEPT_IDS.length < 10) {
    err("catalog", "visual", "Esperava ao menos 10 conceitos visuais iniciais.");
  }

  if (VISUAL_SCENE_IDS.length < 12) {
    err("scenes", "visual", `Esperava ao menos 12 cenas visuais (encontrou ${VISUAL_SCENE_IDS.length}).`);
  }

  for (const scene of VISUAL_SCENES) {
    if (!scene.id || !scene.imageSrc || !scene.imageAltPt?.trim()) {
      err("scenes", scene.id, "Cena visual incompleta (id, imageSrc, alt).");
    }
    if (!scene.targetRef || !scene.targetHanzi || !scene.targetPinyin || !scene.targetMeaningPt) {
      err("scenes", scene.id, "Cena sem alvo pedagógico completo.");
    }
    if (!Array.isArray(scene.allowedAfterLessons) || scene.allowedAfterLessons.length === 0) {
      err("scenes", scene.id, "Cena sem allowedAfterLessons.");
    }
    if (!Array.isArray(scene.tags) || scene.tags.length === 0) {
      err("scenes", scene.id, "Cena sem tags.");
    }
    if (!resolveVisualScene(scene.id)) err("scenes", scene.id, "resolveVisualScene falhou.");
    const localImagePath = path.join(rootDir, "src/assets/visuals", scene.imageSrc);
    try {
      const info = await stat(localImagePath);
      const metadata = await sharp(localImagePath).metadata();
      if (info.size > MAX_IMAGE_BYTES) {
        err("scenes", scene.id, `Imagem muito pesada: ${Math.ceil(info.size / 1024)} KB.`);
      }
      if ((metadata.width ?? 0) > 600 || (metadata.height ?? 0) > 600) {
        err("scenes", scene.id, `Imagem acima de 600 px: ${metadata.width}x${metadata.height}.`);
      }
    } catch {
      err("scenes", scene.id, `Arquivo de imagem não encontrado: ${localImagePath}`);
    }
  }

  for (const concept of VISUAL_CONCEPTS) {
    if (!concept.id || !concept.charId || !concept.hanzi) err("catalog", concept.id, "Conceito visual incompleto.");
    if (!String(concept.imageAltPt ?? "").trim()) err("catalog", concept.id, "Alt da imagem está vazio.");
    if (!["photo", "illustration", "svg_fallback"].includes(concept.imageKind)) {
      err("catalog", concept.id, `imageKind inválido: ${concept.imageKind}`);
    }
    if (!concept.imageSrc && !String(concept.emoji ?? "").trim()) {
      err("catalog", concept.id, "Conceito sem imagem nem fallback.");
    }
    if (/^https?:\/\//i.test(String(concept.imageSrc ?? "")) || /^https?:\/\//i.test(String(concept.emoji ?? ""))) {
      err("catalog", concept.id, "Imagem externa via http/https detectada.");
    }
    if (concept.imageSrc) {
      const localImagePath = path.join(rootDir, "src/assets/visuals", concept.imageSrc);
      try {
        const info = await stat(localImagePath);
        const metadata = await sharp(localImagePath).metadata();
        if (info.size > MAX_IMAGE_BYTES) {
          err("catalog", concept.id, `Imagem muito pesada: ${Math.ceil(info.size / 1024)} KB (máximo ${MAX_IMAGE_BYTES / 1024} KB).`);
        }
        if ((metadata.width ?? 0) > 600 || (metadata.height ?? 0) > 600) {
          err("catalog", concept.id, `Imagem acima de 600 px: ${metadata.width}x${metadata.height}.`);
        }
      } catch {
        err("catalog", concept.id, `Arquivo de imagem não encontrado: ${localImagePath}`);
      }
    }
    if (!resolveVisualConcept(concept.id)) err("catalog", concept.id, "resolveVisualConcept falhou.");
  }

  const imageSteps = [];
  const lessonVisualCounts = new Map();

  for (const lesson of ALL_LESSONS) {
    const unitIndex = unitIndexById.get(lesson.unitId) ?? -1;
    let visualCount = 0;
    for (const [stepIndex, step] of (lesson.steps ?? []).entries()) {
      if (step.kind !== "image_choice") continue;
      visualCount += 1;
      const ref = `${lesson.id}#${stepIndex + 1}`;
      imageSteps.push({ lesson, step, ref, unitIndex });

      const validation = validateExercise(step);
      if (!validation.valid) {
        for (const message of validation.errors) err("step", ref, message);
      }

      const normalized = normalizeImageChoiceMode(step.imageChoiceMode);
      if (!CANONICAL_IMAGE_CHOICE_MODES.includes(normalized)) {
        err("step", ref, `modo desconhecido: ${step.imageChoiceMode}`);
      }

      const imagePick = imageChoiceUsesImageOptions(step.imageChoiceMode);
      const answer = imagePick ? step.correctImageId : step.correctAnswer;
      const options = imagePick ? step.imageOptions ?? [] : step.options ?? [];

      if (!answer) err("step", ref, "sem resposta correta");
      if (options.length < 2) err("step", ref, "menos de 2 opções");
      if (hasDuplicate(options)) err("step", ref, "opções duplicadas");
      if (!options.some((option) => norm(option) === norm(answer))) err("step", ref, "resposta correta fora das opções");

      if (options.length > 4) err("mobile", ref, `${options.length} opções não cabem na grade 2×2 do mobile`);
      const promptText = String(step.promptPt ?? step.prompt ?? "");
      if (promptText.length > 90) err("mobile", ref, `prompt com ${promptText.length} chars (máx. 90 para mobile)`);

      for (const field of [step.imageId, step.iconId, step.correctImageId, step.visualSceneId, ...(step.imageOptions ?? [])]) {
        const value = String(field ?? "");
        if (/https?:|\.png|\.jpe?g|\.webp|\.gif|\.svg/iu.test(value) && !VISUAL_SCENE_IDS.includes(value)) {
          err("step", ref, `referência de imagem externa/arquivo: "${value}"`);
        }
      }

      if (step.visualSceneId) {
        const scene = resolveVisualScene(step.visualSceneId);
        if (!scene) err("step", ref, `visualSceneId desconhecido: ${step.visualSceneId}`);
        else if (!isVisualSceneAllowed(step.visualSceneId, lesson.id)) {
          err("progression", ref, `cena "${step.visualSceneId}" não permitida na lição ${lesson.id}.`);
        }
      }

      const conceptId = step.imageId ?? step.iconId ?? resolveVisualScene(step.visualSceneId)?.conceptId;
      const concept = resolveVisualConcept(conceptId);
      if (!concept && !step.visualSceneId) err("step", ref, `imageId desconhecido: ${conceptId}`);
      else if (concept) {
        if (!concept.imageSrc && !concept.emoji) err("step", ref, "image_choice sem imagem nem fallback");
        if (!String(concept.imageAltPt ?? "").trim()) err("step", ref, "image_choice com alt vazio");
      }
      if (imagePick) {
        for (const option of options) {
          const optionConcept = resolveVisualConcept(option);
          if (!optionConcept) err("step", ref, `imageOption desconhecida: ${option}`);
          else if (!optionConcept.imageSrc && !optionConcept.emoji) err("step", ref, `imageOption sem imagem nem fallback: ${option}`);
        }
      }

      if (conceptId && unitIndex >= 0 && !step.visualSceneId && !isVisualConceptAllowed(conceptId, unitIndex)) {
        err("progression", ref, `conceito "${conceptId}" aparece antes de ser ensinado (unidade ${unitIndex}).`);
      }
    }

    if (visualCount > 0) {
      lessonVisualCounts.set(lesson.id, visualCount);
      const maxAllowed = lesson.isReview ? 3 : 2;
      if (visualCount > maxAllowed) {
        err("density", lesson.id, `${visualCount} exercícios visuais (máx. ${maxAllowed} por lição${lesson.isReview ? " de revisão" : ""}).`);
      }
    }
  }

  if (imageSteps.length === 0) {
    err("journey", "image_choice", "Nenhum passo image_choice encontrado na jornada.");
  }

  const modes = new Set(imageSteps.map((entry) => normalizeImageChoiceMode(entry.step.imageChoiceMode)));
  for (const required of REQUIRED_CANONICAL_MODES) {
    if (!modes.has(required)) err("modes", required, "Modo canônico ausente na jornada.");
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
    console.log(
      `validate:image-exercises OK (${imageSteps.length} passos · ${VISUAL_CONCEPT_IDS.length} conceitos · ${VISUAL_SCENE_IDS.length} cenas).`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
