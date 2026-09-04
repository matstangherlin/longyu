#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-fairness-"));
const reportPath = path.join(rootDir, "docs/reports/v491-option-position-audit.md");

try {
  const program = ts.createProgram(
    ["src/lib/stableOptionPermutation.ts", "src/lib/placement/questions.ts", "src/lib/placement/optionIdentity.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const { stableCorrectOptionIndex } = require(path.join(outDir, "src/lib/stableOptionPermutation.js"));
  const { VALID_PLACEMENT_QUESTIONS } = require(path.join(outDir, "src/lib/placement/questions.js"));
  const fourOptionQuestions = VALID_PLACEMENT_QUESTIONS.filter((question) => question.options.length === 4 && question.options.includes(question.answer));
  const before = [0, 0, 0, 0];
  const after = [0, 0, 0, 0];
  for (const question of fourOptionQuestions) before[question.options.indexOf(question.answer)] += 1;
  for (let session = 0; session < 100; session += 1) {
    for (const question of fourOptionQuestions) {
      const index = stableCorrectOptionIndex(question.options, question.answer, `audit-session-${session}`, question.id);
      if (index >= 0) after[index] += 1;
    }
  }
  const totalAfter = after.reduce((sum, count) => sum + count, 0);
  const shares = after.map((count) => totalAfter ? count / totalAfter : 0);
  const balanced = shares.every((share) => share >= 0.18 && share <= 0.32);
  const lines = [
    "# V4.9.1 — Option position audit",
    "",
    "Computed over canonical Placement option IDs. Display permutation does not change evidence, scoring, locale labels or server wire values.",
    "",
    `- totalQuestions: ${fourOptionQuestions.length}`,
    `- simulatedSessions: 100`,
    `- canonicalCorrectPositionBefore: [${before.join(", ")}]`,
    `- displayedCorrectPositionAfter: [${after.join(", ")}]`,
    `- displayedShares: [${shares.map((share) => `${(share * 100).toFixed(2)}%`).join(", ")}]`,
    `- placementPositionFairness: ${balanced ? "PASS" : "FAIL"}`,
    "",
    "## Scope",
    "",
    "Conventional choice tasks use a session-stable display permutation. Sentence ordering, timelines, tone legends, pair matching and other order-semantic tasks are intentionally excluded.",
    "",
    "Hotkeys 1–4 follow display order; submitted values remain canonical option IDs.",
    "",
  ];
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  if (!balanced) {
    console.error(`FAIL validate:answer-position-fairness — ${JSON.stringify(after)}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:answer-position-fairness — before [${before}] · 100-session display [${after}].`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
