#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-tone-test-"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

try {
  const program = ts.createProgram(
    ["src/data/foundationTopicPlans.ts", "src/data/toneKnowledge.ts", "src/data/pedagogicalSpine.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false, jsx: ts.JsxEmit.ReactJSX }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const tones = require(path.join(outDir, "src/data/toneKnowledge.js"));
  const get = (pass) => plans.foundationAuthoredPlanFor("p1-o-que-e-tom", pass) ?? [];
  const pass1 = get(1);
  const pass2 = get(2);
  const pass3 = get(3);
  const pass4 = get(4);
  check(tones.TONE_KNOWLEDGE.length === 5, "tone model must include 1–4 and neutral");
  check(pass1.filter((step) => step.kind === "tone" && step.assist === "guided").map((step) => step.tone).join(",") === "1,3", "M1 must teach 1st then 3rd tone");
  check(pass2.filter((step) => step.kind === "tone" && step.assist === "guided").map((step) => step.tone).join(",") === "2,4", "M2 must teach 2nd then 4th tone");
  check(pass3.filter((step) => step.kind === "tone" && step.assist === "quiz").map((step) => step.tone).join(",") === "1,2,3,4", "M3 must assess all four after teaching");
  check(pass3.some((step) => step.kind === "intro" && String(step.body).includes("ˉ") && String(step.body).includes("ˇ")), "tone marks need an explicit notice before mark grading");
  check(pass4.some((step) => step.kind === "reverse_recall"), "M4 must reach production in a real word");
  check(tones.TONE_NEUTRAL_POLICY.includes("only after"), "neutral-tone timing policy missing");
  if (failures.length) {
    console.error("FAIL test:tone-learning-ladder");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("PASS test:tone-learning-ladder — M1 1/3 · M2 2/4 · M3 recognition/marks · M4 real-word production · neutral policy explicit.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
