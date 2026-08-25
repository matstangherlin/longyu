/**
 * test:early-transfer — TR5-019 plano real até a primeira transferência combinacional.
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-test-early-transfer-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/productionTasks.ts",
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
    console.error("Falha ao compilar test:early-transfer.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor, curriculumGlyphsThroughLesson } = load("src/features/lesson/lessonTasks.js");
  const { CORPUS_SENTENCES } = load("src/data/productionTasks.js");

  const corpus = new Set([...CORPUS_SENTENCES].map((s) => s.replace(/[。，？！\s:;"'()]/g, "")));

  let firstTransferLesson = null;
  let firstTransferStep = null;
  let firstTransferIndex = -1;

  for (let index = 0; index < ALL_LESSONS.length; index += 1) {
    const lesson = ALL_LESSONS[index];
    const prior = ALL_LESSONS.slice(0, index).map((entry) => entry.id);
    const plan = lessonRoundStepsFor(lesson, { completedLessons: prior });
    const transferIndex = plan.findIndex((step) => step.kind === "transfer_task");
    if (transferIndex >= 0) {
      firstTransferLesson = lesson;
      firstTransferStep = plan[transferIndex];
      firstTransferIndex = index;
      break;
    }
  }

  if (!firstTransferLesson || !firstTransferStep) {
    fail("nenhuma transfer_task no plano da jornada");
  } else {
    const lessonNum = firstTransferIndex + 1;
    const target = String(
      firstTransferStep.targetHanzi ?? firstTransferStep.correctAnswer ?? ""
    ).replace(/[。，？！\s]/g, "");

    if (lessonNum > 15) fail(`lessonToFirstTransfer=${lessonNum} (meta ≤15)`);
    if (!target.includes("请问") || !target.includes("叫什么")) {
      fail(`primeira transferência inesperada: ${target}`);
    }
    if (corpus.has(target)) fail(`alvo ${target} não é inédito no corpus`);
    if (firstTransferStep.productionAssist !== "supported") {
      fail(`assist=${firstTransferStep.productionAssist} (esperado supported)`);
    }

    const glyphs = curriculumGlyphsThroughLesson(firstTransferLesson.id);
    for (const ch of target) {
      if (/[\u3400-\u9fff]/.test(ch) && !glyphs.has(ch)) {
        fail(`glifo ${ch} no alvo antes de ser ensinado`);
      }
    }

    const next = ALL_LESSONS[firstTransferIndex + 1];
    if (next) {
      const nextPlan = lessonRoundStepsFor(next, {
        completedLessons: ALL_LESSONS.slice(0, firstTransferIndex + 1).map((entry) => entry.id),
      });
      const nextTransfer = nextPlan.find((step) => step.kind === "transfer_task");
      if (
        nextTransfer &&
        nextTransfer.productionFrameId === firstTransferStep.productionFrameId &&
        String(nextTransfer.targetHanzi ?? nextTransfer.correctAnswer ?? "").replace(/[。，？！\s]/g, "") ===
          target
      ) {
        fail("lição seguinte repete imediatamente o mesmo frame/alvo de transferência");
      }
    }
  }

  if (failures.length > 0) {
    console.error(`FAIL test:early-transfer (${failures.length}):`);
    for (const message of failures) console.error(`  - ${message}`);
    process.exit(1);
  }

  console.log(
    `OK test:early-transfer — L${firstTransferIndex + 1} ${firstTransferLesson?.id} · ${firstTransferStep?.targetHanzi ?? firstTransferStep?.correctAnswer}`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
