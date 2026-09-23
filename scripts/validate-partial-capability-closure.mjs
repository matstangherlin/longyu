#!/usr/bin/env node
/**
 * validate:partial-capability-closure — RC2.2.9.
 *
 * As 11 capacidades que eram PARTIAL, uma a uma (auditoria G1–G11 da
 * remessa), e o China Survival Benchmark exigindo READY de runtime — não só
 * "a ref existe".
 */
import process from "node:process";
import { loadCapabilityGateContext } from "./lib/capability-evidence-runtime.mjs";
import { CLOSURE_IDS, runCapabilityRuntimeGates, runPartialClosureGates } from "./lib/capability-closure-gates.mjs";

const ctx = loadCapabilityGateContext();
const available = new Set(ctx.registry.chunkHanziByRef.keys());
const failures = [
  // G2/K1/A1 das 11 (o contrato estrito) vêm do gate de runtime.
  ...runCapabilityRuntimeGates(ctx).filter((item) => CLOSURE_IDS.some((id) => item.where.includes(id)) || item.gate === "G2"),
  ...runPartialClosureGates({ ...ctx, available }),
];
if (failures.length) {
  console.error(`FAIL validate:partial-capability-closure — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.gate}/${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const survival = ctx.capabilityModule.evaluateChinaSurvivalV2(available, ctx.evidenceById);
console.log(
  `PASS validate:partial-capability-closure — ${CLOSURE_IDS.length}/${CLOSURE_IDS.length} READY em runtime (contrato estrito) · China Survival ${survival.filter((row) => row.communicativeReady).length}/${survival.length} cenários com capacidades READY em runtime`
);
