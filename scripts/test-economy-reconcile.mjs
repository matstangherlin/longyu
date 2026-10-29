#!/usr/bin/env node
/**
 * LGY-009 / LGY-018 — os cinco cenários da reconciliação.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const out = await mkdtemp(path.join(os.tmpdir(), "longyu-econ-"));
try {
  const program = ts.createProgram(["src/lib/economyReconcile.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir: out,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const file = path.join(out, "src/lib/economyReconcile.js");
  const api = createRequire(import.meta.url)(file);

  const serverOk = api.reconcileEconomyBalance({ qi: 7, charges: 5 }, { qi: 17, charges: 5 }, 0);
  assert.equal(serverOk.qi, 17, "servidor ok sobe o Qi");
  assert.equal(serverOk.heldLocalGrant, false);

  const older = api.reconcileEconomyBalance({ qi: 17, charges: 4 }, { qi: 7, charges: 2 }, 1);
  assert.equal(older.qi, 17, "snapshot mais baixo não apaga Qi pendente");
  assert.equal(older.charges, 4);
  assert.equal(older.heldLocalGrant, true);

  const rejected = api.reconcileEconomyBalance({ qi: 17, charges: 4 }, { qi: 7, charges: 2 }, 0);
  assert.equal(rejected.qi, 7, "sem fila, o servidor vence");
  assert.equal(rejected.heldLocalGrant, false);

  assert.equal(api.isMissingEconomyRpc("Could not find the function public.claim_mission in the schema cache"), true);
  assert.equal(api.isMissingEconomyRpc("PGRST202"), true);
  assert.equal(api.isMissingEconomyRpc("network timeout"), false);

  assert.equal(api.replayGrantsQi(false), false, "replay não rende Qi");
  assert.equal(api.replayGrantsQi(true), true);

  const bridge = await readFile(path.join(root, "src/lib/economyServerBridge.ts"), "utf8");
  const store = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(bridge, /reconcileEconomyBalance/);
  assert.match(store, /isMissingEconomyRpc/);
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("test:economy-reconcile PASS");
