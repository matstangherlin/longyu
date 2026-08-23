/**
 * V4.0 — Communicative Transfer Integrity
 *
 * Três portões (um compile):
 *   --gate=cognitive          validate:cognitive-budget
 *   --gate=frames             validate:structural-frame-runtime
 *   --gate=conversation       validate:conversation-transfer-budget
 *   (sem flag)                os três
 *
 * Hard fail se conversation injection remover o objetivo obrigatório do pass.
 * Não se resolve mudando fixtures E2E.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/transfer-integrity-report.md");
const gateArg = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length);
const runCognitive = !gateArg || gateArg === "cognitive";
const runFrames = !gateArg || gateArg === "frames";
const runConversation = !gateArg || gateArg === "conversation";

const failures = [];
const fail = (message) => failures.push(message);

const MIN_RUNTIME_FRAMES = 15;
const MIN_RUNTIME_OPEN_GOALS = 10;
const MIN_CONVERSATION_SHARE = 0.55;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-transfer-integrity-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/cognitiveBudget.ts",
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:transfer-integrity.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, getLesson } = load("src/data/journey.js");
  const {
    buildLessonPracticePlan,
    applyMasteryPassToPlan,
    structureExposureSnapshotForLesson,
  } = load("src/features/lesson/lessonTasks.js");
  const {
    SENTENCE_FRAMES,
    OPEN_PRODUCTION_GOALS,
    canGuidedProduceStructure,
    canOpenProduceGoal,
  } = load("src/data/productionTasks.js");
  const {
    conversationEvictedPassFloor,
    planHasFloorKind,
    applicableFloorKinds,
  } = load("src/data/cognitiveBudget.js");

  const silent = { silent: true };
  const runtimeFrames = new Set();
  const runtimeOpenGoals = new Set();
  const eviction = [];
  const m3ProductionMiss = [];
  const m4TransferMiss = [];
  let l23M3HasTransfer = false;
  let l23M4HasTransfer = false;
  let l23M3HasProduction = false;
  let l23Conversations = 0;

  function creditPlan(plan) {
    for (const step of plan) {
      if (step.productionFrameId) runtimeFrames.add(step.productionFrameId);
      if (step.kind === "free_production" && step.productionOpen && step.productionGoal) {
        runtimeOpenGoals.add(step.productionGoal);
      }
    }
  }

  for (const lesson of ALL_LESSONS) {
    const base = buildLessonPracticePlan(lesson, silent);
    creditPlan(base);
    if (!lesson.masteryLoop) continue;

    for (const pass of [3, 4]) {
      const trimmed = applyMasteryPassToPlan(base, lesson, pass, { ...silent, masteryPass: pass });
      creditPlan(trimmed);
      if (conversationEvictedPassFloor(base, trimmed, pass)) {
        eviction.push(`${lesson.id}@M${pass}`);
      }
      if (pass === 3 && applicableFloorKinds(3, base).includes("production") && !planHasFloorKind(trimmed, "production")) {
        m3ProductionMiss.push(lesson.id);
      }
      if (pass === 4 && applicableFloorKinds(4, base).includes("transfer") && !planHasFloorKind(trimmed, "transfer")) {
        m4TransferMiss.push(lesson.id);
      }
      if (lesson.id === "l23") {
        l23Conversations = base.filter((step) => step.kind === "conversation_scene").length;
        if (pass === 3) {
          l23M3HasTransfer = trimmed.some((step) => step.kind === "transfer_task");
          l23M3HasProduction = planHasFloorKind(trimmed, "production");
        }
        if (pass === 4) l23M4HasTransfer = trimmed.some((step) => step.kind === "transfer_task");
      }
    }
  }

  const applicableFrameIds = new Set();
  const applicableOpenGoals = new Set();
  for (const lesson of ALL_LESSONS) {
    const snapshot = structureExposureSnapshotForLesson(lesson.id);
    const exposure = snapshot.forFree;
    for (const frame of SENTENCE_FRAMES) {
      if (canGuidedProduceStructure(exposure.get(frame.id))) applicableFrameIds.add(frame.id);
    }
    for (const copy of OPEN_PRODUCTION_GOALS) {
      if (canOpenProduceGoal(copy.goal, exposure)) applicableOpenGoals.add(copy.goal);
    }
  }

  if (runCognitive) {
    if (m3ProductionMiss.length > 0) {
      fail(`M3 perdeu produção obrigatória em: ${m3ProductionMiss.slice(0, 8).join(", ")}`);
    }
    if (m4TransferMiss.length > 0) {
      fail(`M4 perdeu transferência aplicável em: ${m4TransferMiss.slice(0, 8).join(", ")}`);
    }
    const l23 = getLesson("l23");
    if (!l23) fail("l23 deve existir");
    else {
      if (l23Conversations >= 2 && !l23M3HasProduction) {
        fail("l23@M3 com 2 diálogos perdeu produção — o planner ainda compete mal o orçamento");
      }
      const l23Base = buildLessonPracticePlan(l23, silent);
      const l23HasTransferBase = l23Base.some((step) => step.kind === "transfer_task");
      if (l23HasTransferBase && !l23M4HasTransfer) {
        fail("l23@M4 perdeu transfer_task que o plano-base tinha (não corrigir só no E2E)");
      }
    }
  }

  const requiredFrames = Math.min(MIN_RUNTIME_FRAMES, applicableFrameIds.size);
  const requiredOpenGoals = Math.min(MIN_RUNTIME_OPEN_GOALS, applicableOpenGoals.size);
  const missingApplicableFrames = [...applicableFrameIds].filter((id) => !runtimeFrames.has(id)).sort();

  if (runFrames) {
    if (runtimeFrames.size < requiredFrames) {
      fail(
        `frames no runtime: ${runtimeFrames.size}/${SENTENCE_FRAMES.length} (meta ≥${requiredFrames} dos ${applicableFrameIds.size} aplicáveis) — faltam ${missingApplicableFrames.slice(0, 8).join(", ")}`
      );
    }
    if (runtimeOpenGoals.size < requiredOpenGoals) {
      fail(
        `open goals no runtime: ${runtimeOpenGoals.size}/${OPEN_PRODUCTION_GOALS.length} (meta ≥${requiredOpenGoals} dos ${applicableOpenGoals.size} aplicáveis) — ${[...runtimeOpenGoals].sort().join(", ")}`
      );
    }
  }

  if (runConversation) {
    if (eviction.length > 0) {
      fail(`conversation injection removeu piso do pass: ${eviction.slice(0, 12).join(", ")}`);
    }
    const convoLessons = ALL_LESSONS.filter((lesson) =>
      buildLessonPracticePlan(lesson, silent).some((step) => step.kind === "conversation_scene")
    ).length;
    const share = convoLessons / ALL_LESSONS.length;
    if (share < MIN_CONVERSATION_SHARE) {
      fail(`conversas continuam numerosas: ${convoLessons}/${ALL_LESSONS.length} (${(share * 100).toFixed(0)}% < ${MIN_CONVERSATION_SHARE * 100}%)`);
    }
  }

  const lines = [
    "# Integridade de transferência comunicativa (V4.0)",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Resumo",
    "",
    `| Indicador | Valor |`,
    `|-----------|------:|`,
    `| Frames declarados | ${SENTENCE_FRAMES.length} |`,
    `| Frames no plano real | ${runtimeFrames.size} |`,
    `| Open goals declarados | ${OPEN_PRODUCTION_GOALS.length} |`,
    `| Open goals no plano real | ${runtimeOpenGoals.size} |`,
    `| Frames aplicáveis (guided) | ${applicableFrameIds.size} |`,
    `| Open goals aplicáveis | ${applicableOpenGoals.size} |`,
    `| M3 sem produção | ${m3ProductionMiss.length} |`,
    `| M4 sem transferência aplicável | ${m4TransferMiss.length} |`,
    `| Evicções conversa→piso | ${eviction.length} |`,
    `| l23 conversas (base) | ${l23Conversations} |`,
    `| l23@M3 produção | ${l23M3HasProduction ? "sim" : "não"} |`,
    `| l23@M3 transfer | ${l23M3HasTransfer ? "sim" : "não"} |`,
    `| l23@M4 transfer | ${l23M4HasTransfer ? "sim" : "não"} |`,
    "",
    "## Frames observados",
    "",
    ...(runtimeFrames.size ? [...runtimeFrames].sort().map((id) => `- \`${id}\``) : ["- (nenhum)"]),
    "",
    "## Objetivos abertos observados",
    "",
    ...(runtimeOpenGoals.size
      ? [...runtimeOpenGoals].sort().map((id) => `- \`${id}\``)
      : ["- (nenhum)"]),
    "",
  ];
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  const label =
    gateArg === "cognitive"
      ? "validate:cognitive-budget"
      : gateArg === "frames"
        ? "validate:structural-frame-runtime"
        : gateArg === "conversation"
          ? "validate:conversation-transfer-budget"
          : "validate:transfer-integrity";
  console.error(`\n${label} encontrou ${failures.length} problema(s):`);
  for (const error of failures) console.error(`  - ${error}`);
  process.exit(1);
}

const okLabel =
  gateArg === "cognitive"
    ? "validate:cognitive-budget"
    : gateArg === "frames"
      ? "validate:structural-frame-runtime"
      : gateArg === "conversation"
        ? "validate:conversation-transfer-budget"
        : "validate:transfer-integrity";
console.log(`OK: ${okLabel} passou.`);
