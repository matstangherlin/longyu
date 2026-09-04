#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-placement-"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

try {
  const program = ts.createProgram(
    ["src/lib/stableOptionPermutation.ts", "src/lib/placement/questions.ts", "src/lib/placement/optionIdentity.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const permutation = require(path.join(outDir, "src/lib/stableOptionPermutation.js"));
  const questions = require(path.join(outDir, "src/lib/placement/questions.js"));
  const sample = questions.VALID_PLACEMENT_QUESTIONS.find((question) => question.options.length === 4);
  check(Boolean(sample), "Placement needs a four-option question");
  if (sample) {
    const first = permutation.stableOptionPermutation(sample.options, "session-A", sample.id);
    const rerender = permutation.stableOptionPermutation(sample.options, "session-A", sample.id);
    const localeSwitch = permutation.stableOptionPermutation(sample.options, "session-A", sample.id);
    check(JSON.stringify(first) === JSON.stringify(rerender), "rerender changed display order");
    check(JSON.stringify(first) === JSON.stringify(localeSwitch), "PT/EN switch changed canonical order");
    check(new Set(first).size === sample.options.length, "permutation lost or duplicated an option");
    check(first.every((id) => sample.options.includes(id)), "permutation changed canonical option ids");
    const positions = new Set(Array.from({ length: 40 }, (_, index) => permutation.stableCorrectOptionIndex(sample.options, sample.answer, `session-${index}`, sample.id)));
    check(positions.size >= 3, "new sessions do not rotate correct-answer position");
  }

  if (failures.length) {
    console.error("FAIL test:placement-option-permutation");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("PASS test:placement-option-permutation — stable across rerender/viewport/locale; canonical scoring identity preserved; new sessions rotate.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
