#!/usr/bin/env node
/**
 * RC2.3.4 — generate audit / coverage / provenance / early progression reports.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-hwa-"));

const files = [
  "src/data/types.ts",
  "src/data/characters.ts",
  "src/data/hanziBuilder.ts",
  "src/lib/visualFirst/hanziVisualPrep.ts",
  "src/lib/hanziWriting/gates.ts",
  "src/lib/hanziWriting/stages.ts",
  "src/lib/hanziWriting/types.ts",
  "src/lib/hanziWriting/references/verifiedWave1.ts",
  "src/lib/hanziWriting/handwritingReference.ts",
  "src/lib/hanziWriting/audit.ts",
];

try {
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("emit failed for hanzi writing audit");

  const { auditHanziSystem, handwritingCoverage, earlyHanziProgressionRows } = require(
    path.join(outDir, "src/lib/hanziWriting/audit.js")
  );
  const { VERIFIED_HANDWRITING_WAVE1 } = require(
    path.join(outDir, "src/lib/hanziWriting/references/verifiedWave1.js")
  );

  const rows = auditHanziSystem();
  const coverage = handwritingCoverage();
  const early = earlyHanziProgressionRows();

  await mkdir(path.join(root, "docs/reports"), { recursive: true });
  await mkdir(path.join(root, "docs/release"), { recursive: true });

  await writeFile(
    path.join(root, "docs/reports/rc2-3-4-hanzi-system-audit.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), rows, coverage }, null, 2)
  );

  const md = [
    "# RC2.3.4 — Hànzì system audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Coverage",
    "",
    `- charactersTotal: ${coverage.charactersTotal}`,
    `- builderSupported: ${coverage.builderSupported}`,
    `- handwritingReferenceVerified: ${coverage.handwritingReferenceVerified}`,
    `- traceSupported: ${coverage.traceSupported}`,
    `- memoryWriteSupported: ${coverage.memoryWriteSupported}`,
    `- dataRequired (builder without HW ref): ${coverage.dataRequired}`,
    `- curriculumLeaks: ${coverage.curriculumLeaks}`,
    "",
    "## Builder geometry policy",
    "",
    `\`${coverage.builderGeometryPolicy}\` — builder SVG paths are didactic approximations and MUST NOT grade handwriting.`,
    "",
    "## Verified handwriting set",
    "",
    coverage.verifiedCharacters.join(" "),
    "",
    "## Sample rows",
    "",
    "| char | builder | HW status | visualPrep | journey |",
    "|---|---|---|---|---|",
    ...rows
      .filter((r) => r.builderAvailable || r.handwritingReferenceAvailable)
      .slice(0, 40)
      .map(
        (r) =>
          `| ${r.hanzi} | ${r.builderAvailable} | ${r.handwritingStatus} | ${r.visualPrep} | ${r.journeyIntroduction ?? "—"} |`
      ),
    "",
  ].join("\n");
  await writeFile(path.join(root, "docs/reports/rc2-3-4-hanzi-system-audit.md"), md);

  await writeFile(
    path.join(root, "docs/reports/rc2-3-4-handwriting-coverage.json"),
    JSON.stringify(coverage, null, 2)
  );

  const earlyMd = [
    "# RC2.3.4 — Early Hànzì progression",
    "",
    "Goal: identify jumps between recognize → assemble → complete → trace → memory.",
    "",
    "| hanzi | intro | recognize | builder | complete | trace | memory | jump risk |",
    "|---|---|---|---|---|---|---|---|",
    ...early.map(
      (e) =>
        `| ${e.hanzi} | ${e.introduction ?? "—"} | ${e.recognize} | ${e.builder} | ${e.complete} | ${e.trace} | ${e.memory} | ${e.jumpRisk ?? "—"} |`
    ),
    "",
  ].join("\n");
  await writeFile(path.join(root, "docs/reports/rc2-3-4-early-hanzi-progression.md"), earlyMd);

  const provenance = [
    "# RC2.3.4 — Handwriting data provenance",
    "",
    "## Sources",
    "",
    "### 1. longyu-authorial-stroke-order-v1 (VERIFIED wave 1)",
    "",
    `- Origin: Longyu authorial didactic stroke geometry (normalized 0–100 polylines)`,
    `- License: All-rights-reserved — Longyu didactic authorial data`,
    `- Version: 1.0.0`,
    `- Characters: ${VERIFIED_HANDWRITING_WAVE1.map((r) => r.character).join(" ")}`,
    `- Validation: mapped to common Mainland modern stroke-order teaching conventions`,
    `- NOT derived from: font glyph outlines, HanziBuilder SVG paths, OCR, remote APIs`,
    "",
    "### 2. HanziBuilder SVG stroke banks (BUILDER_GEOMETRY)",
    "",
    `- Origin: \`src/data/hanziBuilder.ts\``,
    `- Role: didactic puzzle assembly only`,
    `- Explicit comment in source: aproximacões didáticas, não caligrafia rigorosa`,
    `- Grading: FORBIDDEN (\`BUILDER_GEOMETRY_NOT_GRADING_SOURCE\`)`,
    "",
    "### 3. Unavailable characters",
    "",
    "Any character without a VERIFIED \`HanziHandwritingReference\` is marked \`HANDWRITING_DATA_REQUIRED\` / \`UNAVAILABLE\`.",
    "Do not invent stroke order from fonts.",
    "",
  ].join("\n");
  await writeFile(path.join(root, "docs/reports/rc2-3-4-handwriting-data.md"), provenance);

  console.log("PASS generate-rc2-3-4-hanzi-audit");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
