/**
 * V4.0 — piso cognitivo: conversa extra não expulsa produção/transferência.
 *
 * Reproduz o caso l23: dois conversation_scene + follow-ups enchem o orçamento
 * e transfer_task some. keepMasteryPassSteps tem que preservar o piso.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-cognitive-budget-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    ["src/data/cognitiveBudget.ts", "src/data/masteryLoop.ts", "src/data/journey.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou cognitiveBudget");

  const budget = require(path.join(outDir, "src/data/cognitiveBudget.js"));

  function item(kind, index, score, extra = {}) {
    return { step: { kind, ...extra }, score, index };
  }

  const crowded = [
    item("intro", 0, 2),
    item("conversation_scene", 1, 3, { sceneId: "a" }),
    item("comprehend", 2, 2, { postConversationPhase: true }),
    item("sentence_build", 3, 3, { postConversationPhase: true }),
    item("conversation_scene", 4, 3, { sceneId: "b" }),
    item("listen_select", 5, 2, { postConversationPhase: true }),
    item("fill_blank", 6, 2, { postConversationPhase: true }),
    item("image_choice", 7, 2),
    item("hanzi_build", 8, 2),
    item("odd_one_out", 9, 2),
    item("dictation", 10, 2),
    item("transfer_task", 11, 1, { productionFrameId: "frame_woyao", correctAnswer: "我要热水" }),
    item("free_production", 12, 3, { productionFrameId: "frame_woyao" }),
  ];
  const base = crowded.map((entry) => entry.step);

  const m3 = budget.keepMasteryPassSteps(crowded, { pass: 3, min: 7, max: 10 });
  if (!budget.planHasFloorKind(m3, "production")) fail("M3 deve preservar produção mesmo com 2 conversas");
  if (budget.conversationEvictedPassFloor(base, m3, 3)) fail("2 conversas não podem expulsar o piso de M3");

  const m4 = budget.keepMasteryPassSteps(crowded, { pass: 4, min: 7, max: 10 });
  if (!budget.planHasFloorKind(m4, "transfer")) fail("M4 deve preservar transfer_task mesmo com 2 conversas");
  if (!m4.some((step) => step.kind === "transfer_task")) fail("M4 recorte ainda tem transfer_task");
  if (budget.conversationEvictedPassFloor(base, m4, 4)) fail("2 conversas não podem expulsar transferência em M4");

  const noTransfer = [
    item("conversation_scene", 0, 4, { sceneId: "a" }),
    item("conversation_scene", 1, 4, { sceneId: "b" }),
    item("comprehend", 2, 2),
    item("listen", 3, 2),
  ];
  const m4na = budget.keepMasteryPassSteps(noTransfer, { pass: 4, min: 3, max: 4 });
  if (budget.conversationEvictedPassFloor(noTransfer.map((entry) => entry.step), m4na, 4)) {
    fail("sem transfer no plano-base, M4 não exige transfer");
  }

  if (!budget.isProductiveChallengeStep({ kind: "free_production" })) fail("free_production é desafio produtivo");
  if (budget.isProductiveChallengeStep({ kind: "conversation_scene" })) fail("conversa não é o piso de produção");
  if (!budget.isTransferChallengeStep({ kind: "transfer_task" })) fail("transfer_task é o piso de M4");
  const floorM3 = budget.requiredCognitiveFloor(3);
  const floorM4 = budget.requiredCognitiveFloor(4);
  if (!(floorM3.includes("production") && !floorM3.includes("transfer"))) fail("M3 = produção");
  if (!floorM4.includes("transfer")) fail("M4 = transferência");

  const withFlash = [
    item("flashcard", 0, 4),
    item("comprehend", 1, 2),
    item("listen_select", 2, 2),
    item("odd_one_out", 3, 2),
    item("conversation_scene", 4, 3, { sceneId: "a" }),
    item("free_production", 5, 3),
    item("transfer_task", 6, 2, { productionFrameId: "frame_woyao" }),
    item("dictation", 7, 2),
  ];
  const m2 = budget.keepMasteryPassSteps(withFlash, { pass: 2, min: 6, max: 9 });
  if (m2.some((step) => step.kind === "flashcard")) fail("M2 não deve preencher orçamento com flashcard");
  const m4noFlash = budget.keepMasteryPassSteps(withFlash, { pass: 4, min: 6, max: 9 });
  if (m4noFlash.some((step) => step.kind === "flashcard")) fail("M4 não deve preencher orçamento com flashcard");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("ERRO: test:cognitive-budget falhou.");
  for (const error of failures) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("OK: test:cognitive-budget passou.");
