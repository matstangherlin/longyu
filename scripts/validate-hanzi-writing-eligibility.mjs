#!/usr/bin/env node
/**
 * validate:hanzi-writing-eligibility — RC2.3.4A.
 * HANZI_PEDAGOGICAL_ELIGIBILITY_PASS only with zero failures on real data.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadEligibilityRuntime, runEligibilityGate } from "./lib/hanzi-writing-eligibility.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadEligibilityRuntime(root);
const { failures, journeyWritingSteps } = runEligibilityGate(rt);
if (failures.length > 0) {
  console.error("FAIL validate:hanzi-writing-eligibility");
  for (const f of failures) console.error(`  - ${f.code} ${f.subject}: ${f.message}`);
  process.exit(1);
}
console.log(
  `PASS validate:hanzi-writing-eligibility — HANZI_PEDAGOGICAL_ELIGIBILITY_PASS · ${rt.verifiedRefs.length} referências · ${journeyWritingSteps} passos de escrita na Jornada, todos elegíveis`
);
