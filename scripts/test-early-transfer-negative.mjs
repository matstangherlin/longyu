/**
 * test:early-transfer-negative — casos que DEVEM falhar na elegibilidade V4.5.
 *
 * Garante que early/supported não viram atalho sem prerequisites.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-early-neg-"));
try {
  const program = ts.createProgram(
    [
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/vocabulary.ts",
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
      strict: false,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar test:early-transfer-negative.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const {
    FRAME_TASKS,
    isTransferTaskEligible,
    structureReadyForTransfer,
    emptyStructureRungs,
    ensureStructureRungs,
    maxAssistForTransferTask,
  } = load("src/data/productionTasks.js");

  const qingwen = FRAME_TASKS.find((task) => task.frameId === "frame_qingwennijiaoshenme");
  assert(Boolean(qingwen), "tarefa frame_qingwennijiaoshenme ausente");

  const glyphs = new Set(qingwen.requiredGlyphs);

  // 1) supported sem prerequisite pronto
  const emptyExposure = new Map();
  assert(
    !structureReadyForTransfer(qingwen, emptyExposure),
    "supported sem frame-base pronto deveria falhar structureReadyForTransfer"
  );
  assert(
    !isTransferTaskEligible(qingwen, glyphs, "guided", emptyExposure, {
      isFirstCombinationalTransfer: true,
      attemptNumber: 0,
      lessonId: "l2-rev",
    }),
    "early supported sem prerequisite não pode ser elegível"
  );

  // 2) earlyTransferOnAttemptZero sem prerequisite (mesmo com assist max supported)
  assert(
    !isTransferTaskEligible(qingwen, glyphs, "supported", emptyExposure, {
      isFirstCombinationalTransfer: true,
      attemptNumber: 0,
      lessonId: "l2-rev",
    }),
    "earlyTransferOnAttemptZero não ignora escada do frame-base"
  );

  // 3) glifo desconhecido
  const missingGlyph = new Set([...glyphs].slice(0, -1));
  const ready = new Map();
  for (const id of qingwen.transferRequiresFrameIds) {
    const rungs = ensureStructureRungs(ready, id);
    rungs.exposed = true;
    rungs.completion = true;
    rungs.guidedProduction = true;
  }
  assert(
    !isTransferTaskEligible(qingwen, missingGlyph, "supported", ready, {
      isFirstCombinationalTransfer: true,
      attemptNumber: 0,
      lessonId: "l2-rev",
    }),
    "supported com glifo desconhecido não pode ser elegível"
  );

  // 4) lab / possession mismatch hard block (frame_woyouge em lição de tom)
  const possession = FRAME_TASKS.find((task) => task.frameId === "frame_woyouge");
  if (possession) {
    const possessionGlyphs = new Set(possession.requiredGlyphs);
    const possessionReady = new Map();
    const rungs = ensureStructureRungs(possessionReady, "frame_woyouge");
    rungs.exposed = true;
    rungs.completion = true;
    rungs.guidedProduction = true;
    assert(
      !isTransferTaskEligible(possession, possessionGlyphs, "guided", possessionReady, {
        lessonId: "p2-ma-primeiro-tom",
        attemptNumber: 0,
      }),
      "frame_woyouge em lab de tom deve ser bloqueado"
    );
  }

  // 5) alvo já visto (priorTransferTargets)
  const priorTargets = new Set([qingwen.targetHanzi.replace(/[。，？！\s]/g, "")]);
  // Elegibilidade de tarefa individual não vê prior targets — o filtro está em transferTasksFor.
  // Aqui só garantimos que maxAssist early não libera question.
  assert(
    maxAssistForTransferTask(qingwen, 0, true) === "supported",
    "early zero deve liberar no máximo supported do frame"
  );
  assert(
    maxAssistForTransferTask(qingwen, 0, false) === "guided",
    "sem first combinational, attempt 0 só guided"
  );
  void priorTargets;
  void emptyStructureRungs;

  if (failures.length) {
    console.error(`\ntest:early-transfer-negative falhou (${failures.length}):`);
    for (const message of failures) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log("OK test:early-transfer-negative — supported/early/lab/glifo bloqueados como esperado");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
