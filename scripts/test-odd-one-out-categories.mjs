/**
 * test:odd-one-out-categories — PED-012/013 source + data guards.
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
const fail = (m) => failures.push(m);
const assert = (c, m) => {
  if (!c) fail(m);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-ooo-"));
try {
  const program = ts.createProgram(["src/data/oddOneOutCategories.ts", "src/data/vocabulary.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  const emit = program.emit();
  assert(!emit.emitSkipped, "compile oddOneOutCategories");
  const mod = require(path.join(outDir, "src/data/oddOneOutCategories.js"));

  assert(Array.isArray(mod.CURATED_ODD_ONE_OUT_SETS) && mod.CURATED_ODD_ONE_OUT_SETS.length >= 5, "curated sets exist");
  assert(!mod.ODD_ONE_OUT_CATEGORY_MEMBERS.beverages.includes("好喝"), "好喝 não é membro de beverages");
  assert(mod.oddOneOutLevelForPhase(1) === 1, "level phase 1");
  assert(mod.oddOneOutLevelForPhase(3) === 2, "level phase 3");
  assert(mod.oddOneOutLevelForPhase(5) === 3, "level phase 5");

  const resolved = mod.allResolvedCuratedOddOneOutSets();
  assert(resolved.length >= 5, "resolved curated sets");
  for (const set of resolved) {
    assert(set.members.length === 3, `${set.id} has 3 members`);
    assert(set.intruder?.hanzi, `${set.id} has intruder`);
    assert(!set.members.some((m) => m.hanzi === set.intruder.hanzi), `${set.id} intruder not in members`);
  }

  // VocabDomain must not be required for generation — module has no VocabDomain import surface.
  assert(typeof mod.curatedOddOneOutSetsFor === "function", "curatedOddOneOutSetsFor");
  const allGlyphs = new Set();
  for (const set of resolved) {
    for (const m of set.members) for (const g of m.hanzi) allGlyphs.add(g);
    for (const g of set.intruder.hanzi) allGlyphs.add(g);
  }
  const available = mod.curatedOddOneOutSetsFor(allGlyphs, { level: 3 });
  assert(available.length >= 3, "sets available with full glyph set");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:odd-one-out-categories:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}
console.log("OK: test:odd-one-out-categories");
