#!/usr/bin/env node
/**
 * V3.9 · PERF-012 — O índice pré-computado bate com a jornada atual?
 *
 * O artefato `src/data/generated/structureExposureIndex.ts` decide gates de
 * transferência e produção livre. Se ele divergir da jornada, o runtime aplica
 * pré-requisitos errados EM SILÊNCIO — nenhum outro validador perceberia,
 * porque todos leriam o mesmo artefato torto.
 *
 * Aqui o índice é reconstruído do zero e comparado entrada a entrada com o que
 * está commitado. Qualquer diferença é falha, com instrução de regeneração.
 *
 * Roda: npm run validate:structure-index
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

import { buildStructureExposureIndex } from "./build-structure-exposure-index.mjs";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-structure-index-check-"));
try {
  const program = ts.createProgram(["src/data/generated/structureExposureIndex.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) throw new Error("falha ao compilar o índice commitado");

  const { PRECOMPUTED_STRUCTURE_EXPOSURE: committed } = require(
    path.join(outDir, "src/data/generated/structureExposureIndex.js")
  );
  const rebuilt = (await buildStructureExposureIndex()).lessons;

  const committedIds = Object.keys(committed);
  const rebuiltIds = Object.keys(rebuilt);

  for (const lessonId of rebuiltIds) {
    if (!committed[lessonId]) {
      fail(`lição "${lessonId}" existe na jornada mas falta no índice commitado.`);
    }
  }
  for (const lessonId of committedIds) {
    if (!rebuilt[lessonId]) {
      fail(`lição "${lessonId}" está no índice commitado mas não existe mais na jornada.`);
    }
  }

  const compareMaps = (lessonId, side, from, to) => {
    const keys = new Set([...Object.keys(from ?? {}), ...Object.keys(to ?? {})]);
    for (const frameId of keys) {
      const expected = from?.[frameId] ?? 0;
      const actual = to?.[frameId] ?? 0;
      if (expected !== actual) {
        fail(
          `${lessonId} · ${side} · frame "${frameId}": commitado=${actual}, recalculado=${expected}.`
        );
      }
    }
  };

  for (const lessonId of rebuiltIds) {
    const expected = rebuilt[lessonId];
    const actual = committed[lessonId];
    if (!actual) continue;
    compareMaps(lessonId, "free", expected.free, actual.free);
    compareMaps(lessonId, "transfer", expected.transfer, actual.transfer);
    const expectedTransferred = (expected.priorTransferred ?? []).join("|");
    const actualTransferred = (actual.priorTransferred ?? []).join("|");
    if (expectedTransferred !== actualTransferred) {
      fail(
        `${lessonId} · priorTransferred difere: commitado=[${actualTransferred}], ` +
          `recalculado=[${expectedTransferred}].`
      );
    }
  }

  const frames = Object.values(rebuilt).reduce(
    (total, entry) => total + Object.keys(entry.free).length + Object.keys(entry.transfer).length,
    0
  );
  console.log(
    `Índice estrutural: ${rebuiltIds.length} lições · ${frames} entradas de frame conferidas.`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nvalidate:structure-index encontrou ${failures.length} divergência(s):\n`);
  for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
  if (failures.length > 40) console.error(` … e mais ${failures.length - 40}.`);
  console.error("\nRegenere com: npm run build:structure-index");
  process.exit(1);
}
console.log("OK: índice pré-computado corresponde à jornada atual.");
