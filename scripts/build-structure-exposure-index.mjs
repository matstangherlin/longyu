#!/usr/bin/env node
/**
 * V3.9 · PERF-012 — Pré-computa o índice de exposição estrutural.
 *
 * O índice depende SÓ de dados estáticos da jornada: para montá-lo é preciso
 * gerar o plano de prática das 127 lições, ~12 s de CPU síncrona. Fazer isso no
 * aparelho é o congelamento relatado no Android; fazer no build custa zero para
 * o aluno. O resultado inteiro cabe em ~22 KB.
 *
 * O artefato gerado é conferido por `npm run validate:structure-index`, que
 * regenera e compara — assim ele não pode divergir da jornada em silêncio.
 *
 * Roda: npm run build:structure-index
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

/** Serializa os 4 degraus como uma máscara de bits — 22 KB viram ~8 KB. */
const RUNG_KEYS = ["exposed", "completion", "build", "guidedProduction"];

function encodeRungs(rungs) {
  let mask = 0;
  for (const [index, key] of RUNG_KEYS.entries()) {
    if (rungs[key]) mask |= 1 << index;
  }
  return mask;
}

function encodeMap(map) {
  const out = {};
  for (const [frameId, rungs] of map) out[frameId] = encodeRungs(rungs);
  return out;
}

export async function buildStructureExposureIndex() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-structure-index-"));
  try {
    const program = ts.createProgram(
      ["src/features/lesson/lessonTasks.ts", "src/data/journey.ts"],
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
    if (program.emit().emitSkipped) throw new Error("falha ao compilar lessonTasks");

    const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
    const lessonTasks = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

    // Recalcular do ZERO: sem isto o gerador (e o validador) leriam de volta o
    // artefato commitado, e a conferência de divergência seria circular.
    lessonTasks.setIgnorePrecomputedStructureExposure(true);

    const lessons = {};
    for (const lesson of ALL_LESSONS) {
      const bundle = lessonTasks.structureExposureSnapshotForLesson(lesson.id);
      const transferred = lessonTasks.priorTransferredFramesSnapshotForLesson(lesson.id);
      lessons[lesson.id] = {
        free: encodeMap(bundle.forFree),
        transfer: encodeMap(bundle.forTransfer),
        priorTransferred: [...transferred].sort(),
      };
    }
    return { lessons, lessonCount: ALL_LESSONS.length };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function render(index) {
  return `// GERADO POR scripts/build-structure-exposure-index.mjs — não editar à mão.
//
// V3.9 · PERF-012 — índice de exposição estrutural pré-computado.
//
// Montar este índice em runtime custava ~12 s de CPU síncrona (plano de prática
// das ${index.lessonCount} lições) só para abrir UMA lição — o congelamento visto no Android.
// Como ele depende apenas de dados estáticos da jornada, é resolvido no build.
//
// Degraus codificados como máscara de bits, na ordem:
//   1 = exposed · 2 = completion · 4 = build · 8 = guidedProduction
//
// Regenerar: npm run build:structure-index
// Conferir:  npm run validate:structure-index

export interface PrecomputedLessonExposure {
  free: Record<string, number>;
  transfer: Record<string, number>;
  priorTransferred: string[];
}

export const STRUCTURE_EXPOSURE_RUNG_BITS = ["exposed", "completion", "build", "guidedProduction"] as const;

export const PRECOMPUTED_STRUCTURE_EXPOSURE: Record<string, PrecomputedLessonExposure> = ${JSON.stringify(
    index.lessons,
    null,
    2
  )};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = await buildStructureExposureIndex();
  const target = path.join(root, "src/data/generated/structureExposureIndex.ts");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, render(index), "utf8");
  const frames = Object.values(index.lessons).reduce(
    (total, entry) => total + Object.keys(entry.free).length + Object.keys(entry.transfer).length,
    0
  );
  console.log(`Wrote ${path.relative(root, target)} — ${index.lessonCount} lições · ${frames} entradas de frame.`);
}
