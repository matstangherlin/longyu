#!/usr/bin/env node
/**
 * RC2.3.9 — writes docs/release/gate-registry.json (or --check: committed == generated).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildGateRegistry } from "./lib/gate-registry.mjs";
import { SUITES } from "./release/canonical-suites.mjs";
import { GATE_REGISTRY_SOURCES, digestFiles } from "./release/evidence-digest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel, fallback) => (fs.existsSync(path.join(root, rel)) ? JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) : fallback);

export function currentGateRegistry() {
  const timingRows = read("docs/release/beta-baseline-timing.json", { leaves: [] }).leaves ?? [];
  const registry = buildGateRegistry({
    scripts: read("package.json", {}).scripts,
    suites: SUITES,
    invariants: read("docs/release/invariant-ownership.json", { invariants: {} }).invariants,
    retirements: read("docs/release/gate-retirements.json", { retirements: [] }).retirements,
    timings: Object.fromEntries(timingRows.map((row) => [row.command, row.ms])),
  });
  registry.evidenceDigest = digestFiles(root, GATE_REGISTRY_SOURCES);
  return registry;
}

const target = path.join(root, "docs/release/gate-registry.json");
if (import.meta.url === `file://${process.argv[1]}`) {
  const registry = currentGateRegistry();
  const text = `${JSON.stringify(registry, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== text) {
      console.error("FAIL GATE_REGISTRY_STALE: docs/release/gate-registry.json differs from the generated registry — run npm run generate:gate-registry");
      process.exit(1);
    }
    console.log(`PASS gate registry fresh · ${registry.total} gates · ${JSON.stringify(registry.counts)}`);
  } else {
    fs.writeFileSync(target, text);
    console.log(`gate registry written · ${registry.total} gates · ${JSON.stringify(registry.counts)}`);
  }
}
