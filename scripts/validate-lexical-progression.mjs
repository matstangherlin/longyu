/**
 * validate:lexical-progression — PED-016–027
 * Analyzes L1–L20 for abusive seed concentration and within-lesson excess.
 * Pedagogical opportunities (not UI distractors / vocab stamps).
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
      buildForcedLessonSeedExcessFixture,
      EARLY_LEXICAL_THRESHOLDS,
      SEED_GREETING_TOKENS,
      tokenCounts,
    } = load("src/data/lexicalProgression.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { ALL_LESSONS } = load("src/data/journey.js");

    // Meta-test: window concentration fixture MUST produce issues.
    const fixtureIssues = findLexicalProgressionIssues(buildForcedRepetitionFixture());
    if (fixtureIssues.length === 0) {
      addError(
        "fixture",
        "buildForcedRepetitionFixture deveria falhar (concentração abusiva de 你好) e não falhou"
      );
    } else {
      console.log(`OK fixture: forced window repetition detectou ${fixtureIssues.length} issue(s).`);
    }

    // Meta-test: PED-022 within-lesson hard gate.
    const lessonExcessIssues = findLexicalProgressionIssues(buildForcedLessonSeedExcessFixture());
    if (!lessonExcessIssues.some((i) => i.code === "seed_excess_hard")) {
      addError(
        "fixture-lesson",
        "buildForcedLessonSeedExcessFixture deveria falhar com seed_excess_hard (>12) e não falhou"
      );
    } else {
      console.log("OK fixture: forced within-lesson seed excess hard-failou.");
    }

    const early = ALL_LESSONS.slice(0, EARLY_COUNT);
    const lessonMetrics = [];
    const priorTokens = new Set();
    const seedTotals = Object.fromEntries(SEED_GREETING_TOKENS.map((s) => [s, 0]));

    for (const lesson of early) {
      const planned = lessonRoundStepsFor(lesson, { silent: true });
      const metrics = metricsForLesson(lesson, planned, priorTokens);
      lessonMetrics.push(metrics);
      const counts = tokenCounts(metrics.tokens);
      for (const seed of SEED_GREETING_TOKENS) {
        seedTotals[seed] += counts.get(seed) ?? 0;
      }
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
      "## Contagem (PED-022 / PED-025)",
      "",
      "Oportunidades pedagógicas = estímulo/resposta/montagem/falas primárias, **deduplicadas por passo**.",
      "Não entram: distractores de MCQ, stamps `introducesNewVocabulary` / `reusesPreviousVocabulary`.",
      "Frases longas (ex.: 你好吗) não contam como 你好.",
      "",
      "## Limiares (lições iniciais)",
      "",
      `| Métrica | Limite | Gate |`,
      `|---------|-------:|------|`,
      `| Concentração máx. de saudação seed (janela 5) | ${(EARLY_LEXICAL_THRESHOLDS.maxSeedGreetingConcentration * 100).toFixed(0)}% | hard |`,
      `| Lições dominadas pela mesma seed na janela | ${EARLY_LEXICAL_THRESHOLDS.maxSeedDominatedLessonsInWindow} | hard |`,
      `| Seed / lição normal | ≤${EARLY_LEXICAL_THRESHOLDS.maxTokenStepsPerLesson} ok · ${EARLY_LEXICAL_THRESHOLDS.maxTokenStepsPerLesson + 1}–${EARLY_LEXICAL_THRESHOLDS.warnTokenStepsPerLesson} aviso · >${EARLY_LEXICAL_THRESHOLDS.hardFailTokenStepsPerLesson} fail | hard |`,
      `| Seed / lição review | ≤${EARLY_LEXICAL_THRESHOLDS.reviewMaxTokenStepsPerLesson} ok · ${EARLY_LEXICAL_THRESHOLDS.reviewMaxTokenStepsPerLesson + 1}–${EARLY_LEXICAL_THRESHOLDS.reviewWarnTokenStepsPerLesson} aviso · >${EARLY_LEXICAL_THRESHOLDS.reviewHardFailTokenStepsPerLesson} fail | hard |`,
      `| Novelty load médio / passo | ${EARLY_LEXICAL_THRESHOLDS.maxMeanNoveltyLoad} | soft |`,
      "",
      `Saudação seed: ${SEED_GREETING_TOKENS.join(" · ")}`,
      "",
      "## Totais seed (oportunidades L1–L20)",
      "",
      `| Seed | Oportunidades |`,
      `|------|-------------:|`,
      ...SEED_GREETING_TOKENS.map((s) => `| ${s} | ${seedTotals[s]} |`),
      "",
      "## Por lição",
      "",
      "| # | Lição | Review | Top token | Conc. | Seed share | Novel | Lex | Str | Mod | Rec | Top3 | Dominada |",
      "|--:|-------|:------:|----------|------:|-----------:|------:|----:|----:|----:|----:|------|----------|",
    ];

    lessonMetrics.forEach((m, index) => {
      const top3 = (m.topRepeated ?? [])
        .map((t) => `${t.token}×${t.count}`)
        .join(", ");
      lines.push(
        `| ${index + 1} | \`${m.lessonId}\` | ${m.isReview ? "sim" : "—"} | ${m.concentration.topToken ?? "—"} | ${(m.concentration.share * 100).toFixed(0)}% | ${(m.seedGreetingShare * 100).toFixed(0)}% | ${m.novelCount} | ${m.noveltyAxes.lexical} | ${m.noveltyAxes.structural} | ${m.noveltyAxes.modality} | ${m.noveltyAxes.recovery} | ${top3 || "—"} | ${m.dominatedBySeed ?? "—"} |`
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
      lines.push("Nenhuma issue hard em L1–L20.");
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
      `OK: validate:lexical-progression (${EARLY_COUNT} lições · ${windows.length} janelas · ${warnings.length} aviso(s) soft · fixtures ok).`
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
