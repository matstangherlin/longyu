#!/usr/bin/env node
/** RC2.3.9 — gate:rc2-3-9-stack-convergence (validate half): real repo, zero findings. */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runConvergenceChecks } from "./lib/stack-convergence-gates.mjs";
import { loadConvergenceRuntime } from "./release/convergence-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadConvergenceRuntime(root);
const errors = runConvergenceChecks(rt);
for (const e of errors) console.error(`FAIL ${e.code}: ${e.detail}`);
if (errors.length) {
  console.error(`\nvalidate:rc2-3-9-stack-convergence — ${errors.length} finding(s)`);
  process.exit(1);
}
const steps = rt.suites.reduce((n, s) => n + s.steps.length, 0);
console.log(
  `PASS validate:rc2-3-9-stack-convergence · ${rt.suites.length} suites · ${steps} steps · legacy ${rt.legacy.topLevelSteps.length} steps / ${rt.legacy.uniqueLeaves.length} leaves covered · ${Object.keys(rt.invariants).length} invariants owned · registry ${rt.registry.generated.total} gates · product truth fresh`
);
