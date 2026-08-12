/**
 * validate:structural-concepts — garante que a UI/jornada não pressupõe
 * jargão gramatical (sujeito, verbo, partícula…) antes da intro formal.
 *
 * Gera reports/structural-concepts-report.md.
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
const reportPath = path.join(rootDir, "reports/structural-concepts-report.md");
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-structural-concepts-"));
try {
  const program = ts.createProgram(
    [
      "src/data/structuralConcepts.ts",
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/vocabulary.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
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
    console.error("Falha ao compilar validate:structural-concepts.");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { SENTENCE_FRAMES } = load("src/data/productionTasks.js");
  const {
    STRUCTURAL_CONCEPTS,
    TECHNICAL_TERM_PATTERNS,
    conceptLabelStage,
    formatConceptLabel,
    conceptsAssumedByFrame,
    resolveSlotLabel,
  } = load("src/data/structuralConcepts.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");

  const lessonIndex = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));
  const frameById = new Map(SENTENCE_FRAMES.map((frame) => [frame.id, frame]));

  // ——— 1. Integridade do catálogo ———
  const conceptIds = new Set();
  for (const concept of STRUCTURAL_CONCEPTS) {
    assert(!conceptIds.has(concept.id), `conceito duplicado: ${concept.id}`);
    conceptIds.add(concept.id);
    assert(Boolean(concept.technicalLabelPt?.trim()), `${concept.id}: sem technicalLabelPt`);
    assert(Boolean(concept.intuitiveLabelPt?.trim()), `${concept.id}: sem intuitiveLabelPt`);
    assert(lessonIndex.has(concept.introducedAt), `${concept.id}: introducedAt inexistente (${concept.introducedAt})`);
    assert(lessonIndex.has(concept.practicedAt), `${concept.id}: practicedAt inexistente (${concept.practicedAt})`);
    for (const frameId of [...concept.masteryRequiredFor, ...concept.usedByFrames]) {
      assert(frameById.has(frameId), `${concept.id}: frame inexistente (${frameId})`);
    }
  }

  // ——— 2. Autoral: termo técnico antes da intro ———
  const prematureTerms = [];
  for (const [index, lesson] of ALL_LESSONS.entries()) {
    for (const step of lesson.steps ?? []) {
      const blob = [
        step.title,
        step.body,
        step.prompt,
        step.explanation,
        step.situationPt,
        ...(step.options ?? []),
      ]
        .filter(Boolean)
        .join("\n");
      for (const { conceptId, pattern } of TECHNICAL_TERM_PATTERNS) {
        if (!pattern.test(blob)) continue;
        const concept = STRUCTURAL_CONCEPTS.find((item) => item.id === conceptId);
        if (!concept) continue;
        const introAt = lessonIndex.get(concept.introducedAt) ?? Infinity;
        // A própria lição de intro (e depois) pode usar o termo — é o ensino.
        if (index < introAt) {
          prematureTerms.push(`${lesson.id}: "${concept.technicalLabelPt}" antes de ${concept.introducedAt}`);
        }
      }
    }
  }
  assert(
    prematureTerms.length === 0,
    `termo técnico antes da intro:\n  - ${prematureTerms.slice(0, 12).join("\n  - ")}`
  );

  // ——— 3. Labels gerados no plano real respeitam o estágio ———
  const labelMismatches = [];
  const stageSamples = { intuitive: 0, paired: 0, technical: 0 };
  let productionWithSlots = 0;

  for (const lesson of ALL_LESSONS) {
    const plan = lessonRoundStepsFor(lesson, { silent: true, attemptNumber: 0 });
    for (const step of plan) {
      if (step.kind !== "transfer_task" && step.kind !== "free_production") continue;
      if (!step.patternSlots?.length) continue;
      productionWithSlots += 1;
      const assumed = conceptsAssumedByFrame(
        step.productionFrameId ?? "",
        step.patternSlots,
        step.patternPt
      );
      for (const conceptId of assumed) {
        const stage = conceptLabelStage(conceptId, lesson.id);
        stageSamples[stage] = (stageSamples[stage] ?? 0) + 1;
        const label = formatConceptLabel(conceptId, lesson.id);
        if (stage === "intuitive" && /sujeito|verbo|objeto|part[ií]cula|classificador|localiza/i.test(label)) {
          labelMismatches.push(
            `${lesson.id}/${step.productionFrameId ?? "?"}: estágio intuitivo ainda mostra técnico (${label})`
          );
        }
        if (stage === "paired" && !label.includes("(")) {
          labelMismatches.push(
            `${lesson.id}/${conceptId}: estágio paired sem forma "intuitivo (técnico)" (${label})`
          );
        }
      }
      // Smoke: resolveSlotLabel não devolve vazio.
      for (const slot of step.patternSlots) {
        const resolved = resolveSlotLabel(slot, {
          lessonId: lesson.id,
          frameId: step.productionFrameId,
          patternPt: step.patternPt,
        });
        assert(Boolean(resolved?.trim()), `${lesson.id}: slot ${slot.role} sem rótulo`);
      }
    }
  }
  assert(labelMismatches.length === 0, `rótulos fora do estágio:\n  - ${labelMismatches.slice(0, 10).join("\n  - ")}`);
  assert(productionWithSlots > 0, "nenhum passo de produção com slots para auditar rótulos");
  assert(stageSamples.intuitive > 0, "nenhum rótulo intuitivo no plano real — catálogo cedo demais?");
  assert(stageSamples.paired > 0 || stageSamples.technical > 0, "nenhum rótulo paired/technical — intros nunca alcançadas?");

  // ——— 4. masteryRequiredFor só depois da prática ———
  for (const concept of STRUCTURAL_CONCEPTS) {
    const intro = lessonIndex.get(concept.introducedAt) ?? -1;
    const practiced = lessonIndex.get(concept.practicedAt) ?? -1;
    const masteryFrom = Math.max(intro, practiced);
    for (const frameId of concept.masteryRequiredFor) {
      // A primeira lição em que o plano cobra o frame com label technical
      // precisa ser depois de masteryFrom.
      for (const [index, lesson] of ALL_LESSONS.entries()) {
        if (index <= masteryFrom) continue;
        // só checa consistência do estágio, não obriga o frame a aparecer
        assert(
          conceptLabelStage(concept.id, lesson.id) === "technical",
          `${concept.id}: esperava technical em ${lesson.id} (após ${concept.practicedAt})`
        );
        break;
      }
    }
  }

  const lines = [
    "# Relatório: conceitos estruturais e rótulos de UI",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Política de rótulos",
    "",
    "| Estágio | Quando | Exemplo |",
    "|---------|--------|---------|",
    "| intuitivo | antes de `introducedAt` | quem · ação · coisa · pergunta |",
    "| pareado | intro → prática | quem (sujeito) · ação (verbo) |",
    "| técnico | depois de `practicedAt` | sujeito · verbo · objeto |",
    "",
    "## Catálogo",
    "",
    "| Conceito | Intuitivo | Técnico | Intro | Prática | Frames |",
    "|----------|-----------|---------|-------|---------|--------|",
  ];
  for (const concept of STRUCTURAL_CONCEPTS) {
    lines.push(
      `| \`${concept.id}\` | ${concept.intuitiveLabelPt} | ${concept.technicalLabelPt} | ${concept.introducedAt} | ${concept.practicedAt} | ${concept.usedByFrames.length} |`
    );
  }
  lines.push(
    "",
    "## Amostra de estágios no plano real",
    "",
    `| Estágio | Contagens (conceito×passo) |`,
    `|---------|---------------------------:|`,
    `| intuitivo | ${stageSamples.intuitive} |`,
    `| pareado | ${stageSamples.paired} |`,
    `| técnico | ${stageSamples.technical} |`,
    `| Passos de produção com slots | ${productionWithSlots} |`,
    "",
    "## Exemplos de rótulo por lição",
    ""
  );
  for (const lessonId of ["l5", "p3-ordem-das-palavras", "l5-rev", "l26b", "l11-rev"]) {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
    if (!lesson) continue;
    const subject = formatConceptLabel("subject", lessonId);
    const verb = formatConceptLabel("verb", lessonId);
    const object = formatConceptLabel("object", lessonId);
    const particle = formatConceptLabel("particle", lessonId);
    lines.push(`- **${lessonId}**: ${subject} · ${verb} · ${object} · ${particle}`);
  }
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (failures.length > 0) {
    console.error(`\nvalidate:structural-concepts encontrou ${failures.length} problema(s):`);
    for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
    if (failures.length > 40) console.error(`...mais ${failures.length - 40}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:structural-concepts (${STRUCTURAL_CONCEPTS.length} conceitos · ${productionWithSlots} passos com slots · intuitivo/pareado/técnico ${stageSamples.intuitive}/${stageSamples.paired}/${stageSamples.technical}).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
