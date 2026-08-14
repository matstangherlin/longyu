#!/usr/bin/env node
/**
 * PED-V33 report — docs/reports/transfer-review.md
 *
 * Documenta TRANSFER_REVIEWS (src/data/masteryCoverage.ts): checkpoints que
 * misturam itens de várias lições já migradas, sem revelar a origem, para
 * testar transferência real de aprendizagem. Cruza cada pré-requisito com o
 * estado real da Jornada (migrated vs pendente).
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-transfer-review-report-"));

try {
  const program = ts.createProgram(["src/data/masteryCoverage.ts", "src/data/journey.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatório de transfer review");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const reviews = coverage.TRANSFER_REVIEWS ?? [];

  const lines = [
    "# Transfer Reviews — checkpoints entre-módulos",
    "",
    ...provenance,
    "",
    "`TRANSFER_REVIEWS` (`src/data/masteryCoverage.ts`) mistura itens de várias",
    "lições já migradas para testar transferência (não trivia de origem). Cada",
    "checkpoint roda como revisão avulsa depois que suas lições pré-requisito",
    "entram no Mastery Loop.",
    "",
    `Total de checkpoints: **${reviews.length}**`,
    "",
  ];

  for (const review of reviews) {
    const prereqStatus = review.prerequisiteLessonIds.map((id) => {
      const lesson = getLesson(id);
      const migrated = Boolean(lesson?.masteryLoop);
      return { id, migrated, exists: Boolean(lesson) };
    });
    const migratedCount = prereqStatus.filter((p) => p.migrated).length;
    const ready = migratedCount === prereqStatus.length;

    lines.push(`## ${review.titlePt} (\`${review.id}\`)`, "");
    lines.push(review.situationPt, "");
    lines.push(
      ready
        ? `Pré-requisitos: **${migratedCount}/${prereqStatus.length} migrados** ✅ (checkpoint pronto)`
        : `Pré-requisitos: **${migratedCount}/${prereqStatus.length} migrados** ⏳ (aguardando o resto)`
    );
    lines.push("");
    lines.push("| Pré-requisito | Estado |", "|---------------|--------|");
    for (const p of prereqStatus) {
      const state = !p.exists ? "⚠️ não encontrada" : p.migrated ? "migrated ✅" : "pending ⏳";
      lines.push(`| \`${p.id}\` | ${state} |`);
    }
    lines.push("");
    lines.push(`Tarefas curadas: **${review.tasks.length}**`, "");
    lines.push("| # | Situação | Resposta esperada |", "|---|----------|--------------------|");
    review.tasks.forEach((task, index) => {
      lines.push(`| ${index + 1} | ${task.situationPt} | \`${task.answer}\` |`);
    });
    lines.push("");
  }

  const reportPath = path.join(rootDir, "docs/reports/transfer-review.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(`Wrote ${path.relative(rootDir, reportPath)} — ${reviews.length} checkpoints`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
