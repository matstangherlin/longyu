#!/usr/bin/env node
/**
 * V4.6.1 — snapshot estrutural das 4 passes de "O que é pinyin?"
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-pinyin-fid-"));
const failures = [];

try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/topicFidelity.ts", "src/features/lesson/lessonTasks.ts"],
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
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar test:pinyin-topic-fidelity.");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { getLesson } = load("src/data/journey.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const fidelity = load("src/data/topicFidelity.js");
  const lesson = getLesson("p1-o-que-e-pinyin");
  assert.ok(lesson, "lição pinyin existe");

  function blob(plan) {
    return plan
      .map((step) =>
        [step.title, step.body, step.prompt, step.dialoguePrompt, step.correctAnswer, step.audioText, (step.options ?? []).join(" ")]
          .filter(Boolean)
          .join(" ")
      )
      .join("\n")
      .toLowerCase();
  }

  function planFor(pass) {
    return lessonRoundStepsFor(lesson, {
      masteryLevel: pass - 1,
      masteryPass: pass,
      silent: true,
      attemptNumber: 0,
    });
  }

  const m1 = planFor(1);
  const b1 = blob(m1);
  assert.match(b1, /pinyin/, "M1 menciona pinyin");
  assert.match(b1, /romaniz|pronúncia|letras latinas/, "M1 ensina romanização/pronúncia");
  assert.match(b1, /你好/, "M1 usa 你好 como exemplo");
  assert.match(b1, /nǐ hǎo/, "M1 mostra nǐ hǎo");
  assert.match(b1, /tradução|hànzì/, "M1 distingue tradução/hànzì");

  const m2 = planFor(2);
  const b2 = blob(m2);
  assert.match(b2, /sílaba/, "M2 ensina sílaba");
  assert.match(b2, /nǐ/, "M2 tem nǐ");
  assert.match(b2, /hǎo/, "M2 tem hǎo");
  assert.ok(
    m2.some((step) => step.kind === "listen_select"),
    "M2 tem áudio ↔ pinyin"
  );

  const m3 = planFor(3);
  const b3 = blob(m3);
  assert.match(b3, /marca|tom|ˇ/, "M3 ensina marcas de tom no pinyin");
  assert.match(b3, /pronúncia|nǐ hǎo|你好/, "M3 liga marca à pronúncia");

  const m4 = planFor(4);
  const b4 = blob(m4);
  assert.match(b4, /sem o pinyin|sem ver o pinyin|ferramenta/, "M4 reduz scaffold / usa pinyin como ferramenta");
  assert.ok(
    m4.some((step) => step.kind === "reverse_recall" || step.kind === "contextual_choice"),
    "M4 tem uso final"
  );

  for (const [pass, plan] of [
    [1, m1],
    [2, m2],
    [3, m3],
    [4, m4],
  ]) {
    const percents = fidelity.fidelityPercents("p1-o-que-e-pinyin", pass, plan);
    if (percents.generic > 0.1) {
      failures.push(`M${pass}: GENERIC ${(percents.generic * 100).toFixed(0)}% > 10%`);
    }
    if (percents.direct < 0.7) {
      failures.push(`M${pass}: DIRECT ${(percents.direct * 100).toFixed(0)}% < 70%`);
    }
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:pinyin-topic-fidelity");
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("OK test:pinyin-topic-fidelity — M1–M4 ensinam pinyin de verdade");
