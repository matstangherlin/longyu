#!/usr/bin/env node
/**
 * TEST-005 — Hanzi builder integrity (Pedagogia V3.5).
 * requiredPieces ⊆ renderedPieceBank; sentence fill ≠ component montage.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-hbi-"));

try {
  const program = ts.createProgram(["src/data/hanziBuilder.ts"], {
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
  if (emit.emitSkipped) throw new Error("TypeScript não compilou hanziBuilder");

  const {
    HANZI_BUILDERS,
    validateAllHanziBuildersIntegrity,
    requiredPieceIds,
    renderedPieceBankIds,
    getHanziBuilder,
  } = require(path.join(outDir, "src/data/hanziBuilder.js"));

  const errors = validateAllHanziBuildersIntegrity();

  for (const builder of HANZI_BUILDERS) {
    const required = requiredPieceIds(builder);
    const bank = renderedPieceBankIds(builder, true);
    for (const id of required) {
      if (!bank.includes(id)) errors.push(`${builder.id}: required ${id} missing from bank`);
    }
  }

  const haoSentence = getHanziBuilder("hb-hao-sentence");
  if (!haoSentence) errors.push("hb-hao-sentence missing");
  else {
    const glyphs = (haoSentence.components ?? []).map((p) => p.glyph);
    if (!glyphs.includes("好")) errors.push("hb-hao-sentence must offer whole 好");
    if (glyphs.includes("女") || glyphs.includes("子")) {
      errors.push("hb-hao-sentence must not ask for 女/子 components in sentence fill");
    }
    const distractors = (haoSentence.componentDistractors ?? []).map((p) => p.glyph);
    if (distractors.includes("木") && distractors.includes("日") && !glyphs.includes("好")) {
      errors.push("hb-hao-sentence bank looks like wrong composition pool");
    }
  }

  const haoComponents = getHanziBuilder("hb-hao-components");
  if (haoComponents) {
    const glyphs = (haoComponents.components ?? []).map((p) => p.glyph).sort().join("");
    if (glyphs !== "女子") errors.push(`hb-hao-components expected 女+子, got ${glyphs}`);
    for (const id of requiredPieceIds(haoComponents)) {
      if (!renderedPieceBankIds(haoComponents, true).includes(id)) {
        errors.push(`hb-hao-components missing required ${id}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Hanzi builder integrity FAILED:");
    for (const error of errors) console.error(" -", error);
    process.exitCode = 1;
  } else {
    console.log(`Hanzi builder integrity OK (${HANZI_BUILDERS.length} builders).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
