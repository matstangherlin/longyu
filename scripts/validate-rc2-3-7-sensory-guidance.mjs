#!/usr/bin/env node
/** validate:rc2-3-7-sensory-guidance — RC2.3.7 gate on real sources. */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadSensoryRuntime, runSensoryGate } from "./lib/sensory-guidance-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadSensoryRuntime(root);
const failures = runSensoryGate(rt);
if (failures.length) {
  console.error("FAIL validate:rc2-3-7-sensory-guidance");
  for (const f of failures) console.error(`  - ${f.code} ${f.subject}: ${f.message}`);
  process.exit(1);
}
console.log(`PASS validate:rc2-3-7-sensory-guidance — ${rt.guidance.GUIDANCE_DEFINITIONS.length} orientações · ${Object.keys(rt.messages.pt).length} textos PT sem jargão · sensorial/guidance/retorno OK`);
