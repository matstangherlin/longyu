/**
 * test:seeded-shuffle — PED-015 deterministic shuffle guards.
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-shuffle-"));
try {
  const program = ts.createProgram(["src/lib/seededShuffle.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  assert(!program.emit().emitSkipped, "compile seededShuffle");
  const { seededShuffle, seededShuffleAvoidingOrder, hashSeed } = require(
    path.join(outDir, "src/lib/seededShuffle.js")
  );

  const items = ["水", "茶", "咖啡", "好喝"];
  const a = seededShuffle(items, "seed-a");
  const b = seededShuffle(items, "seed-a");
  const c = seededShuffle(items, "seed-b");
  assert(a.join(",") === b.join(","), "same seed → same order");
  assert(a.join(",") !== c.join(",") || items.length < 2, "different seed usually differs");
  assert(a.slice().sort().join(",") === items.slice().sort().join(","), "shuffle preserves members");

  const canonical = ["水", "茶", "咖啡", "好喝"];
  const avoided = seededShuffleAvoidingOrder(items, "ooo:test:1", canonical);
  assert(avoided.join(",") !== canonical.join(","), "avoidingOrder differs from canonical");
  assert(typeof hashSeed("x") === "number", "hashSeed returns number");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:seeded-shuffle:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}
console.log("OK: test:seeded-shuffle");
