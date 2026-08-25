#!/usr/bin/env node
/**
 * V4.6 — Gate: transferência não vaza o alvo completo no plano/scaffold inicial.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);

function normalizeTransferHanzi(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\s\u3000]/g, "")
    .replace(/[，,]/g, "，")
    .replace(/[？?]/g, "？")
    .trim();
}

function patternRevealsFullTarget(patternPt, targetHanzi) {
  if (!patternPt || !targetHanzi) return false;
  if (patternPt.includes("___") || patternPt.includes("…") || patternPt.includes("...")) return false;
  return normalizeTransferHanzi(patternPt) === normalizeTransferHanzi(targetHanzi);
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-validate-transfer-target-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/productionTasks.ts",
      "src/data/productionHelp.ts",
      "src/data/transferTargetIntegrity.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/vocabulary.ts",
      "src/data/characters.ts",
      "src/data/generated/structureExposureIndex.ts",
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
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:transfer-target-integrity.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");

  const transfers = [];
  for (let index = 0; index < ALL_LESSONS.length; index += 1) {
    const lesson = ALL_LESSONS[index];
    const prior = ALL_LESSONS.slice(0, index).map((entry) => entry.id);
    const plan = lessonRoundStepsFor(lesson, { completedLessons: prior });
    for (const step of plan) {
      if (step.kind !== "transfer_task") continue;
      transfers.push({
        lessonId: lesson.id,
        target: String(step.correctAnswer ?? step.answer ?? ""),
        patternPt: String(step.patternPt ?? ""),
        situationPt: String(step.situationPt ?? ""),
        helpInitial: step.productionHelpInitial ?? null,
        component: String(step.transferComponentHanzi ?? ""),
        challenge: String(step.transferChallengePt ?? ""),
        safePattern: String(step.transferSafePatternPt ?? ""),
        early: Boolean(step.transferEarlySupported),
      });
    }
  }

  let helpInitialNonZero = 0;
  let situationLeak = 0;
  let leakingPatternWithoutSafe = 0;

  for (const row of transfers) {
    if (row.helpInitial !== 0 && row.helpInitial !== null) {
      helpInitialNonZero += 1;
      fail(`${row.lessonId}: productionHelpInitial=${row.helpInitial} (esperado 0)`);
    }
    const targetNorm = normalizeTransferHanzi(row.target);
    if (targetNorm && normalizeTransferHanzi(row.situationPt).includes(targetNorm)) {
      situationLeak += 1;
      fail(`${row.lessonId}: situationPt contém o alvo ${row.target}`);
    }
    if (patternRevealsFullTarget(row.patternPt, row.target)) {
      if (!row.safePattern && !row.component) {
        leakingPatternWithoutSafe += 1;
        fail(`${row.lessonId}: patternPt == alvo sem safePattern/componente`);
      }
    }
    if (row.early || normalizeTransferHanzi(row.target) === normalizeTransferHanzi("请问，你叫什么？")) {
      if (!row.component) fail(`${row.lessonId}: early transfer sem transferComponentHanzi`);
      if (!row.challenge) fail(`${row.lessonId}: early transfer sem transferChallengePt`);
      if (!row.safePattern) fail(`${row.lessonId}: early transfer sem transferSafePatternPt`);
    }
  }

  await mkdir(path.join(rootDir, "reports"), { recursive: true });
  await writeFile(
    path.join(rootDir, "reports/transfer-target-integrity.md"),
    `# Transfer target integrity (V4.6)

| Métrica | Valor |
|---------|-------|
| transfer_task (attempt 0) | ${transfers.length} |
| helpInitial ≠ 0 | ${helpInitialNonZero} |
| situation leak | ${situationLeak} |
| pattern==alvo sem safe | ${leakingPatternWithoutSafe} |
| status | ${failures.length === 0 ? "OK" : "FAIL"} |

${
  failures.length
    ? "## Erros\n\n" + failures.slice(0, 40).map((e) => `- ${e}`).join("\n")
    : "Nenhum vazamento detectado no plano real (attempt 0)."
}
`,
    "utf8"
  );

  if (failures.length) {
    console.error("FAIL validate:transfer-target-integrity");
    for (const e of failures.slice(0, 20)) console.error(" -", e);
    process.exit(1);
  }

  console.log(
    `OK validate:transfer-target-integrity — ${transfers.length} transfers · helpInitial≠0=0 · leaks=0`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
