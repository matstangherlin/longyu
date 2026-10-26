#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-profile-save-"));
const program = ts.createProgram(["src/lib/displayName.ts"], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: root,
  outDir,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: true,
});
const emit = program.emit();
if (emit.emitSkipped) {
  console.error(ts.formatDiagnosticsWithColorAndContext(emit.diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n",
  }));
  process.exit(1);
}

const names = require(path.join(outDir, "src/lib/displayName.js"));

assert.equal(names.displayNameForAccount({ name: "Ana Free", authMode: "cloud" }), "Ana Free");
assert.equal(names.displayNameForAccount({ name: "Aluno local", authMode: "cloud" }), "Aluno");
assert.equal(names.displayNameForAccount({ name: "Aluno Longyu", authMode: "cloud" }), "Aluno");
assert.equal(names.displayNameForAccount({ name: "", authMode: "local" }), "Aluno");
assert.equal(names.isPlaceholderDisplayName("Novo aluno"), true);
assert.equal(names.displayNameForAccount({ name: "Aluno local", authMode: "cloud" }).includes("local"), false);

assert.equal(names.nextProfileSyncStatus("loading", "success", 100), "synced");
assert.equal(names.nextProfileSyncStatus("loading", "schema", 100), "error");
assert.equal(names.nextProfileSyncStatus("pending", "timeout", 100), "error");
assert.equal(names.nextProfileSyncStatus("loading", "offline", 100), "error");
assert.equal(names.nextProfileSyncStatus("loading", "pending", 14_000), "loading");
assert.equal(names.nextProfileSyncStatus("pending", "pending", names.SYNC_SAVING_LIMIT_MS), "error");
assert.equal(names.nextProfileSyncStatus("synced", "pending", 20_000), "synced");

console.log("test:profile-save PASS");
