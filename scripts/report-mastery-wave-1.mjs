#!/usr/bin/env node
/**
 * PED-V33 report — docs/reports/mastery-wave-1.md
 *
 * Lista as 24 lições de WAVE1_EXPANSION_LESSON_IDS (masteryCoverage.ts),
 * cruzando com o estado real da Jornada (migrated vs pending) e, quando
 * disponível, o masteryQualityScore de cada uma.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-wave1-report-"));

const TS_COMPILE_OPTIONS = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: rootDir,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
  jsx: ts.JsxEmit.ReactJSX,
};

async function tryLoadOptionalModule(relSourcePath, relEmittedPath) {
  if (!existsSync(path.join(rootDir, relSourcePath))) return null;
  const qOutDir = await mkdtemp(path.join(os.tmpdir(), "longyu-wave1-report-opt-"));
  try {
    const program = ts.createProgram([relSourcePath], { ...TS_COMPILE_OPTIONS, outDir: qOutDir });
    const emit = program.emit();
    if (emit.emitSkipped) return null;
    return require(path.join(qOutDir, relEmittedPath));
  } catch {
    return null;
  } finally {
    await rm(qOutDir, { recursive: true, force: true });
  }
}

try {
  const program = ts.createProgram(["src/data/masteryCoverage.ts", "src/data/journey.ts"], {
    ...TS_COMPILE_OPTIONS,
    outDir,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatório da Wave 1");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));

  let masteryQualityScore = null;
  let qualityScoreSource = null;
  const qualityModule = await tryLoadOptionalModule("src/data/masteryQuality.ts", "src/data/masteryQuality.js");
  if (qualityModule && typeof qualityModule.masteryQualityScore === "function") {
    masteryQualityScore = qualityModule.masteryQualityScore;
    qualityScoreSource = "masteryQuality.ts";
  } else if (typeof coverage.masteryQualityScore === "function") {
    masteryQualityScore = coverage.masteryQualityScore;
    qualityScoreSource = "masteryCoverage.ts";
  }

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const waveIds = coverage.WAVE1_EXPANSION_LESSON_IDS ?? [];
  let migratedCount = 0;

  const lines = [
    "# Mastery Wave 1 — remessa V3.3",
    "",
    ...provenance,
    "",
    `\`WAVE1_EXPANSION_LESSON_IDS\` (\`src/data/masteryCoverage.ts\`) lista **${waveIds.length}** lições candidatas`,
    "a ganhar Mastery Loop nesta remessa. Este relatório cruza cada uma com o",
    "estado real da Jornada.",
    "",
    qualityScoreSource
      ? `Quality score lido de \`${qualityScoreSource}\`.`
      : "`masteryQualityScore` não encontrado (nem em masteryCoverage.ts nem em masteryQuality.ts) — coluna de qualidade fica em branco.",
    "",
    "| # | Lição | Status | Quality score |",
    "|---|-------|--------|----------------|",
  ];

  waveIds.forEach((lessonId, index) => {
    const lesson = getLesson(lessonId);
    const migrated = Boolean(lesson?.masteryLoop);
    if (migrated) migratedCount += 1;
    let scoreCell = "—";
    if (masteryQualityScore) {
      try {
        const score = masteryQualityScore(lessonId);
        if (score == null) {
          scoreCell = "—";
        } else if (typeof score === "number" || typeof score === "boolean") {
          scoreCell = String(score);
        } else if (typeof score === "object" && typeof score.score === "number") {
          // Forma { score, passes, checks } (ver src/data/masteryQuality.ts).
          scoreCell = `${score.score} ${score.passes ? "✅" : "⚠️"}`;
        } else {
          scoreCell = String(score);
        }
      } catch {
        scoreCell = "erro";
      }
    }
    const status = !lesson ? "⚠️ não encontrada na Jornada" : migrated ? "migrated ✅" : "pending ⏳";
    lines.push(`| ${index + 1} | \`${lessonId}\` | ${status} | ${scoreCell} |`);
  });

  lines.push("");
  lines.push("## Resumo", "");
  lines.push(`- Migradas: **${migratedCount}/${waveIds.length}**`);
  lines.push(`- Pendentes: **${waveIds.length - migratedCount}/${waveIds.length}**`);
  lines.push("");

  const reportPath = path.join(rootDir, "docs/reports/mastery-wave-1.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(`Wrote ${path.relative(rootDir, reportPath)} — ${migratedCount}/${waveIds.length} migradas`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
