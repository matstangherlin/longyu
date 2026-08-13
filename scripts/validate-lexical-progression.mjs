/**
 * validate:lexical-progression — PED-016–020
 * Analyzes L1–L20 for abusive seed-greeting concentration and novelty load.
 * Includes an artificial fixture that MUST fail when forced repetition is injected.
 * Writes docs/reports/lexical-progression-l1-l20.md
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
const errors = [];
const addError = (ref, message) => errors.push(`[${ref}] ${message}`);

const EARLY_COUNT = 20;

async function compileAndLoad() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lexical-"));
  const program = ts.createProgram(
    [
      "src/data/lexicalProgression.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
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
    await rm(outDir, { recursive: true, force: true });
    throw new Error("validate:lexical-progression: falha ao compilar TypeScript");
  }
  const load = (rel) => require(path.join(outDir, rel));
  return { outDir, load };
}

async function main() {
  const { outDir, load } = await compileAndLoad();
  try {
    const {
      metricsForLesson,
      findLexicalProgressionIssues,
      findLexicalProgressionWarnings,
      analyzeWindows,
      buildForcedRepetitionFixture,
      EARLY_LEXICAL_THRESHOLDS,
      SEED_GREETING_TOKENS,
    } = load("src/data/lexicalProgression.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { CHUNKS } = load("src/data/chunks.js");

    const chunkHanziById = new Map(CHUNKS.map((c) => [c.id, c.hanzi]));

    // Meta-test: forced repetition fixture MUST produce issues.
    const fixtureIssues = findLexicalProgressionIssues(buildForcedRepetitionFixture());
    if (fixtureIssues.length === 0) {
      addError(
        "fixture",
        "buildForcedRepetitionFixture deveria falhar (concentração abusiva de 你好) e não falhou"
      );
    } else {
      console.log(`OK fixture: forced repetition detectou ${fixtureIssues.length} issue(s).`);
    }

    const early = ALL_LESSONS.slice(0, EARLY_COUNT);
    const lessonMetrics = [];
    const priorTokens = new Set();

    for (const lesson of early) {
      const planned = lessonRoundStepsFor(lesson, { silent: true });
      // Enrich library refs with real chunk hanzi for token extraction.
      const libraryHanzi = [];
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
        const [type, id] = String(ref).split(":");
        if (type === "chunk" && chunkHanziById.has(id)) libraryHanzi.push(chunkHanziById.get(id));
      }
      const enrichedLesson = {
        ...lesson,
        steps: [
          ...(planned ?? []),
          ...libraryHanzi.map((hanzi) => ({ kind: "library_ref", hanzi })),
        ],
      };
      const metrics = metricsForLesson(enrichedLesson, planned, priorTokens);
      lessonMetrics.push(metrics);
      for (const token of metrics.tokens) priorTokens.add(token);
    }

    const issues = findLexicalProgressionIssues(lessonMetrics, EARLY_LEXICAL_THRESHOLDS);
    const warnings = findLexicalProgressionWarnings(lessonMetrics, EARLY_LEXICAL_THRESHOLDS);
    for (const issue of issues) {
      addError(issue.code, `${issue.lessonIds.join(",")}: ${issue.message}`);
    }

    const windows = analyzeWindows(lessonMetrics, 5);
    const lines = [
      "# Lexical progression — L1–L20",
      "",
      `_Gerado por \`validate:lexical-progression\` · ${new Date().toISOString().slice(0, 10)}_`,
      "",
      "## Limiares (lições iniciais)",
      "",
      `| Métrica | Limite | Gate |`,
      `|---------|-------:|------|`,
      `| Concentração máx. de saudação seed (janela 5) | ${(EARLY_LEXICAL_THRESHOLDS.maxSeedGreetingConcentration * 100).toFixed(0)}% | hard |`,
      `| Lições dominadas pela mesma seed na janela | ${EARLY_LEXICAL_THRESHOLDS.maxSeedDominatedLessonsInWindow} | hard |`,
      `| Novelty load médio / passo | ${EARLY_LEXICAL_THRESHOLDS.maxMeanNoveltyLoad} | soft |`,
      `| Seed repetition aviso / lição | ${EARLY_LEXICAL_THRESHOLDS.maxTokenStepsPerLesson} | soft |`,
      "",
      `Saudação seed: ${SEED_GREETING_TOKENS.join(" · ")}`,
      "",
      "## Por lição",
      "",
      "| # | Lição | Top token | Conc. | Seed share | Novel | Reuse | Excess | Novelty load | Dominada |",
      "|--:|-------|----------|------:|-----------:|------:|------:|-------:|-------------:|----------|",
    ];

    lessonMetrics.forEach((m, index) => {
      lines.push(
        `| ${index + 1} | \`${m.lessonId}\` | ${m.concentration.topToken ?? "—"} | ${(m.concentration.share * 100).toFixed(0)}% | ${(m.seedGreetingShare * 100).toFixed(0)}% | ${m.novelCount} | ${m.reuseCount} | ${m.excessRepetition} | ${m.meanNoveltyLoad.toFixed(2)} | ${m.dominatedBySeed ?? "—"} |`
      );
    });

    lines.push("", "## Janelas de 5 lições", "");
    lines.push("| Janela | Seed top | Seed % | Dominadas | Top token | Conc. |");
    lines.push("|--------|----------|-------:|----------:|-----------|------:|");
    for (const w of windows) {
      lines.push(
        `| ${w.lessonIds[0]}…${w.lessonIds[w.lessonIds.length - 1]} | ${w.seedGreetingConcentration.token ?? "—"} | ${(w.seedGreetingConcentration.share * 100).toFixed(0)}% | ${w.dominatedLessonCount} | ${w.concentration.topToken ?? "—"} | ${(w.concentration.share * 100).toFixed(0)}% |`
      );
    }

    lines.push("", "## Issues (hard gate)", "");
    if (issues.length === 0) {
      lines.push("Nenhuma issue de concentração abusiva de saudação seed em L1–L20.");
    } else {
      for (const issue of issues) {
        lines.push(`- **${issue.code}**: ${issue.message}`);
      }
    }

    lines.push("", "## Avisos (soft)", "");
    if (warnings.length === 0) {
      lines.push("_Nenhum._");
    } else {
      for (const warning of warnings.slice(0, 40)) {
        lines.push(`- **${warning.code}**: ${warning.message}`);
      }
      if (warnings.length > 40) lines.push(`- _…mais ${warnings.length - 40}._`);
    }
    lines.push("");

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join("\n"), "utf8");
    console.log(`Relatório: ${path.relative(rootDir, reportPath)}`);

    if (errors.length > 0) {
      console.error(`\nvalidate:lexical-progression encontrou ${errors.length} problema(s):`);
      for (const error of errors.slice(0, 40)) console.error(`- ${error}`);
      if (errors.length > 40) console.error(`...mais ${errors.length - 40}.`);
      process.exit(1);
    }

    console.log(
      `OK: validate:lexical-progression (${EARLY_COUNT} lições · ${windows.length} janelas · ${warnings.length} aviso(s) soft · fixture fail-test ok).`
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
