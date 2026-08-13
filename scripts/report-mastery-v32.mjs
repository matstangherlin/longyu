#!/usr/bin/env node
/**
 * PED-V32 report — docs/reports/mastery-expansion-v32.md
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v32-report-"));

try {
  const program = ts.createProgram(
    [
      "src/data/chinaReal.ts",
      "src/data/survivalMandarin.ts",
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
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
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatorio V3.2");

  const china = require(path.join(outDir, "src/data/chinaReal.js"));
  const survival = require(path.join(outDir, "src/data/survivalMandarin.js"));
  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });
  const masteryLessons = ALL_LESSONS.filter((l) => l.masteryLoop);

  const lines = [
    "# Mastery Expansion V3.2 + Survival Mandarin",
    "",
    ...provenance,
    "",
    "Base: China Real V3.1. Expande Mastery para mais blocos da Jornada,",
    "adiciona Survival Mandarin e onda 2 de cidades com funcao lexical propria.",
    "",
    `## Cobertura Mastery: ${masteryLessons.length} / ${ALL_LESSONS.length} licoes`,
    "",
    ...masteryLessons.map((l) => `- \`${l.id}\` — ${l.title}`),
    "",
    "## Orcamento por pass (anti-fadiga)",
    "",
  ];

  for (const pass of [1, 2, 3, 4]) {
    const b = mastery.MASTERY_PASS_GRADED_BUDGET[pass];
    lines.push(`- Pass ${pass}: ${b.min}–${b.max} passos graduados preferidos`);
  }

  lines.push("", "## China Real onda 2", "");
  for (const city of china.CHINA_WAVE2_CITIES) {
    lines.push(
      `- **${city.hanzi}** — ${city.meaningPt}; eixo ${city.functionalAxis}; lexemas: ${(city.functionalLexemes ?? []).join(", ")}`
    );
  }

  lines.push("", "## Survival Mandarin", "");
  for (const axis of ["payment", "phone", "hotel", "needs"]) {
    const items = survival.ALL_SURVIVAL_ITEMS.filter((i) => i.axis === axis);
    lines.push(`### ${axis}`);
    for (const item of items) lines.push(`- ${item.hanzi} — ${item.meaningPt}`);
    lines.push("");
  }

  lines.push("## Novos kinds de mundo real", "");
  lines.push("- `sign_reading` — placas (出口/入口/地铁/医院)");
  lines.push("- `menu_reading` — mini cardapio");
  lines.push("- `price_task` — 28元");
  lines.push("- `route_sequence` — 一直走 → 左转 → 地铁站");
  lines.push("- `schedule_reading` — horario curto de trem");
  lines.push("");
  lines.push("## Producao M4 com equivalentes", "");
  lines.push(`- Ex.: 我要水 ≈ ${mastery.equivalentAnswersFor("我要水").join(" / ")}`);
  lines.push("");

  lines.push("## Tamanho de planos (amostra)", "");
  for (const lessonId of ["l4", "p6-survival-mandarin", "p6-china-cidades-2", "p6-china-cidades"]) {
    const lesson = getLesson(lessonId);
    lines.push(`### ${lessonId}`);
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true });
      const kinds = [...new Set(plan.map((s) => s.kind))];
      lines.push(`- Pass ${pass}: ${plan.length} passos · kinds: ${kinds.join(", ")}`);
    }
    lines.push("");
  }

  const reportPath = path.join(rootDir, "docs/reports/mastery-expansion-v32.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(`Wrote ${path.relative(rootDir, reportPath)}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
