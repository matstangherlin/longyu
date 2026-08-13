/**
 * report:lexical-progression — human-readable report for L1–L20.
 * Reuses the same analysis as validate:lexical-progression (does not fail the build).
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "docs/reports/lexical-progression-l1-l20.md");
const EARLY_COUNT = 20;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lexical-report-"));
try {
  const program = ts.createProgram(
    [
      "src/data/lexicalProgression.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
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
    console.error("report:lexical-progression: falha ao compilar.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const {
    metricsForLesson,
    findLexicalProgressionIssues,
    findLexicalProgressionWarnings,
    analyzeWindows,
    EARLY_LEXICAL_THRESHOLDS,
    SEED_GREETING_TOKENS,
  } = load("src/data/lexicalProgression.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const chunkHanziById = new Map(CHUNKS.map((c) => [c.id, c.hanzi]));

  const early = ALL_LESSONS.slice(0, EARLY_COUNT);
  const lessonMetrics = [];
  const priorTokens = new Set();
  for (const lesson of early) {
    const planned = lessonRoundStepsFor(lesson, { silent: true });
    const libraryHanzi = [];
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      const [type, id] = String(ref).split(":");
      if (type === "chunk" && chunkHanziById.has(id)) libraryHanzi.push(chunkHanziById.get(id));
    }
    const enrichedLesson = {
      ...lesson,
      steps: [...(planned ?? []), ...libraryHanzi.map((hanzi) => ({ kind: "library_ref", hanzi }))],
    };
    const metrics = metricsForLesson(enrichedLesson, planned, priorTokens);
    lessonMetrics.push(metrics);
    for (const token of metrics.tokens) priorTokens.add(token);
  }

  const issues = findLexicalProgressionIssues(lessonMetrics, EARLY_LEXICAL_THRESHOLDS);
  const warnings = findLexicalProgressionWarnings(lessonMetrics, EARLY_LEXICAL_THRESHOLDS);
  const windows = analyzeWindows(lessonMetrics, 5);

  const lines = [
    "# Lexical progression — L1–L20",
    "",
    `_Gerado por \`report:lexical-progression\` · ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "Relatório humano da progressão lexical nas primeiras 20 lições.",
    "O validador (`validate:lexical-progression`) usa a mesma análise e falha só em concentração abusiva de saudações seed (janela 5).",
    "",
    "## Limiares",
    "",
    `- Concentração máx. seed (janela 5): **${(EARLY_LEXICAL_THRESHOLDS.maxSeedGreetingConcentration * 100).toFixed(0)}%** (hard)`,
    `- Lições dominadas na janela: **${EARLY_LEXICAL_THRESHOLDS.maxSeedDominatedLessonsInWindow}** (hard)`,
    `- Novelty load médio: **${EARLY_LEXICAL_THRESHOLDS.maxMeanNoveltyLoad}** (soft)`,
    `- Tokens seed vigiados: ${SEED_GREETING_TOKENS.join(", ")}`,
    "",
    "## Resumo",
    "",
    `| Indicador | Valor |`,
    `|-----------|------:|`,
    `| Lições analisadas | ${lessonMetrics.length} |`,
    `| Janelas de 5 | ${windows.length} |`,
    `| Issues (hard) | ${issues.length} |`,
    `| Avisos (soft) | ${warnings.length} |`,
    `| Lições dominadas por seed | ${lessonMetrics.filter((m) => m.dominatedBySeed).length} |`,
    "",
    "## Por lição",
    "",
    "| # | Lição | Título | Top | Conc. | Seed % | Novelty |",
    "|--:|-------|--------|-----|------:|-------:|--------:|",
  ];

  lessonMetrics.forEach((m, i) => {
    lines.push(
      `| ${i + 1} | \`${m.lessonId}\` | ${m.title} | ${m.concentration.topToken ?? "—"} | ${(m.concentration.share * 100).toFixed(0)}% | ${(m.seedGreetingShare * 100).toFixed(0)}% | ${m.meanNoveltyLoad.toFixed(2)} |`
    );
  });

  lines.push("", "## Janelas", "");
  for (const w of windows) {
    lines.push(
      `- **${w.lessonIds.join(" → ")}** — seed ${w.seedGreetingConcentration.token ?? "—"} ${(w.seedGreetingConcentration.share * 100).toFixed(0)}%; dominadas ${w.dominatedLessonCount}`
    );
  }

  lines.push("", "## Issues (hard)", "");
  if (issues.length === 0) lines.push("_Nenhuma._");
  else for (const issue of issues) lines.push(`- **${issue.code}**: ${issue.message}`);

  lines.push("", "## Avisos (soft)", "");
  if (warnings.length === 0) lines.push("_Nenhum._");
  else {
    for (const warning of warnings.slice(0, 30)) lines.push(`- **${warning.code}**: ${warning.message}`);
    if (warnings.length > 30) lines.push(`- _…mais ${warnings.length - 30}._`);
  }
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`OK: report escrito em ${path.relative(rootDir, reportPath)} (${issues.length} hard · ${warnings.length} soft).`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
