/**
 * validate:transfer-prerequisites — portão da progressão de estrutura.
 *
 * Garante que transfer_task / free_production / open não aparecem só porque
 * os glifos existem. Escada exigida:
 *   exposição → completion/build → produção guiada → transferência → aberta
 *
 * Audita as 122 lições e gera reports/transfer-prerequisites-report.md.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/transfer-prerequisites-report.md");
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-transfer-prereq-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/vocabulary.ts",
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
    console.error("Falha ao compilar validate:transfer-prerequisites.");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const {
    lessonRoundStepsFor,
    structureFirstOccurrenceReport,
    structureExposureSnapshotForLesson,
    priorTransferredFramesSnapshotForLesson,
    creditStructureFromStep,
  } = load("src/features/lesson/lessonTasks.js");
  const {
    SENTENCE_FRAMES,
    canGuidedProduceStructure,
    canTransferStructure,
    canOpenProduceGoal,
    cloneStructureExposure,
    mergeStructureExposure,
  } = load("src/data/productionTasks.js");

  const frameById = new Map(SENTENCE_FRAMES.map((frame) => [frame.id, frame]));

  /** Mesma regra de runtime: supported pode transferir quando o frame-base já subiu a escada. */
  function structureReadyForTransferFrame(frameId, exposure) {
    const frame = frameById.get(frameId);
    if (!frame) return canTransferStructure(exposure.get(frameId));
    if (canTransferStructure(exposure.get(frameId))) return true;
    if (
      frame.transferAssist === "supported" &&
      (frame.transferRequiresFrameIds ?? []).length > 0 &&
      (frame.transferRequiresFrameIds ?? []).every((id) => canTransferStructure(exposure.get(id)))
    ) {
      return true;
    }
    return false;
  }

  function supportedTransferViaPrereq(frameId) {
    const frame = frameById.get(frameId);
    return (
      frame?.transferAssist === "supported" &&
      (frame.transferRequiresFrameIds ?? []).length > 0
    );
  }

  const earlyTransfers = [];
  const earlyOpen = [];
  const transferBeforeGuided = [];
  const freeWithoutStructure = [];
  const openWithoutGuided = [];
  const firstTransfers = [];
  const firstFrees = [];
  const firstOpens = [];

  /** Histórico simulado: rungs acumulados após cada lição (planos reais). */
  let prior = new Map();
  let transferLessons = 0;
  let freeLessons = 0;
  let openLessons = 0;

  for (const lesson of ALL_LESSONS) {
    const bundle = structureExposureSnapshotForLesson(lesson.id);
    const plan = lessonRoundStepsFor(lesson, {
      silent: true,
      attemptNumber: 0,
      skipStructureExposureIndex: true,
      structureExposure: bundle.forFree,
      structureExposureForTransfer: bundle.forTransfer,
      priorTransferredFrames: priorTransferredFramesSnapshotForLesson(lesson.id),
    });

    const transfers = plan.filter((step) => step.kind === "transfer_task");
    const frees = plan.filter((step) => step.kind === "free_production" && !step.productionOpen);
    const opens = plan.filter((step) => step.kind === "free_production" && step.productionOpen);

    if (transfers.length) transferLessons += 1;
    if (frees.length) freeLessons += 1;
    if (opens.length) openLessons += 1;

    for (const step of transfers) {
      const frameId = step.productionFrameId;
      const rungs = bundle.forTransfer.get(frameId);
      if (!structureReadyForTransferFrame(frameId, bundle.forTransfer)) {
        transferBeforeGuided.push(`${lesson.id}/${frameId}`);
      }
      if (!firstTransfers.some((row) => row.frameId === frameId)) {
        firstTransfers.push({
          lessonId: lesson.id,
          frameId,
          target: step.correctAnswer ?? step.answer,
          assist: step.productionAssist,
        });
      }
      // Transferência na primeira metade sem escada própria — exceto supported cedo (V4.5).
      const idx = ALL_LESSONS.findIndex((item) => item.id === lesson.id);
      const earlySupported =
        step.transferEarlySupported === true && step.productionAssist === "supported";
      if (
        idx >= 0 &&
        idx < 40 &&
        !rungs?.guidedProduction &&
        !supportedTransferViaPrereq(frameId) &&
        !earlySupported
      ) {
        earlyTransfers.push(`${lesson.id}/${frameId}`);
      }
    }

    for (const step of frees) {
      const frameId = step.productionFrameId;
      if (!frameId) continue;
      const rungs = bundle.forFree.get(frameId);
      if (!canGuidedProduceStructure(rungs)) {
        freeWithoutStructure.push(`${lesson.id}/${frameId}`);
      }
      if (frameId && !firstFrees.some((row) => row.frameId === frameId)) {
        firstFrees.push({ lessonId: lesson.id, frameId, target: step.correctAnswer ?? step.answer });
      }
    }

    for (const step of opens) {
      const goal = step.productionGoal;
      if (!canOpenProduceGoal(goal, bundle.forTransfer)) {
        openWithoutGuided.push(`${lesson.id}/${goal ?? "?"}`);
      }
      const idx = ALL_LESSONS.findIndex((item) => item.id === lesson.id);
      if (idx >= 0 && idx < 40 && !canOpenProduceGoal(goal, bundle.forTransfer)) {
        earlyOpen.push(`${lesson.id}/${goal ?? "?"}`);
      }
      if (goal && !firstOpens.some((row) => row.goal === goal)) {
        firstOpens.push({ lessonId: lesson.id, goal, model: step.correctAnswer ?? step.answer });
      }
    }

    const fromPlan = new Map();
    for (const step of plan) creditStructureFromStep(fromPlan, step);
    mergeStructureExposure(prior, fromPlan);
    mergeStructureExposure(prior, cloneStructureExposure(bundle.forFree));
  }

  const occurrences = structureFirstOccurrenceReport();

  // Assertions
  assert(transferBeforeGuided.length === 0, `transfer sem produção guiada prévia: ${transferBeforeGuided.slice(0, 8).join(", ")}`);
  assert(freeWithoutStructure.length === 0, `free_production sem exposição+build: ${freeWithoutStructure.slice(0, 8).join(", ")}`);
  assert(openWithoutGuided.length === 0, `produção aberta sem guided prévio: ${openWithoutGuided.slice(0, 8).join(", ")}`);
  assert(earlyTransfers.length === 0, `transfer precoce (1ªs 40 lições sem guided): ${earlyTransfers.slice(0, 8).join(", ")}`);
  assert(earlyOpen.length === 0, `open precoce nas 1ªs 40 lições: ${earlyOpen.slice(0, 8).join(", ")}`);

  for (const row of occurrences) {
    const supportedOnly = supportedTransferViaPrereq(row.frameId);
    if (row.firstTransferLessonId && !row.firstGuidedProductionLessonId && !supportedOnly) {
      failures.push(`${row.frameId}: transferência em ${row.firstTransferLessonId} sem produção guiada`);
    }
    if (row.firstTransferLessonId && row.firstGuidedProductionLessonId) {
      const ti = ALL_LESSONS.findIndex((l) => l.id === row.firstTransferLessonId);
      const gi = ALL_LESSONS.findIndex((l) => l.id === row.firstGuidedProductionLessonId);
      assert(gi >= 0 && ti > gi, `${row.frameId}: transfer (${row.firstTransferLessonId}) não é depois de guided (${row.firstGuidedProductionLessonId})`);
    }
  }

  // Ainda deve haver transferência e produção no curso (não zerar profundidade).
  assert(transferLessons >= 15, `só ${transferLessons} lições com transfer_task (mínimo 15)`);
  assert(freeLessons >= 20, `só ${freeLessons} lições com free_production guiada (mínimo 20)`);

  const lines = [
    "# Relatório: prerequisites de transfer / free_production",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Política",
    "",
    "1. Exposição da estrutura (foco/autoral no padrão).",
    "2. Completion ou sentence build do padrão.",
    "3. Produção guiada (`free_production` do frame).",
    "4. Só então `transfer_task` (frase/situação nova).",
    "5. Produção aberta só depois de guided do objetivo.",
    "",
    "## Resumo do plano real",
    "",
    `| Indicador | Valor |`,
    `|-----------|------:|`,
    `| Lições | ${ALL_LESSONS.length} |`,
    `| Lições com transfer_task | ${transferLessons} |`,
    `| Lições com free_production guiada | ${freeLessons} |`,
    `| Lições com produção aberta (estruturalmente elegível) | ${openLessons} |`,
    `| Transfers precoces | ${earlyTransfers.length} |`,
    `| Opens precoces (sem guided do objetivo) | ${earlyOpen.length} |`,
    "",
    "## Semântica: open production",
    "",
    "- **structurallyEligibleOpen**: o auditor do plano real encontra `productionOpen` quando glifos + guided do objetivo já existem (pode aparecer cedo, ex. ask_name).",
    "- **firstRealLearnerOpenProduction / produção independente**: no onboarding do aluno novo, a primeira `free_production` guiada sem apoio entra ~L12 (`validate:onboarding-pace`).",
    "- Não confundir elegibilidade estrutural com o momento em que o aluno novo encontra produção no caminho real.",
    "",
    "## Primeira ocorrência por estrutura",
    "",
    "| Frame | Padrão | Exposta | Guided | Transfer |",
    "|-------|--------|---------|--------|----------|",
  ];
  for (const row of occurrences) {
    lines.push(
      `| \`${row.frameId}\` | ${row.patternPt} | ${row.firstExposedLessonId ?? "—"} | ${row.firstGuidedProductionLessonId ?? "—"} | ${row.firstTransferLessonId ?? "—"} |`
    );
  }
  lines.push("", "## Primeiras transferências (por frame)", "");
  for (const row of firstTransfers) {
    lines.push(`- **${row.lessonId}** · \`${row.frameId}\` · ${row.assist ?? "?"} · \`${row.target}\``);
  }
  lines.push("", "## Primeiras free_production guiadas", "");
  for (const row of firstFrees.slice(0, 20)) {
    lines.push(`- **${row.lessonId}** · \`${row.frameId}\` · \`${row.target}\``);
  }
  lines.push("", "## structurallyEligibleOpen (primeira por objetivo)", "");
  for (const row of firstOpens) {
    lines.push(`- **${row.lessonId}** · objetivo \`${row.goal}\` · modelo \`${row.model}\` _(elegibilidade estrutural — ver semântica acima)_`);
  }
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (failures.length > 0) {
    console.error(`\nvalidate:transfer-prerequisites encontrou ${failures.length} problema(s):`);
    for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
    if (failures.length > 40) console.error(`...mais ${failures.length - 40}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:transfer-prerequisites (${transferLessons} lições com transfer · ${freeLessons} com free · ${openLessons} com open).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
