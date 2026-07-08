import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-hanzi-atlas-"));

try {
  const program = ts.createProgram(["src/data/first5000Seed.ts", "src/data/hanziAtlas.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  });

  const emit = program.emit();
  const emitDiagnostics = ts.formatDiagnosticsWithColorAndContext(emit.diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => rootDir,
    getNewLine: () => "\n",
  });

  if (emit.emitSkipped) {
    console.error(emitDiagnostics);
    process.exitCode = 1;
    throw new Error("Falha ao compilar seed do Atlas.");
  }

  const {
    FIRST_1200_SEED,
    FIRST_300,
    FIRST_1000,
    FIRST_3000,
    FIRST_5000,
    FIRST_5000_SEED,
  } = require(path.join(outDir, "src/data/first5000Seed.js"));
  const { HANZI_ATLAS } = require(path.join(outDir, "src/data/hanziAtlas.js"));
  const errors = [
    ...validateSeed(FIRST_5000_SEED),
    ...validateBatches({ FIRST_1200_SEED, FIRST_300, FIRST_1000, FIRST_3000, FIRST_5000, FIRST_5000_SEED }),
    ...validateAtlas(HANZI_ATLAS),
  ];

  if (errors.length > 0) {
    console.error(`Atlas inválido: ${errors.length} problema(s).`);
    for (const error of errors.slice(0, 40)) console.error(`- ${error}`);
    if (errors.length > 40) console.error(`...mais ${errors.length - 40} problema(s).`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: ${FIRST_5000_SEED.length} entradas first-5000 (${FIRST_300.length} top 300, ${FIRST_1000.length} top 1000) e ${HANZI_ATLAS.length} entradas do Atlas validadas.`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

function validateSeed(seed) {
  const errors = [];
  const hanzi = new Map();
  const ranks = new Map();
  const ids = new Map();

  if (!Array.isArray(seed)) return ["FIRST_5000_SEED precisa ser um array."];
  if (seed.length < 300) errors.push(`FIRST_5000_SEED precisa ter pelo menos 300 entradas; recebeu ${seed.length}.`);

  seed.forEach((entry, index) => {
    const label = entry?.hanzi ? `${entry.hanzi} (#${entry.freqRank ?? index + 1})` : `entrada ${index + 1}`;

    if (!entry?.hanzi) errors.push(`${label}: hanzi vazio.`);
    if (!entry?.pinyin?.trim()) errors.push(`${label}: pinyin vazio.`);
    if (!entry?.meaningPt?.trim()) errors.push(`${label}: meaningPt vazio.`);
    if (!Number.isInteger(entry?.freqRank)) errors.push(`${label}: freqRank inválido.`);
    if (!Number.isInteger(entry?.tone) || entry.tone < 1 || entry.tone > 5) errors.push(`${label}: tone inválido.`);

    if (typeof entry?.source !== "string" || entry.source.trim() === "") errors.push(`${label}: source obrigatorio.`);
    if (entry?.source && !["journey", "first5000", "manual"].includes(entry.source)) {
      errors.push(`${label}: source invalido (${entry.source}).`);
    }

    trackUnique(hanzi, entry?.hanzi, label, "hanzi", errors);
    trackUnique(ranks, entry?.freqRank, label, "freqRank", errors);
    trackUnique(ids, derivedAtlasId(entry), label, "id", errors);

    if (entry?.source !== "first5000") errors.push(`${label}: source precisa ser first5000.`);
    if (entry?.inJourney !== false) errors.push(`${label}: inJourney precisa ser false.`);
    if (entry?.hasLesson !== false) errors.push(`${label}: hasLesson precisa ser false.`);
    if (entry?.hasDecomposition !== false) errors.push(`${label}: hasDecomposition precisa ser false.`);
    if (entry?.isPremium !== false) errors.push(`${label}: isPremium precisa ser false.`);
  });

  return errors;
}

function validateBatches(batches) {
  const errors = [];
  const source = batches.FIRST_1200_SEED;

  if (!Array.isArray(source)) return ["FIRST_1200_SEED precisa ser um array."];

  const expected = {
    FIRST_300: 300,
    FIRST_1000: Math.min(1000, source.length),
    FIRST_3000: Math.min(3000, source.length),
    FIRST_5000: Math.min(5000, source.length),
    FIRST_5000_SEED: Math.min(5000, source.length),
  };

  for (const [name, expectedLength] of Object.entries(expected)) {
    const batch = batches[name];
    if (!Array.isArray(batch)) {
      errors.push(`${name} precisa ser um array.`);
      continue;
    }

    if (batch.length !== expectedLength) {
      errors.push(`${name} deveria ter ${expectedLength} entradas; recebeu ${batch.length}.`);
    }

    for (let index = 0; index < batch.length; index += 1) {
      const batchEntry = batch[index];
      const sourceEntry = source[index];
      if (!sourceEntry || batchEntry?.hanzi !== sourceEntry.hanzi || batchEntry?.freqRank !== sourceEntry.freqRank) {
        errors.push(`${name}: entrada ${index + 1} nao preserva o prefixo de FIRST_1200_SEED.`);
        break;
      }
    }
  }

  return errors;
}

function validateAtlas(atlas) {
  const errors = [];
  const hanzi = new Map();
  const ranks = new Map();
  const ids = new Map();

  if (!Array.isArray(atlas)) return ["HANZI_ATLAS precisa ser um array."];

  const top300Count = atlas.filter((entry) => Number.isInteger(entry?.freqRank) && entry.freqRank <= 300).length;
  if (top300Count !== 300) errors.push(`HANZI_ATLAS precisa expor exatamente 300 entradas no top 300; recebeu ${top300Count}.`);

  const top1000Count = atlas.filter((entry) => Number.isInteger(entry?.freqRank) && entry.freqRank <= 1000).length;
  if (atlas.length >= 1000 && top1000Count !== 1000) {
    errors.push(`HANZI_ATLAS precisa expor exatamente 1000 entradas no top 1000; recebeu ${top1000Count}.`);
  }

  atlas.forEach((entry, index) => {
    const label = entry?.hanzi ? `${entry.hanzi} (#${entry.freqRank ?? index + 1})` : `atlas ${index + 1}`;

    if (typeof entry?.source !== "string" || entry.source.trim() === "") errors.push(`${label}: source obrigatorio.`);
    if (entry?.source && !["journey", "first5000", "manual"].includes(entry.source)) {
      errors.push(`${label}: source invalido (${entry.source}).`);
    }

    if (!entry?.id?.trim()) errors.push(`${label}: id vazio.`);
    if (!entry?.hanzi) errors.push(`${label}: hanzi vazio.`);
    if (!entry?.pinyin?.trim()) errors.push(`${label}: pinyin vazio.`);
    if (!entry?.meaningPt?.trim()) errors.push(`${label}: meaningPt vazio.`);
    if (!Number.isInteger(entry?.freqRank)) errors.push(`${label}: freqRank inválido.`);
    if (!Number.isInteger(entry?.tone) || entry.tone < 1 || entry.tone > 5) errors.push(`${label}: tone inválido.`);

    trackUnique(hanzi, entry?.hanzi, label, "hanzi", errors);
    trackUnique(ranks, entry?.freqRank, label, "freqRank", errors);
    trackUnique(ids, entry?.id, label, "id", errors);
  });

  return errors;
}

function trackUnique(map, key, label, field, errors) {
  if (key === undefined || key === null || key === "") return;
  const previous = map.get(key);
  if (previous) {
    errors.push(`${label}: ${field} duplicado com ${previous}.`);
    return;
  }
  map.set(key, label);
}

function derivedAtlasId(entry) {
  if (!entry) return undefined;
  const rank = Number.isInteger(entry.freqRank) ? String(entry.freqRank).padStart(4, "0") : "sem_rank";
  const pinyinKey = String(entry.toneless || entry.pinyin || "zi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

  return `f5k_${rank}_${pinyinKey || "zi"}`;
}
