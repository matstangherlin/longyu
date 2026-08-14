#!/usr/bin/env node
/**
 * PED-V33 report — docs/reports/mastery-coverage.md
 *
 * Cobertura do Mastery Loop por categoria curricular, cruzando a
 * classificação estática de masteryCoverage.ts com o estado REAL da
 * Jornada (lesson.masteryLoop === true), para acompanhar a expansão feita
 * por outro agente sem depender de edições manuais neste relatório.
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-coverage-report-"));

// Ordem de exibição pedida pela remessa V3.3.
const CATEGORY_ORDER = ["foundation", "daily-life", "travel", "china-real", "survival", "intermediate", "review"];
const CATEGORY_LABELS = {
  foundation: "Fundamentos",
  "daily-life": "Vida cotidiana",
  travel: "Viagem",
  "china-real": "China Real",
  survival: "Survival Mandarin",
  intermediate: "Intermediário",
  review: "Revisão",
};

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
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatório de cobertura mastery");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const masteryLoopIds = new Set(ALL_LESSONS.filter((l) => l.masteryLoop).map((l) => l.id));
  const TARGET_MIN = typeof coverage.TARGET_MASTERY_MIN === "number" ? coverage.TARGET_MASTERY_MIN : 35;
  const TARGET_IDEAL = typeof coverage.TARGET_MASTERY_IDEAL === "number" ? coverage.TARGET_MASTERY_IDEAL : 40;

  const rowsByCategory = new Map(CATEGORY_ORDER.map((cat) => [cat, { total: 0, mastery: 0 }]));
  for (const meta of coverage.MASTERY_LESSON_COVERAGE) {
    const row = rowsByCategory.get(meta.category);
    if (!row) continue; // sound-lab/hanzi-lab/system ficam fora desta tabela (não aplicável a mastery).
    row.total += 1;
    if (masteryLoopIds.has(meta.lessonId)) row.mastery += 1;
  }

  const lines = [
    "# Cobertura do Mastery Loop por categoria",
    "",
    ...provenance,
    "",
    "Cruza a classificação estática de `src/data/masteryCoverage.ts` (categoria,",
    "onda, status) com o estado real da Jornada (`lesson.masteryLoop === true`),",
    "para que este relatório acompanhe migrações feitas em paralelo sem precisar",
    "de edição manual.",
    "",
    `Meta mínima da remessa V3.3: **${TARGET_MIN}** lições migradas. Meta ideal: **${TARGET_IDEAL}**.`,
    "",
    "## Cobertura por categoria",
    "",
    "| Categoria | Total | Mastery | Cobertura % |",
    "|-----------|------:|--------:|-------------:|",
  ];

  let totalAll = 0;
  let masteryAll = 0;
  for (const cat of CATEGORY_ORDER) {
    const row = rowsByCategory.get(cat);
    const pct = row.total > 0 ? Math.round((row.mastery / row.total) * 1000) / 10 : 0;
    lines.push(`| ${CATEGORY_LABELS[cat] ?? cat} (\`${cat}\`) | ${row.total} | ${row.mastery} | ${pct}% |`);
    totalAll += row.total;
    masteryAll += row.mastery;
  }
  const pctAll = totalAll > 0 ? Math.round((masteryAll / totalAll) * 1000) / 10 : 0;
  lines.push(`| **Subtotal (categorias aplicáveis)** | **${totalAll}** | **${masteryAll}** | **${pctAll}%** |`);
  lines.push("");

  lines.push("## Visão geral da Jornada", "");
  lines.push(`- Total de lições na Jornada: **${ALL_LESSONS.length}**`);
  lines.push(`- Lições com \`masteryLoop: true\`: **${masteryLoopIds.size}**`);
  lines.push(
    `- Categorias não elegíveis (sound-lab/hanzi-lab/system): **${coverage.MASTERY_LESSON_COVERAGE.length - totalAll}**`
  );
  lines.push(
    masteryLoopIds.size >= TARGET_MIN
      ? `- Meta mínima (${TARGET_MIN}) atingida ✅`
      : `- Meta mínima (${TARGET_MIN}) ainda não atingida — faltam ${TARGET_MIN - masteryLoopIds.size}`
  );
  lines.push(
    masteryLoopIds.size >= TARGET_IDEAL
      ? `- Meta ideal (${TARGET_IDEAL}) atingida ✅`
      : `- Meta ideal (${TARGET_IDEAL}) ainda não atingida — faltam ${TARGET_IDEAL - masteryLoopIds.size}`
  );
  lines.push("");

  lines.push("## Detalhe por lição", "");
  lines.push("| Categoria | Lição | Status classificado | Mastery real |", "|-----------|-------|----------------------|---------------|");
  for (const cat of CATEGORY_ORDER) {
    for (const meta of coverage.MASTERY_LESSON_COVERAGE.filter((m) => m.category === cat)) {
      const real = masteryLoopIds.has(meta.lessonId) ? "✅" : "—";
      lines.push(`| ${cat} | \`${meta.lessonId}\` | ${meta.status} | ${real} |`);
    }
  }
  lines.push("");

  const reportPath = path.join(rootDir, "docs/reports/mastery-coverage.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(`Wrote ${path.relative(rootDir, reportPath)} — ${masteryAll}/${totalAll} (${pctAll}%), Jornada total ${ALL_LESSONS.length}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
