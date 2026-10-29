#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-account-isolation-"));

const program = ts.createProgram(["src/lib/auth/progressClaim.ts", "src/lib/auth/accountIsolation.ts"], {
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

const claim = require(path.join(outDir, "src/lib/auth/progressClaim.js"));
const isolation = require(path.join(outDir, "src/lib/auth/accountIsolation.js"));
const store = await readFile("src/lib/store.ts", "utf8");
const sync = await readFile("src/services/cloudSyncCoordinator.ts", "utf8");

const base = { localFingerprint: "a", remoteFingerprint: "b", localScore: 10, remoteScore: 4 };

assert.deepEqual(
  claim.classifyClaim({ ...base, localMeaningful: true, remoteMeaningful: false }),
  { case: "LOCAL_ONLY", action: "CLAIM_SILENT" },
  "visitante sem nuvem continua reivindicável"
);
assert.equal(
  claim.classifyClaim({
    ...base,
    localMeaningful: true,
    remoteMeaningful: false,
    localAccountId: "local",
    sessionUserId: "user-b",
  }).action,
  "CLAIM_SILENT",
  "só o slot anônimo local é reivindicável"
);
assert.equal(
  claim.classifyClaim({
    ...base,
    localMeaningful: true,
    remoteMeaningful: false,
    localAccountId: "cloud:user-a",
    sessionUserId: "user-b",
  }).action,
  "NONE",
  "progresso de cloud:A não é reivindicado por B"
);
assert.equal(
  claim.classifyClaim({
    ...base,
    localMeaningful: true,
    remoteMeaningful: true,
    localAccountId: "cloud:user-a",
    sessionUserId: "user-b",
  }).action,
  "RESTORE_CLOUD",
  "B com nuvem restaura a própria nuvem e não mescla A"
);
assert.equal(
  claim.classifyClaim({
    ...base,
    localMeaningful: true,
    remoteMeaningful: false,
    localAccountId: "cloud:user-a",
    sessionUserId: "user-a",
  }).action,
  "CLAIM_SILENT",
  "a mesma conta cloud pode seguir com o próprio progresso local"
);

const anonFirst = isolation.resolveLoginProgress({
  currentAccountId: "local",
  sessionUserId: "user-a",
  exportMeaningful: true,
  cacheMeaningful: false,
  remoteMeaningful: false,
  hasRemoteSnapshot: false,
  remoteProgressPresent: false,
});
assert.deepEqual(anonFirst, { source: "local", push: true }, "anônimo → primeira conta leva o progresso");

const second = isolation.resolveLoginProgress({
  currentAccountId: "cloud:user-a",
  sessionUserId: "user-b",
  exportMeaningful: true,
  cacheMeaningful: false,
  remoteMeaningful: false,
  hasRemoteSnapshot: false,
  remoteProgressPresent: false,
});
assert.equal(second.push, false, "segunda conta não envia o progresso da primeira");
assert.notEqual(second.source, "local");
assert.notEqual(second.source, "merge");

const foreignRemote = isolation.resolveLoginProgress({
  currentAccountId: "cloud:user-a",
  sessionUserId: "user-b",
  exportMeaningful: true,
  cacheMeaningful: false,
  remoteMeaningful: true,
  hasRemoteSnapshot: true,
  remoteProgressPresent: true,
});
assert.deepEqual(foreignRemote, { source: "remote", push: false });

assert.equal(
  isolation.syncItemMatchesSession({ userId: "user-a", accountId: "cloud:user-a" }, { userId: "user-b", accountId: "cloud:user-b" }),
  false,
  "fila de A não sai na sessão de B"
);
assert.equal(
  isolation.syncItemMatchesSession({ userId: "user-b", accountId: "cloud:user-b" }, { userId: "user-b", accountId: "cloud:user-b" }),
  true
);
assert.equal(isolation.syncItemMatchesSession({}, { userId: null, accountId: "local" }), true, "item legado sem dono continua no caminho antigo");

const parts = isolation.partitionOwnedSyncItems(
  [{ id: "a", ownerUserId: "user-a" }, { id: "b", ownerUserId: "user-b" }, { id: "x", ownerUserId: null }],
  "user-b"
);
assert.deepEqual(parts.send.map((item) => item.id), ["b"]);
assert.deepEqual(parts.hold.map((item) => item.id), ["a", "x"]);

assert.equal(isolation.scopedEnergyStorageKey("longyu-energy:immersion:s:2026-10-26", "cloud:user-b"), "longyu-energy:immersion:s:2026-10-26::cloud:user-b");
assert.equal(isolation.scopedEnergyStorageKey("longyu-energy:lesson:l1:pass:1:2026-10-26", "local").includes("::local"), true);

const id = claim.claimId("local", "user-a", "fp");
const once = claim.recordClaim(claim.emptyLedger(), id, "claimed");
const twice = claim.recordClaim(once.ledger, id, "claimed");
assert.equal(once.changed, true);
assert.equal(twice.changed, false);
assert.equal(claim.alreadyClaimed(twice.ledger, id), true, "a mesma reivindicação não entra de novo");

assert.equal(store.includes("progress ?? existing ?? fallback"), false, "buildCloudAccount não copia a conta anterior");
assert.match(store, /fallback\?\.id === id \? fallback : undefined/);
assert.match(store, /preservedAccountsForGuestShell = saveCurrentAccount\(s\)/);
assert.match(sync, /resolveLoginProgress\(/);
assert.match(sync, /currentAccountId !== cloudAccountId\(user\.id\)/);
assert.match(store, /return wipeToGuestShell\(\);/);

console.log("test:account-isolation PASS");
