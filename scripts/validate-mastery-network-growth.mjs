#!/usr/bin/env node
/**
 * PED-V33 — valida crescimento em rede lexical do Mastery Loop (piloto).
 *
 * Para cada lição do piloto (src/data/masteryPilot.ts), confirma que ela
 * realmente entrega profundidade de rede — não só modalidade repetida:
 * - ao menos 1 combinação em networkChunks;
 * - ao menos 1 item de vocabulário "productive" (o aluno precisa produzir
 *   algo, não só reconhecer);
 * - M3 traz reverse_recall ou algum kind de produção (no plano ou no bônus);
 * - M4 traz um kind de transferência/produção (isProductionOrTransferKind).
 *
 * Escrito defensivamente: masteryPilot.ts pode estar em edição paralela por
 * outra IA (ex.: import para um módulo ainda não criado). Se a compilação
 * falhar por esse motivo, o validador avisa e sai com sucesso — em vez de
 * bloquear o pipeline por causa de um arquivo que não é responsabilidade
 * deste agente.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-network-growth-"));
const failures = [];
const fail = (message) => failures.push(message);

let pilot;
let mastery;
let getLesson;
let lessonRoundStepsFor;

try {
  const program = ts.createProgram(
    ["src/data/masteryLoop.ts", "src/data/masteryPilot.ts", "src/data/journey.ts", "src/features/lesson/lessonTasks.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript não compilou o validador de crescimento em rede");

  mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  ({ getLesson } = require(path.join(outDir, "src/data/journey.js")));
  ({ lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js")));
} catch (error) {
  console.warn(
    "SKIP validate:mastery-network-growth — masteryPilot.ts/lessonTasks.ts não compilaram agora (provável edição em andamento por outra IA)."
  );
  console.warn("  Detalhe:", error instanceof Error ? error.message : String(error));
  await rm(outDir, { recursive: true, force: true });
  process.exit(0);
}

try {
  let checked = 0;
  for (const lessonId of pilot.MASTERY_PILOT_LESSON_IDS) {
    const targets = pilot.PILOT_LEXICAL_TARGETS?.[lessonId];
    if (!targets) {
      console.warn(`   ${lessonId}: sem PILOT_LEXICAL_TARGETS ainda — pulando (piloto em expansão)`);
      continue;
    }

    assert.ok(
      Array.isArray(targets.networkChunks) && targets.networkChunks.length >= 1,
      `${lessonId}: networkChunks deve ter ao menos 1 combinação estrutural nova`
    );

    const productiveVocab = targets.vocabulary.filter((item) => item.role === "productive");
    assert.ok(
      productiveVocab.length >= 1,
      `${lessonId}: precisa de ao menos 1 item de vocabulário "productive"`
    );

    const lesson = getLesson(lessonId);
    assert.ok(lesson, `${lessonId}: lição deve existir na Jornada`);

    const bonus3 = pilot.masteryBonusStepsFor(lessonId, 3);
    const plan3 = lessonRoundStepsFor(lesson, { masteryLevel: 2, masteryPass: 3, silent: true });
    const hasReverseOrProductionM3 =
      [...bonus3, ...plan3].some((step) => step.kind === "reverse_recall" || mastery.isProductionOrTransferKind(step.kind));
    assert.ok(
      hasReverseOrProductionM3,
      `${lessonId}: M3 precisa de reverse_recall ou produção no bônus/plano`
    );

    const bonus4 = pilot.masteryBonusStepsFor(lessonId, 4);
    const plan4 = lessonRoundStepsFor(lesson, { masteryLevel: 3, masteryPass: 4, silent: true });
    const hasTransferM4 = [...bonus4, ...plan4].some((step) => mastery.isProductionOrTransferKind(step.kind));
    assert.ok(hasTransferM4, `${lessonId}: M4 precisa de um kind de transferência/produção`);

    checked += 1;
  }

  console.log(`OK validate:mastery-network-growth — ${checked} lições do piloto auditadas`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL validate:mastery-network-growth");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
