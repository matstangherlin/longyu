// validate:image-exercises
//
// Valida o catálogo visual (visualVocabulary + arquivos WebP locais), os
// exercícios image_choice autorais da jornada E a cobertura visual dos planos
// REAIS de lição (com os passos gerados por makeImageChoiceStepForFocus).
//
// Gera reports/image-coverage-report.md com:
//  - total de imagens e conceitos;
//  - lições elegíveis × lições com imagem (metas: ≥70% das concretas,
//    100% das dedicadas de hànzì concreto);
//  - cobertura por fase e por unidade;
//  - modos utilizados;
//  - conceitos nunca utilizados;
//  - lições concretas sem imagem.

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-image-exercises-"));
const reportPath = path.join(rootDir, "reports/image-coverage-report.md");
const MAX_IMAGE_BYTES = 200 * 1024;
const MIN_CATALOG_SIZE = 35;
const MIN_CONCRETE_COVERAGE = 0.7;
const ALL_MODES = ["choose_hanzi", "choose_pinyin", "choose_meaning", "listen_and_choose_image", "choose_image"];

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

function pct(part, total) {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

try {
  const program = ts.createProgram(
    [
      "src/data/visualVocabulary.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
      "src/data/chunks.ts",
      "src/features/lesson/lessonTasks.ts",
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
  const { lessonRoundStepsFor, lessonImageCoverageInfo } = load("src/features/lesson/lessonTasks.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const { validateReviewExercise, buildImageChoiceReview } = load("src/features/revisao/reviewExerciseBuilder.js");
  const { newItem } = load("src/lib/srs.js");

  const units = JOURNEY.flatMap((phase) => phase.units.map((unit) => ({ phase, unit })));
  const unitIndexById = new Map(units.map(({ unit }, index) => [unit.id, index]));
  const phaseByUnitId = new Map(units.map(({ phase, unit }) => [unit.id, phase]));

  // ————— 1. Catálogo —————
  if (VISUAL_CONCEPT_IDS.length < MIN_CATALOG_SIZE) {
    err("catalog", "visual", `Esperava ao menos ${MIN_CATALOG_SIZE} conceitos visuais (encontrei ${VISUAL_CONCEPT_IDS.length}).`);
  }

  let localImageCount = 0;
  for (const concept of VISUAL_CONCEPTS) {
    if (!concept.id || !concept.charId || !concept.hanzi) err("catalog", concept.id, "Conceito visual incompleto.");
    if (!String(concept.imageAltPt ?? "").trim()) err("catalog", concept.id, "Alt da imagem está vazio.");
    if (!["photo", "illustration", "svg_fallback"].includes(concept.imageKind)) {
      err("catalog", concept.id, `imageKind inválido: ${concept.imageKind}`);
    }
    if (!concept.imageSrc) {
      err("catalog", concept.id, "Conceito sem imagem local (o catálogo não pode depender de emoji como imagem principal).");
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
        localImageCount += 1;
      } catch {
        err("catalog", concept.id, `Arquivo de imagem não encontrado: ${localImagePath}`);
      }
    }
    if (!resolveVisualConcept(concept.id)) err("catalog", concept.id, "resolveVisualConcept falhou.");
  }

  // ————— 2. Passos image_choice (autorais e do plano real) —————
  const checkImageStep = (lesson, step, ref, unitIndex, generated) => {
    const validation = validateExercise(step);
    if (!validation.valid) {
      for (const message of validation.errors) err(generated ? "plan-step" : "step", ref, message);
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

    if (conceptId && unitIndex >= 0 && !isVisualConceptAllowed(conceptId, unitIndex)) {
      err("progression", ref, `conceito "${conceptId}" aparece antes de ser ensinado (unidade ${unitIndex}).`);
    }
    return concept;
  };

  const authoredSteps = [];
  const usedConceptIds = new Set();
  const modeCounts = new Map();
  const lessonRows = [];

  for (const lesson of ALL_LESSONS) {
    const unitIndex = unitIndexById.get(lesson.unitId) ?? -1;

    // Passos autorais, exatamente como escritos na jornada.
    for (const [stepIndex, step] of (lesson.steps ?? []).entries()) {
      if (step.kind !== "image_choice") continue;
      const ref = `${lesson.id}#${stepIndex + 1}`;
      authoredSteps.push({ lesson, step, ref, unitIndex });
      checkImageStep(lesson, step, ref, unitIndex, false);
    }

    // Plano real (autoral + gerado), como o aluno vê no player.
    const coverage = lessonImageCoverageInfo(lesson);
    const plan = lessonRoundStepsFor(lesson, { silent: true });
    const imageSteps = plan.filter((step) => step.kind === "image_choice");
    const planConcepts = new Set();
    const planModes = new Set();
    const generatedSeen = new Set();

    for (const [planIndex, step] of imageSteps.entries()) {
      const ref = `${lesson.id}@plan${planIndex + 1}`;
      const concept = checkImageStep(lesson, step, ref, unitIndex, Boolean(step.generated));
      const conceptId = concept?.id ?? String(step.imageId ?? step.iconId ?? "");
      if (conceptId) {
        usedConceptIds.add(conceptId);
        planConcepts.add(conceptId);
      }
      if (step.imageChoiceMode) {
        planModes.add(step.imageChoiceMode);
        modeCounts.set(step.imageChoiceMode, (modeCounts.get(step.imageChoiceMode) ?? 0) + 1);
      }
      // Passo GERADO nunca repete uma imagem já usada na mesma lição.
      if (step.generated && conceptId) {
        if (generatedSeen.has(conceptId)) {
          err("repeat", ref, `imagem "${conceptId}" gerada duas vezes na mesma lição.`);
        }
        generatedSeen.add(conceptId);
      }
      if (coverage.abstract && step.generated) {
        err("abstract", ref, "lição abstrata (pinyin/tom) recebeu imagem gerada artificialmente.");
      }
      const priorConcept = concept && unitIndex >= 0 && concept.afterUnitIndex < unitIndex;
      if (priorConcept) planConcepts.add(`prior:${conceptId}`);
    }

    const hasPriorImage = [...planConcepts].some((id) => id.startsWith("prior:"));
    lessonRows.push({
      lesson,
      unitIndex,
      coverage,
      imageCount: imageSteps.length,
      authoredCount: (lesson.steps ?? []).filter((step) => step.kind === "image_choice").length,
      modes: [...planModes],
      hasPriorImage,
    });

    // Cobertura mínima por tipo de lição.
    if (coverage.eligible && lesson.isReview && imageSteps.length < 2) {
      err("coverage", lesson.id, `revisão de módulo com itens concretos tem ${imageSteps.length} exercício(s) visual(is) (mínimo 2).`);
    }
    // Só exige imagem de conteúdo anterior quando existe conceito de unidade
    // anterior no catálogo (a revisão do primeiro módulo não tem "antes").
    const priorPossible = VISUAL_CONCEPTS.some((concept) => concept.afterUnitIndex < unitIndex);
    if (coverage.eligible && lesson.isReview && imageSteps.length >= 2 && priorPossible && !hasPriorImage) {
      err("coverage", lesson.id, "revisão de módulo sem exercício visual de conteúdo anterior.");
    }
    if (coverage.dedicatedConcreteHanzi && imageSteps.length < 1) {
      err("coverage", lesson.id, "lição dedicada de hànzì concreto sem exercício visual.");
    }
  }

  if (authoredSteps.length === 0) {
    err("journey", "image_choice", "Nenhum passo image_choice autoral encontrado na jornada.");
  }

  for (const requiredMode of ALL_MODES) {
    if (!modeCounts.has(requiredMode)) err("modes", requiredMode, "Modo obrigatório ausente nos planos da jornada.");
  }

  // ————— 3. Metas de cobertura —————
  const eligibleRows = lessonRows.filter((row) => row.coverage.eligible);
  const eligibleWithImage = eligibleRows.filter((row) => row.imageCount > 0);
  const dedicatedRows = lessonRows.filter((row) => row.coverage.dedicatedConcreteHanzi);
  const dedicatedWithImage = dedicatedRows.filter((row) => row.imageCount > 0);

  const concreteCoverage = eligibleRows.length > 0 ? eligibleWithImage.length / eligibleRows.length : 1;
  if (concreteCoverage < MIN_CONCRETE_COVERAGE) {
    err(
      "coverage",
      "meta-70",
      `apenas ${eligibleWithImage.length}/${eligibleRows.length} (${pct(eligibleWithImage.length, eligibleRows.length)}) das lições concretas têm imagem (meta: ≥70%).`
    );
  } else if (concreteCoverage < 1) {
    console.warn(
      `⚠ cobertura visual em ${pct(eligibleWithImage.length, eligibleRows.length)} — ${eligibleRows.length - eligibleWithImage.length} lição(ões) concreta(s) sem imagem.`
    );
  }
  // Portão beta: NENHUMA lição concreta elegível pode ficar sem cobertura visual.
  for (const row of eligibleRows) {
    if (row.imageCount === 0) {
      err("coverage", row.lesson.id, "lição concreta elegível sem cobertura visual.");
    }
  }
  if (dedicatedWithImage.length < dedicatedRows.length) {
    err(
      "coverage",
      "meta-100",
      `${dedicatedWithImage.length}/${dedicatedRows.length} lições dedicadas de hànzì concreto têm imagem (meta: 100%).`
    );
  }

  // ————— 4. Builder de revisão —————
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

  // ————— 5. Relatório —————
  const neverUsed = VISUAL_CONCEPTS.filter((concept) => !usedConceptIds.has(concept.id));
  const withoutImage = eligibleRows.filter((row) => row.imageCount === 0);

  const phaseStats = new Map();
  const unitStats = new Map();
  for (const row of lessonRows) {
    const phase = phaseByUnitId.get(row.lesson.unitId);
    const phaseKey = phase ? `${phase.id} — ${phase.title}` : "(sem fase)";
    const unitKey = `${row.lesson.unitId} — ${row.lesson.unitTitle ?? row.lesson.unitId}`;
    for (const [map, key] of [
      [phaseStats, phaseKey],
      [unitStats, unitKey],
    ]) {
      const entry = map.get(key) ?? { lessons: 0, eligible: 0, withImage: 0 };
      entry.lessons += 1;
      if (row.coverage.eligible) {
        entry.eligible += 1;
        if (row.imageCount > 0) entry.withImage += 1;
      }
      map.set(key, entry);
    }
  }

  const modeLabels = {
    choose_hanzi: "imagem → hànzì",
    choose_meaning: "imagem → significado",
    choose_pinyin: "imagem → pinyin",
    choose_image: "hànzì → imagem",
    listen_and_choose_image: "áudio → imagem",
  };

  const lines = [
    "# Relatório de cobertura de exercícios visuais",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: lessonRows.length }),
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|-----------|------:|",
    `| Conceitos no catálogo | ${VISUAL_CONCEPTS.length} |`,
    `| Imagens locais (WebP) | ${localImageCount} |`,
    `| Lições na jornada | ${lessonRows.length} |`,
    `| Lições concretas elegíveis | ${eligibleRows.length} |`,
    `| Lições elegíveis com imagem | ${eligibleWithImage.length} (${pct(eligibleWithImage.length, eligibleRows.length)}) |`,
    `| Meta: lições concretas com imagem | ≥70% — ${concreteCoverage >= MIN_CONCRETE_COVERAGE ? "OK" : "FALHOU"} |`,
    `| Lições dedicadas de hànzì concreto | ${dedicatedRows.length} |`,
    `| Dedicadas com imagem | ${dedicatedWithImage.length} (${pct(dedicatedWithImage.length, dedicatedRows.length)}) |`,
    `| Meta: dedicadas com imagem | 100% — ${dedicatedWithImage.length === dedicatedRows.length ? "OK" : "FALHOU"} |`,
    `| Passos image_choice autorais | ${authoredSteps.length} |`,
    `| Conceitos nunca utilizados | ${neverUsed.length} |`,
    "",
    "## Cobertura por fase",
    "",
    "| Fase | Lições | Elegíveis | Com imagem | Cobertura |",
    "|------|-------:|----------:|-----------:|----------:|",
  ];

  for (const [key, entry] of phaseStats) {
    lines.push(`| ${key} | ${entry.lessons} | ${entry.eligible} | ${entry.withImage} | ${pct(entry.withImage, entry.eligible)} |`);
  }

  lines.push("", "## Cobertura por unidade", "", "| Unidade | Lições | Elegíveis | Com imagem | Cobertura |", "|---------|-------:|----------:|-----------:|----------:|");
  for (const [key, entry] of unitStats) {
    lines.push(`| ${key} | ${entry.lessons} | ${entry.eligible} | ${entry.withImage} | ${pct(entry.withImage, entry.eligible)} |`);
  }

  lines.push("", "## Modos utilizados (nos planos reais)", "", "| Modo | Exercícios |", "|------|-----------:|");
  for (const mode of ALL_MODES) {
    lines.push(`| ${modeLabels[mode] ?? mode} (\`${mode}\`) | ${modeCounts.get(mode) ?? 0} |`);
  }

  lines.push("", "## Conceitos nunca utilizados", "");
  if (neverUsed.length === 0) {
    lines.push("Nenhum — todos os conceitos do catálogo aparecem em pelo menos um exercício.");
  } else {
    lines.push("| Conceito | Hànzì | Significado | Liberado após unidade |", "|----------|-------|-------------|----------------------:|");
    for (const concept of neverUsed) {
      lines.push(`| ${concept.id} | ${concept.hanzi} | ${concept.meaningPt} | ${concept.afterUnitIndex} |`);
    }
  }

  lines.push("", "## Lições concretas sem imagem", "");
  if (withoutImage.length === 0) {
    lines.push("Nenhuma — todas as lições concretas elegíveis têm pelo menos um exercício visual.");
  } else {
    lines.push("| Lição | Skill | Unidade | Conceitos disponíveis |", "|-------|-------|---------|----------------------|");
    for (const row of withoutImage) {
      lines.push(`| ${row.lesson.id} | ${row.lesson.skill}${row.lesson.isReview ? " (revisão)" : ""} | ${row.lesson.unitId} | ${row.coverage.conceptIds.join(", ")} |`);
    }
  }

  lines.push(
    "",
    "---",
    "",
    "_Elegível = lição não abstrata (fora de pinyin/tom) cujo foco resolve para pelo menos um conceito concreto do catálogo liberado na unidade. Lições abstratas não recebem imagem artificialmente._",
    ""
  );

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (errors.length > 0) {
    console.error(`validate:image-exercises falhou com ${errors.length} problema(s):`);
    for (const issue of errors.slice(0, 60)) {
      console.error(`- [${issue.area}] ${issue.ref}: ${issue.message}`);
    }
    if (errors.length > 60) console.error(`...mais ${errors.length - 60}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `validate:image-exercises OK (${authoredSteps.length} passos autorais · ${VISUAL_CONCEPT_IDS.length} conceitos · ${localImageCount} imagens locais · cobertura concreta ${pct(eligibleWithImage.length, eligibleRows.length)} · dedicadas ${pct(dedicatedWithImage.length, dedicatedRows.length)}).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
