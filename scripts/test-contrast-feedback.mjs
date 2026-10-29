#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-contrast-"));
const program = ts.createProgram(["src/features/lesson/contrastFeedback.ts"], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: root,
  outDir,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
});
if (program.emit().emitSkipped) process.exit(1);
const feedback = require(path.join(outDir, "src/features/lesson/contrastFeedback.js"));

assert.equal(
  feedback.contrastFeedbackPt({ pinyin: "mā" }, { pinyin: "mà" }, "tone"),
  "Eram diferentes: mā (1º tom) × mà (4º tom)."
);
assert.equal(
  feedback.contrastFeedbackPt({ pinyin: "mā" }, { pinyin: "mā" }),
  "Eram iguais: os dois eram mā (1º tom)."
);
assert.equal(
  feedback.contrastFeedbackPt({ pinyin: "b" }, { pinyin: "p" }, "initial"),
  "b × p: p sai com sopro."
);
assert.equal(feedback.toneOfPinyin("mǎ"), 3);
assert.equal(feedback.toneOfPinyin("ma"), 5);

console.log("test:contrast-feedback PASS");
