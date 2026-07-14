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

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;

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
      strict: false,
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
  const {
    VISUAL_SCENES,
    VISUAL_SCENE_IDS,
    resolveVisualScene,
    sceneHasExplicitTarget,
    sceneTargetHanzi,
  } = load("src/data/visualScenes.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { validateReviewExercise, buildImageChoiceReview } = load("src/features/revisao/reviewExerciseBuilder.js");
  const { newItem } = load("src/lib/srs.js");

  const units = JOURNEY.flatMap((phase) => phase.units);
  const unitIndexById = new Map(units.map((unit, index) => [unit.id, index]));
  const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
  const taughtChunksByLesson = new Map();
  for (const lesson of ALL_LESSONS) {
    const refs = new Set();
    for (const item of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      const [type, id] = String(item).split(":");
      if (type === "chunk" && id) refs.add(id);
    }
    taughtChunksByLesson.set(lesson.id, refs);
  }

  if (VISUAL_CONCEPT_IDS.length < 10) {
    err("catalog", "visual", "Esperava ao menos 10 conceitos visuais iniciais.");
  }
  if (!Array.isArray(VISUAL_SCENES) || VISUAL_SCENES.length < 10) {
    err("catalog", "scenes", `Esperava ao menos 10 VisualScene (achou ${VISUAL_SCENES?.length ?? 0}).`);
  }

  async function assertLocalImage(relPath, ref) {
    const localImagePath = path.join(rootDir, "src/assets/visuals", relPath);
    try {
      const info = await tipToStat(localImagePath);
      const metadata = await sharp(localImagePath).metadata();
      if (info.size > MAX_IMAGE_BYTES) {
        err("catalog", ref, `Imagem muito pesada: ${Math.ceil(info.size / 1024)} KB (máximo ${MAX_IMAGE_BYTES / 1024} KB).`);
      }
      if ((metadata.width ?? 0) > 600 || (metadata.height ?? 0) > 600) {
        err("catalog", ref, `Imagem acima de 600 px: ${metadata.width}x${metadata.height}.`);
      }
    } catch {
      err("catalog", ref, `Arquivo de imagem não encontrado: ${localImagePath}`);
    }
  }

  async function tipToStat(p) {
    return stat(p);
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
    if (/^https?:\/\//i.test(String(concept.imageSrc ?? ""))) {
      err("catalog", concept.id, "Imagem externa via http/https detectada.");
    }
    if (concept.imageSrc) await assertLocalImage(concept.imageSrc, concept.id);
    if (!resolveVisualConcept(concept.id)) err("catalog", concept.id, "resolveVisualConcept falhou.");
  }

  for (const scene of VISUAL_SCENES) {
    const ref = scene.id ?? "(sem-id)";
    if (!scene.id || !scene.imageSrc || !scene.imageAltPt) err("catalog", ref, "VisualScene incompleta.");
    if (!scene.exerciseAltPt?.trim()) err("catalog", ref, "exerciseAltPt ausente.");
    if (CJK_RE.test(scene.exerciseAltPt ?? "")) err("catalog", ref, "exerciseAltPt revela texto hànzì.");
    if (!sceneHasExplicitTarget(scene)) err("catalog", ref, "cena sem relação explícita com chunk/hànzì.");
    for (const chunkId of scene.targetChunkIds ?? []) {
      if (!chunkById.has(chunkId)) err("catalog", ref, `chunk desconhecido "${chunkId}"`);
    }
    if (/^https?:\/\//i.test(String(scene.imageSrc ?? ""))) {
      err("catalog", ref, "Imagem de cena externa via http/https.");
    }
    await assertLocalImage(scene.imageSrc, ref);
    if (!resolveVisualScene(scene.id)) err("catalog", ref, "resolveVisualScene falhou.");
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

      const mode = step.imageChoiceMode;
      const isSceneMode = mode === "image_sentence_choice" || mode === "scene_audio_choice";
      const imagePick =
        mode === "choose_image" || mode === "listen_and_choose_image" || mode === "scene_audio_choice";
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
        if (/https?:|\/|\.png|\.jpe?g|\.webp|\.gif|\.svg/iu.test(value)) {
          err("step", ref, `referência de imagem externa/arquivo: "${value}"`);
        }
      }

      if (isSceneMode) {
        const scene = resolveVisualScene(step.visualSceneId ?? step.imageId);
        if (!scene) err("step", ref, `cena desconhecida: ${step.visualSceneId ?? step.imageId}`);
        else {
          if (!sceneHasExplicitTarget(scene)) err("step", ref, "cena sem ligação explícita a chunk/hànzì");
          for (const chunkId of scene.targetChunkIds ?? []) {
            const taughtHere = taughtChunksByLesson.get(lesson.id) ?? new Set();
            const allowedByGate = (scene.allowedAfterLessons ?? []).includes(lesson.id);
            if (!taughtHere.has(chunkId) && !allowedByGate) {
              // Soft gate: chunk must exist in corpus; progression enforced by allowedAfterLessons.
              if (!chunkById.has(chunkId)) err("step", ref, `chunk não ensinado/inexistente: ${chunkId}`);
            }
          }
          if (CJK_RE.test(scene.exerciseAltPt ?? "")) {
            err("step", ref, "alt do exercício entrega texto da resposta");
          }
          const spoilers = [sceneTargetHanzi(scene), answer, step.correctAnswer]
            .filter(Boolean)
            .map((value) => norm(value));
          for (const spoiler of spoilers) {
            if (spoiler.length > 1 && norm(scene.exerciseAltPt).includes(spoiler)) {
              err("step", ref, "alt do exercício entrega a resposta");
            }
          }
        }
      } else {
        const conceptId = step.imageId ?? step.iconId;
        const concept = resolveVisualConcept(conceptId);
        if (!concept) err("step", ref, `imageId desconhecido: ${conceptId}`);
        else {
          if (!concept.imageSrc && !concept.emoji) err("step", ref, "image_choice sem imagem nem fallback");
          if (!String(concept.imageAltPt ?? "").trim()) err("step", ref, "image_choice com alt vazio");
        }
        if (conceptId && unitIndex >= 0 && !isVisualConceptAllowed(conceptId, unitIndex)) {
          err("progression", ref, `conceito "${conceptId}" aparece antes de ser ensinado (unidade ${unitIndex}).`);
        }
        if (imagePick) {
          for (const option of options) {
            const optionConcept = resolveVisualConcept(option);
            if (!optionConcept) err("step", ref, `imageOption desconhecida: ${option}`);
            else if (!optionConcept.imageSrc && !optionConcept.emoji) {
              err("step", ref, `imageOption sem imagem nem fallback: ${option}`);
            }
          }
        }
      }
    }
  }

  if (imageSteps.length === 0) {
    err("journey", "image_choice", "Nenhum passo image_choice encontrado na jornada.");
  }

  const modes = new Set(imageSteps.map((entry) => entry.step.imageChoiceMode));
  for (const required of [
    "choose_hanzi",
    "choose_pinyin",
    "listen_and_choose_image",
    "choose_image",
    "image_sentence_choice",
    "scene_audio_choice",
  ]) {
    if (!modes.has(required)) err("modes", required, "Modo obrigatório ausente na jornada.");
  }

  const falaScene = imageSteps.filter(
    (entry) => entry.lesson.skill === "fala" && entry.step.imageChoiceMode === "image_sentence_choice"
  );
  const hanziConcept = imageSteps.filter(
    (entry) => entry.lesson.skill === "hanzi" && entry.step.imageChoiceMode === "choose_hanzi"
  );
  if (falaScene.length === 0) err("pedagogy", "fala", "lições de fala sem VisualScene (image_sentence_choice)");
  if (hanziConcept.length === 0) err("pedagogy", "hanzi", "lições de hànzì sem VisualConcept (choose_hanzi)");

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

    const sceneReviewConcept = buildImageChoiceReview(
      {
        item: { ...newItem("char", "mu", { reviewDomain: "forma" }), reps: 0 },
        learnedItems: [],
        domain: "forma",
      },
      { type: "char", itemId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore" }
    );
    const sceneReviewScene = buildImageChoiceReview(
      {
        item: { ...newItem("char", "mu", { reviewDomain: "forma" }), reps: 1 },
        learnedItems: [],
        domain: "forma",
      },
      { type: "char", itemId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore" }
    );
    if (!sceneReviewConcept?.visualConceptId && !sceneReviewConcept?.visualSceneId) {
      err("review", "alternate", "Revisão com reps par deveria gerar visual.");
    }
    if (!sceneReviewScene?.visualSceneId) {
      err("review", "alternate", "Revisão com reps ímpar deveria preferir VisualScene.");
    }
    if (
      sceneReviewScene &&
      sceneReviewScene.imageChoiceMode !== "image_sentence_choice" &&
      sceneReviewScene.imageChoiceMode !== "scene_audio_choice"
    ) {
      err("review", "alternate", "Cena de revisão deve usar image_sentence_choice ou scene_audio_choice.");
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
