#!/usr/bin/env node
/**
 * test:fingerprint-chain — RC2.3.4A mutation testing for the curriculum
 * fingerprint chain consumed by validate:release-candidate.
 */
import assert from "node:assert/strict";
import { fingerprintRecords, verifyFingerprintChain } from "./lib/fingerprint-chain.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";
import fs from "node:fs";

const freeze = tsRequire("../../src/lib/curriculumFreeze.ts");
const scripts = new Set(Object.keys(JSON.parse(fs.readFileSync("package.json", "utf8")).scripts));
const live = journeyFingerprint(process.cwd());
const records = fingerprintRecords(freeze);
const ctx = { anchor: "c48b008c9c1e", declared: freeze.RC_BASE_FINGERPRINT, live, records, knownScripts: scripts };

const real = verifyFingerprintChain(ctx);
assert.deepEqual(real.errors, [], "cadeia real precisa fechar");
console.log(`PASS cadeia real: ${real.path.join(" → ")}`);

const edit = (fn) => records.map((r) => fn({ ...r }) ?? r).filter(Boolean);
const cases = [
  ["1. avanço sem registro", { ...ctx, records: records.filter((r) => r.fingerprint !== live || r.previousFingerprint === live) }, /sem registro tipado/],
  ["2. live diverge do declarado", { ...ctx, live: "deadbeef0000" }, /RC_BASE_FINGERPRINT/],
  ["3. fork", { ...ctx, records: [...records, { exportName: "FORK", id: "fork", gate: "validate:release-candidate", previousFingerprint: "c48b008c9c1e", fingerprint: "aaaaaaaaaaaa" }] }, /fork/],
  ["4. registro órfão", { ...ctx, records: [...records, { exportName: "ORPHAN", id: "o", gate: "validate:release-candidate", previousFingerprint: "111111111111", fingerprint: "222222222222" }] }, /fora da cadeia/],
  ["5. gate inexistente", { ...ctx, records: edit((r) => (r.previousFingerprint !== r.fingerprint ? { ...r, gate: "gate:nao-existe" } : r)) }, /não existe em package.json/],
  ["6. registro sem id", { ...ctx, records: edit((r) => ({ ...r, id: "" })) }, /sem id/],
  ["7. ciclo", { ...ctx, records: [...records, { exportName: "CYCLE", id: "c", gate: "validate:release-candidate", previousFingerprint: live, fingerprint: "c48b008c9c1e" }] }, /ciclo/],
  ["8. registro neutro fora da cadeia", { ...ctx, records: [...records, { exportName: "NEUTRAL", id: "n", gate: "validate:release-candidate", previousFingerprint: "333333333333", fingerprint: "333333333333" }] }, /não está na cadeia/],
];
let killed = 0;
for (const [label, input, pattern] of cases) {
  const { errors } = verifyFingerprintChain(input);
  assert.ok(errors.some((e) => pattern.test(e)), `mutação "${label}" não morreu: ${errors.join(" | ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}`);
}
console.log(`PASS test:fingerprint-chain (${killed}/${cases.length} mutações mortas)`);
