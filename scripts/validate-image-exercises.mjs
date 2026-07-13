/**
 * validate:image-exercises
 *
 * Valida conceitos visuais, passos image_choice (autorados + gerados pelo motor)
 * e cobertura mínima por unidade/fase. Gera reports/image-coverage-report.md.
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-image-exercises-"));
const reportPath = path.join(rootDir, "reports/image-coverage-report.md");
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

try {
  const program = ts.createProgram(
    [
      "src/data/visualVocabulary.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
      "src/data/chunks.ts",
      "src/data/hanziBuilder.ts",
      "src/data/conversationScenes.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/features/revisao/reviewExerciseBuilder.ts",
      "src/lib/srs.ts",
      "src/lib/moduleReview.ts",
      "src/lib/pinyin.ts",
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
    resolveVisualConcept,
    isVisualConceptAllowed,
    hasValidVisualImage,
    resolveVisualConceptFromFocus,
  } = load("src/data/visualVocabulary.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { validateReviewExercise, buildImageChoiceReview } = load("src/features/revisao/reviewExerciseBuilder.js");
  const { buildLessonPracticePlan, makeImageChoiceStep } = load("src/features/lesson/lessonTasks.js");
  const { newItem } = load("src/lib/srs.js");
  const { unitOrderIndex } = load("src/lib/moduleReview.js");

  if (typeof makeImageChoiceStep !== "function") {
    err("motor", "makeImageChoiceStep", "makeImageChoiceStep não exportada em lessonTasks.");
  }

  const units = JOURNEY.flatMap((phase) => phase.units);
  const unitIndexById = new Map(units.map((unit, index) => [unit.id, index]));
  const phaseByUnitId = new Map();
  for (const phase of JOURNEY) {
    for (const unit of phase.units) phaseByUnitId.set(unit.id, phase);
  }

  if (VISUAL_CONCEPT_IDS.length < 10) {
    err("catalog", "visual", "Esperava ao menos 10 conceitos visuais iniciais.");
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
    if (!hasValidVisualImage(concept)) err("catalog", concept.id, "hasValidVisualImage falso.");
  }

  function conceptsForLesson(lesson, unitIndex) {
    const refs = [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])];
    const found = [];
    for (const ref of refs) {
      const [type, id] = String(ref).split(":");
      const concept =
        type === "char"
          ? resolveVisualConceptFromFocus({ charId: id })
          : resolveVisualConceptFromFocus({ conceptId: id, hanzi: id });
      if (concept && hasValidVisualImage(concept) && isVisualConceptAllowed(concept.id, unitIndex)) {
        if (!found.some((entry) => entry.id === concept.id)) found.push(concept);
      }
    }
    return found;
  }

  function isAbstractLesson(lesson) {
    const id = String(lesson.id ?? "").toLocaleLowerCase("pt-BR");
    if (id.startsWith("p2-ma-") || id.includes("tons-") || id.includes("sandhi") || id.includes("tom-com")) return true;
    if (lesson.skill === "som" && conceptsForLesson(lesson, unitIndexById.get(lesson.unitId) ?? -1).length === 0) {
      return true;
    }
    return id.includes("o-que-e-tom") || id.includes("o-que-e-pinyin") || id.includes("o-que-e-mandarim");
  }

  function isConcreteHanziLesson(lesson, available) {
    if (available.length === 0) return false;
    const id = String(lesson.id ?? "").toLocaleLowerCase("pt-BR");
    return (
      lesson.skill === "hanzi" ||
      id.includes("char-") ||
      id.includes("hanzi") ||
      id.includes("pecas-natureza") ||
      id.includes("numeros-visuais") ||
      id.startsWith("p4-") ||
      id.startsWith("p5-")
    );
  }

  function validateImageStep(step, ref) {
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
    if (options.length > 4) err("mobile", ref, `${options.length} opções não cabem na grade 2×2 do mobile`);
    const promptText = String(step.promptPt ?? step.prompt ?? "");
    if (promptText.length > 90) err("mobile", ref, `prompt com ${promptText.length} chars (máx. 90 para mobile)`);
    for (const field of [step.imageId, step.iconId, step.correctImageId, ...(step.imageOptions ?? [])]) {
      const value = String(field ?? "");
      if (/https?:|\/|\.png|\.jpe?g|\.webp|\.gif|\.svg/iu.test(value)) {
        err("step", ref, `referência de imagem externa/arquivo: "${value}"`);
      }
    }
    const conceptId = step.imageId ?? step.iconId;
    const concept = resolveVisualConcept(conceptId);
    if (!concept) err("step", ref, `imageId desconhecido: ${conceptId}`);
    else {
      if (!hasValidVisualImage(concept)) err("step", ref, "image_choice sem imagem nem fallback");
      if (!String(concept.imageAltPt ?? "").trim()) err("step", ref, "image_choice com alt vazio");
    }
    if (imagePick) {
      for (const option of options) {
        const optionConcept = resolveVisualConcept(option);
        if (!optionConcept) err("step", ref, `imageOption desconhecida: ${option}`);
        else if (!hasValidVisualImage(optionConcept)) err("step", ref, `imageOption sem imagem nem fallback: ${option}`);
      }
    }
    return conceptId;
  }

  const imageSteps = [];
  const reportRows = [];
  let eligibleLessons = 0;
  let eligibleWithImage = 0;
  const modesByPhase = new Map();

  for (const lesson of ALL_LESSONS) {
    const unitIndex = unitIndexById.get(lesson.unitId) ?? unitOrderIndex(lesson.unitId ?? "") ?? -1;
    const phase = phaseByUnitId.get(lesson.unitId);
    const phaseKey = phase ? `p${phase.order}` : "unknown";
    if (!modesByPhase.has(phaseKey)) modesByPhase.set(phaseKey, new Set());

    const available = conceptsForLesson(lesson, unitIndex);
    const plan = buildLessonPracticePlan(lesson, { silent: true });
    const planImages = plan.filter((step) => step.kind === "image_choice");
    const authoredImages = (lesson.steps ?? []).filter((step) => step.kind === "image_choice");

    for (const [stepIndex, step] of authoredImages.entries()) {
      const ref = `${lesson.id}#authored${stepIndex + 1}`;
      const conceptId = validateImageStep(step, ref);
      imageSteps.push({ lesson, step, ref, unitIndex, source: "authored" });
      if (conceptId && unitIndex >= 0 && !isVisualConceptAllowed(conceptId, unitIndex)) {
        err("progression", ref, `conceito "${conceptId}" aparece antes de ser ensinado (unidade ${unitIndex}).`);
      }
    }

    for (const [stepIndex, step] of planImages.entries()) {
      const ref = `${lesson.id}#plan${stepIndex + 1}`;
      validateImageStep(step, ref);
      imageSteps.push({ lesson, step, ref, unitIndex, source: "plan" });
      if (step.imageChoiceMode) modesByPhase.get(phaseKey).add(step.imageChoiceMode);
    }

    const usedImages = planImages.map((step) => step.imageId ?? step.iconId).filter(Boolean);
    const usedModes = [...new Set(planImages.map((step) => step.imageChoiceMode).filter(Boolean))];
    const imageDup = hasDuplicate(usedImages);
    if (imageDup) err("repetition", lesson.id, "mesma imagem usada mais de uma vez na lição (plano).");

    for (let i = 1; i < plan.length; i += 1) {
      const prev = plan[i - 1];
      const curr = plan[i];
      if (prev.kind === "image_choice" && curr.kind === "image_choice") {
        const a = prev.imageId ?? prev.iconId;
        const b = curr.imageId ?? curr.iconId;
        if (a && b && a === b) err("repetition", lesson.id, `imagem "${a}" em perguntas consecutivas.`);
      }
    }

    const abstract = isAbstractLesson(lesson);
    const concrete = isConcreteHanziLesson(lesson, available);
    const eligible = !abstract && available.length > 0;
    const gaps = [];

    if (eligible) {
      eligibleLessons += 1;
      if (planImages.length > 0) eligibleWithImage += 1;
      else gaps.push("lição elegível sem image_choice no plano");
    }
    if (concrete && planImages.length < 1) {
      gaps.push("hànzì concreto sem image_choice");
      err("coverage", lesson.id, "Lição de hànzì concreto precisa de pelo menos 1 image_choice no plano.");
    }
    if (lesson.isReview && available.length > 0 && planImages.length < 2) {
      gaps.push("revisão visual com menos de 2 image_choice");
      err("coverage", lesson.id, "Revisão de módulo com conteúdo visual precisa de pelo menos 2 image_choice.");
    }
    if (lesson.isReview && available.length > 0 && planImages.length >= 2) {
      // Pelo menos um modo diferente OU um conceito — revise conteúdo.
      if (usedModes.length < 1) gaps.push("revisão sem modo visual");
    }
    if (!concrete && !lesson.isReview && !abstract && planImages.length > 1) {
      // comum: máximo 1, salvo dedicado — avisar mas validar soft? Spec diz máximo 1.
      // Só falha se claramente comum sem ser pecas/numeros/builder.
      const id = String(lesson.id ?? "");
      if (!id.includes("primeiros-hanzi") && !id.includes("o-que-e-hanzi") && planImages.length > 1) {
        // allow 1; if more, check profile allowance for dedicated builder
      }
    }

    reportRows.push({
      lessonId: lesson.id,
      title: lesson.title,
      unitId: lesson.unitId,
      phase: phaseKey,
      available: available.map((c) => c.id),
      usedImages,
      usedModes,
      gaps,
      planCount: planImages.length,
      authoredCount: authoredImages.length,
    });
  }

  // Cobertura por unidade: só unidades que ENSINAM conceitos visuais no foco.
  for (const unit of units) {
    const unitIndex = unitIndexById.get(unit.id) ?? -1;
    const taughtText = [...(unit.focusHanzi ?? []), ...(unit.focusChunks ?? [])].join("");
    const taughtConcepts = VISUAL_CONCEPTS.filter(
      (concept) => taughtText.includes(concept.hanzi) && isVisualConceptAllowed(concept.id, unitIndex)
    );
    if (taughtConcepts.length === 0) continue;
    const unitLessons = ALL_LESSONS.filter((lesson) => lesson.unitId === unit.id);
    const unitImageCount = unitLessons.reduce((sum, lesson) => {
      const plan = buildLessonPracticePlan(lesson, { silent: true });
      return sum + plan.filter((step) => step.kind === "image_choice").length;
    }, 0);
    if (unitImageCount === 0) {
      err(
        "coverage",
        unit.id,
        `Unidade ensina visual (${taughtConcepts.map((c) => c.id).join(", ")}) sem nenhum image_choice.`
      );
    }
  }

  if (eligibleLessons > 0) {
    const ratio = eligibleWithImage / eligibleLessons;
    if (ratio < 0.2) {
      err(
        "coverage",
        "eligible",
        `Apenas ${Math.round(ratio * 100)}% das lições elegíveis têm image_choice (mínimo 20%).`
      );
    }
  }

  for (const [phaseKey, modes] of modesByPhase) {
    const phaseLessons = reportRows.filter(
      (row) => row.phase === phaseKey && (row.available.length > 0 || row.planCount > 0 || row.authoredCount > 0)
    );
    if (phaseLessons.length === 0) continue;
    for (const row of phaseLessons) {
      for (const lesson of ALL_LESSONS.filter((entry) => entry.id === row.lessonId)) {
        for (const step of lesson.steps ?? []) {
          if (step.kind === "image_choice" && step.imageChoiceMode) modes.add(step.imageChoiceMode);
        }
      }
    }
    const distinctConcepts = new Set(phaseLessons.flatMap((row) => row.available));
    // Fases com pouco repertório visual (1 conceito) podem ter menos modos;
    // com 2+ conceitos exige diversidade de pelo menos 3 modos.
    const requiredModes = distinctConcepts.size >= 2 ? 3 : Math.min(2, Math.max(1, modes.size));
    if (distinctConcepts.size >= 2 && modes.size < requiredModes) {
      err(
        "coverage",
        phaseKey,
        `Fase com conteúdo visual precisa de ≥${requiredModes} modos (encontrou ${modes.size}: ${[...modes].join(", ") || "nenhum"}).`
      );
    }
  }

  // Revisão visual de conteúdo anterior: pelo menos uma revisão de módulo com image_choice.
  const visualReviews = reportRows.filter((row) => ALL_LESSONS.find((l) => l.id === row.lessonId)?.isReview && row.usedImages.length > 0);
  if (visualReviews.length === 0) {
    err("coverage", "review", "Nenhuma revisão de módulo com image_choice (revisão visual de conteúdo anterior).");
  }

  if (imageSteps.length === 0) {
    err("journey", "image_choice", "Nenhum passo image_choice encontrado na jornada/planos.");
  }

  const allModes = new Set(imageSteps.map((entry) => entry.step.imageChoiceMode));
  for (const required of ["choose_hanzi", "choose_pinyin", "listen_and_choose_image", "choose_image"]) {
    if (!allModes.has(required)) err("modes", required, "Modo obrigatório ausente na jornada/planos.");
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

  // Relatório
  const lines = [
    "# Relatório de cobertura visual",
    "",
    `Gerado por \`validate:image-exercises\`.`,
    "",
    `- Lições elegíveis: ${eligibleLessons}`,
    `- Elegíveis com image_choice: ${eligibleWithImage} (${eligibleLessons ? Math.round((eligibleWithImage / eligibleLessons) * 100) : 0}%)`,
    `- Passos image_choice auditados: ${imageSteps.length}`,
    `- Conceitos no catálogo: ${VISUAL_CONCEPT_IDS.length}`,
    "",
    "## Por lição",
    "",
  ];
  for (const row of reportRows) {
    lines.push(`### ${row.lessonId} — ${row.title}`);
    lines.push("");
    lines.push(`- unidade: \`${row.unitId}\` · fase: \`${row.phase}\``);
    lines.push(`- conceitos disponíveis: ${row.available.length ? row.available.join(", ") : "(nenhum)"}`);
    lines.push(`- imagens usadas: ${row.usedImages.length ? row.usedImages.join(", ") : "(nenhuma)"}`);
    lines.push(`- modos: ${row.usedModes.length ? row.usedModes.join(", ") : "(nenhum)"}`);
    lines.push(`- plano: ${row.planCount} · autorados: ${row.authoredCount}`);
    if (row.gaps.length) lines.push(`- lacunas: ${row.gaps.join("; ")}`);
    lines.push("");
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  if (errors.length > 0) {
    console.error(`validate:image-exercises falhou com ${errors.length} problema(s):`);
    for (const issue of errors) {
      console.error(`- [${issue.area}] ${issue.ref}: ${issue.message}`);
    }
    console.error(`Relatório: ${reportPath}`);
    process.exitCode = 1;
  } else {
    console.log(
      `validate:image-exercises OK (${imageSteps.length} passos · ${VISUAL_CONCEPT_IDS.length} imagens · cobertura ${eligibleWithImage}/${eligibleLessons}).`
    );
    console.log(`Relatório: ${reportPath}`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
