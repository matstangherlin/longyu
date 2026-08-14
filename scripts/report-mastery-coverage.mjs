#!/usr/bin/env node
/**
 * PED-V34 report — docs/reports/mastery-coverage.md (Coverage V2)
 *
 * Separa Mastery Enabled vs Mastery Certified, e Review Mastery.
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
  const program = ts.createProgram(
    [
      "src/data/masteryCoverage.ts",
      "src/data/masteryQuality.ts",
      "src/data/masteryPilot.ts",
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("Falha ao compilar relatório de cobertura mastery");

  const coverage = require(path.join(outDir, "src/data/masteryCoverage.js"));
  const quality = require(path.join(outDir, "src/data/masteryQuality.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const enabledLessons = ALL_LESSONS.filter((l) => l.masteryLoop);
  const reviewMasteryLessons = ALL_LESSONS.filter((l) => l.reviewMasteryMode);
  const masteryLoopIds = new Set(enabledLessons.map((l) => l.id));

  const certifiedIds = new Set();
  for (const lesson of enabledLessons) {
    const plansByPass = {};
    for (const pass of [1, 2, 3, 4]) {
      plansByPass[pass] = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
      });
    }
    const result = quality.masteryQualityScore(lesson.id, plansByPass);
    if (quality.isMasteryCertified(result)) certifiedIds.add(lesson.id);
  }

  const nonApplicable = coverage.MASTERY_LESSON_COVERAGE.filter((m) =>
    ["sound-lab", "hanzi-lab", "system"].includes(m.category) || m.status === "not-applicable"
  );
  const normalEligible = coverage.MASTERY_LESSON_COVERAGE.filter(
    (m) => !["sound-lab", "hanzi-lab", "system", "review"].includes(m.category)
  );
  const reviewSpecial = coverage.listByStatus("review-special");

  const TARGET_MIN = coverage.TARGET_MASTERY_MIN ?? 35;
  const TARGET_IDEAL = coverage.TARGET_MASTERY_IDEAL ?? 40;
  const TARGET_NORMAL = coverage.TARGET_NORMAL_ELIGIBLE ?? 46;

  const rowsByCategory = new Map(CATEGORY_ORDER.map((cat) => [cat, { total: 0, mastery: 0, certified: 0, reviewMode: 0 }]));
  for (const meta of coverage.MASTERY_LESSON_COVERAGE) {
    const row = rowsByCategory.get(meta.category);
    if (!row) continue;
    row.total += 1;
    if (masteryLoopIds.has(meta.lessonId)) row.mastery += 1;
    if (certifiedIds.has(meta.lessonId)) row.certified += 1;
    if (reviewMasteryLessons.some((l) => l.id === meta.lessonId)) row.reviewMode += 1;
  }

  const lines = [
    "# Cobertura do Mastery Loop — Coverage V2",
    "",
    ...provenance,
    "",
    "KPI pedagógico (V3.4): **Mastery Certified / Eligible Lessons**, não Mastery/127.",
    "",
    "## Resumo V2",
    "",
    "```text",
    `Journey: ${ALL_LESSONS.length}`,
    "",
    `Eligible normal lessons: ${normalEligible.length}`,
    `Mastery Enabled: ${enabledLessons.length}`,
    `Mastery Certified: ${certifiedIds.size}`,
    `Review Mastery: ${reviewMasteryLessons.length}/${reviewSpecial.length}`,
    `Non-applicable labs/system: ${nonApplicable.length}`,
    "```",
    "",
    `- Certified / Enabled: **${enabledLessons.length ? Math.round((certifiedIds.size / enabledLessons.length) * 1000) / 10 : 0}%**`,
    `- Enabled / Normal eligible: **${normalEligible.length ? Math.round((enabledLessons.length / normalEligible.length) * 1000) / 10 : 0}%**`,
    `- Meta normal elegível (${TARGET_NORMAL}): ${enabledLessons.length >= TARGET_NORMAL ? "✅" : "❌"}`,
    `- Meta mínima legado (${TARGET_MIN}): ${enabledLessons.length >= TARGET_MIN ? "✅" : "❌"}`,
    `- Meta ideal legado (${TARGET_IDEAL}): ${enabledLessons.length >= TARGET_IDEAL ? "✅" : "❌"}`,
    "",
    "## Cobertura por categoria",
    "",
    "| Categoria | Total | Enabled | Certified | Cobertura enabled % |",
    "|-----------|------:|--------:|----------:|--------------------:|",
  ];

  let totalAll = 0;
  let masteryAll = 0;
  let certifiedAll = 0;
  for (const cat of CATEGORY_ORDER) {
    const row = rowsByCategory.get(cat);
    const pct = row.total > 0 ? Math.round((row.mastery / row.total) * 1000) / 10 : 0;
    lines.push(
      `| ${CATEGORY_LABELS[cat] ?? cat} (\`${cat}\`) | ${row.total} | ${row.mastery} | ${row.certified} | ${pct}% |`
    );
    totalAll += row.total;
    masteryAll += row.mastery;
    certifiedAll += row.certified;
  }
  const pctAll = totalAll > 0 ? Math.round((masteryAll / totalAll) * 1000) / 10 : 0;
  lines.push(
    `| **Subtotal (categorias aplicáveis)** | **${totalAll}** | **${masteryAll}** | **${certifiedAll}** | **${pctAll}%** |`
  );
  lines.push("");

  lines.push("## Detalhe por lição", "");
  lines.push(
    "| Categoria | Lição | Status | Enabled | Certified | Review Mastery |",
    "|-----------|-------|--------|:-------:|:---------:|:--------------:|"
  );
  for (const cat of CATEGORY_ORDER) {
    for (const meta of coverage.MASTERY_LESSON_COVERAGE.filter((m) => m.category === cat)) {
      const enabled = masteryLoopIds.has(meta.lessonId) ? "✅" : "—";
      const certified = certifiedIds.has(meta.lessonId) ? "✅" : "—";
      const rev = reviewMasteryLessons.some((l) => l.id === meta.lessonId) ? "✅" : "—";
      lines.push(`| ${cat} | \`${meta.lessonId}\` | ${meta.status} | ${enabled} | ${certified} | ${rev} |`);
    }
  }
  lines.push("");

  const reportPath = path.join(rootDir, "docs/reports/mastery-coverage.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(
    `Wrote ${path.relative(rootDir, reportPath)} — enabled ${masteryAll}; certified ${certifiedIds.size}; review ${reviewMasteryLessons.length}`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
