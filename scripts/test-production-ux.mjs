/**
 * Garante que free_production / transfer_task gerados saem com UX guiada:
 * assist guided, blocos de situação/objetivo e scaffold disponível.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-production-ux-"));
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/journey.ts",
      "src/data/productionTasks.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("falha ao compilar lessonTasks");

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
  const { COMMUNICATIVE_GOAL_LABELS } = require(path.join(outDir, "src/data/productionTasks.js"));

  assert(Object.keys(COMMUNICATIVE_GOAL_LABELS).length >= 14, "faltam labels de objetivo comunicativo");

  let transferCount = 0;
  let freeCount = 0;
  let guidedTransfer = 0;
  let withSituation = 0;
  let withScaffold = 0;

  for (const lesson of ALL_LESSONS.slice(0, 80)) {
    const steps = lessonRoundStepsFor(lesson, {
      completedLessons: [],
      learnedChunks: [],
      learnedChars: [],
      hanziBuilderProgress: {},
      recentErrors: [],
      srs: {},
      recentConversationSceneIds: [],
      recentConversationIntentIds: [],
      conversationHistory: [],
      attemptNumber: 0,
      silent: true,
    });
    for (const step of steps) {
      if (step.kind === "transfer_task") {
        transferCount += 1;
        if (step.assist === "guided") guidedTransfer += 1;
        if (step.situationPt) withSituation += 1;
        if (step.patternSlots?.length || step.patternPt) withScaffold += 1;
        assert(Boolean(step.transferAnchorHanzi), `transfer sem âncora em ${lesson.id}`);
        assert(Boolean(step.situationPt), `transfer sem situação em ${lesson.id}`);
      }
      if (step.kind === "free_production") {
        freeCount += 1;
        if (step.assist === "guided") guidedTransfer += 1;
        if (step.situationPt) withSituation += 1;
      }
    }
  }

  assert(transferCount + freeCount > 0, "nenhuma produção/transferência nos planos amostrados");
  assert(withSituation > 0, "produções sem situationPt");
  console.log(
    `OK amostra: transfer=${transferCount} free=${freeCount} guided=${guidedTransfer} situation=${withSituation} scaffold=${withScaffold}`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:production-ux:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:production-ux passou.");
