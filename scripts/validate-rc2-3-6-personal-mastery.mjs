#!/usr/bin/env node
/** validate:rc2-3-6-personal-mastery — RC2.3.6 gate on real data. */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { learnerProfiles, loadMasteryRuntime, runMasteryGate } from "./lib/personal-mastery-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadMasteryRuntime(root);
const failures = runMasteryGate(rt);
if (failures.length) {
  console.error("FAIL validate:rc2-3-6-personal-mastery");
  for (const f of failures) console.error(`  - ${f.code} ${f.subject}: ${f.message}`);
  process.exit(1);
}
const audit = rt.auditGraph(rt.graph);
const profiles = learnerProfiles(rt);
console.log(`PASS validate:rc2-3-6-personal-mastery — grafo ${audit.targets} alvos / ${audit.relations} relações · 0 ciclos · KNOWLEDGE_GRAPH_CURRICULUM_LEAK=0 · perfis ${profiles.filter((p) => p.pass).length}/${profiles.length}`);
