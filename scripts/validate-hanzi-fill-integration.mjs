#!/usr/bin/env node
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateHanziFillIntegration } from "./lib/v498b1-gates.mjs";
import fs from "node:fs";
import path from "node:path";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const data = loadIntegratedLearningRuntime();
const result = validateHanziFillIntegration(data);
const rootDir = process.cwd();
const lines = [
  "# Hanzi fill integration",
  "",
  ...reportProvenanceLines(rootDir, { lessonCount: data.lessons.length }),
  "| Lesson | CORE | fill_blank | sentence_build | hanzi_build | delayed | Class |",
  "|--------|------|------------|----------------|-------------|---------|-------|",
  ...result.lessonRows
    .filter((row) => row.klass !== "NOT_ELIGIBLE" || row.fill || row.sentence_build)
    .slice(0, 80)
    .map(
      (row) =>
        `| ${row.lessonId} | ${row.core || "—"} | ${row.fill} | ${row.sentence_build} | ${row.hanzi_build} | ${row.delayed} | ${row.klass} |`
    ),
  "",
];
fs.mkdirSync(path.join(rootDir, "docs/reports"), { recursive: true });
fs.writeFileSync(path.join(rootDir, "docs/reports/hanzi-fill-integration.md"), finalizeReport(lines));
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:hanzi-fill-integration");
}
