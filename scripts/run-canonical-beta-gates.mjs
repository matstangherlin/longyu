#!/usr/bin/env node
/**
 * RC2.3.9 — canonical beta runner (`npm run validate:beta`).
 *
 * Runs the canonical suites (scripts/release/canonical-suites.mjs) instead of a
 * 400-step `&&` string. Each leaf command runs ONCE per invocation (the old
 * chain re-ran typecheck 6× and the pedagogy freeze 5× through nested gates);
 * output is never hidden; a failure names suite, gate, invariant, owner and
 * exit code, and a machine-readable result is written for CI.
 *
 *   node scripts/run-canonical-beta-gates.mjs                 # every suite, in order
 *   node scripts/run-canonical-beta-gates.mjs --suite identity --suite hanzi
 *   node scripts/run-canonical-beta-gates.mjs --list
 *   node scripts/run-canonical-beta-gates.mjs --json reports/beta-gates.json
 */
import { spawnSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dedupeLeaves, expandChain } from "./lib/beta-chain.mjs";
import { SUITES } from "./release/canonical-suites.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts;

function parseArgs(argv) {
  const out = { suites: [], json: "reports/beta-gates.json", list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--suite") out.suites.push(argv[++i]);
    else if (arg === "--json") out.json = argv[++i];
    else if (arg === "--list") out.list = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function loadInvariantIndex() {
  const file = path.join(root, "docs/release/invariant-ownership.json");
  const byGate = new Map();
  if (!fs.existsSync(file)) return byGate;
  const { invariants } = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [id, inv] of Object.entries(invariants)) {
    for (const gate of [inv.owner, ...(inv.secondaryEvidence ?? [])]) {
      if (!byGate.has(gate)) byGate.set(gate, []);
      byGate.get(gate).push({ id, owner: inv.owner, introducedBy: inv.introducedBy, criticality: inv.criticality });
    }
  }
  return byGate;
}

/** Expands a suite step: a script name, or a raw command (e.g. with CLI args). */
function leavesForStep(step) {
  if (scripts[step] != null) return expandChain(scripts, step).leaves.map((leaf) => ({ ...leaf, step }));
  return [{ command: step, via: [], step }];
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const unknown = args.suites.filter((id) => !SUITES.some((suite) => suite.id === id));
  if (unknown.length) throw new Error(`unknown suite(s): ${unknown.join(", ")} — known: ${SUITES.map((s) => s.id).join(", ")}`);
  const selected = args.suites.length ? SUITES.filter((suite) => args.suites.includes(suite.id)) : SUITES;

  if (args.list) {
    for (const suite of selected) console.log(`${suite.id.padEnd(22)} ${String(suite.steps.length).padStart(4)} steps  ${suite.description}`);
    return;
  }

  const invariantsByGate = loadInvariantIndex();
  const seen = new Set();
  const result = { schemaVersion: 1, sha: gitSha(), startedAt: new Date().toISOString(), suites: [], failed: null, failedInvariant: null, dedupedExecutions: 0, durationMs: 0 };
  const t0 = Date.now();

  for (const suite of selected) {
    const suiteRow = { id: suite.id, domain: suite.domain, status: "PASS", durationMs: 0, steps: [] };
    result.suites.push(suiteRow);
    const s0 = Date.now();
    console.log(`\n▶ suite ${suite.id} — ${suite.description}`);
    for (const step of suite.steps) {
      const stepRow = { step, status: "PASS", durationMs: 0, leaves: 0, deduped: 0 };
      suiteRow.steps.push(stepRow);
      const { unique } = dedupeLeaves(leavesForStep(step));
      const st = Date.now();
      for (const leaf of unique) {
        if (seen.has(leaf.command)) {
          stepRow.deduped += 1;
          result.dedupedExecutions += 1;
          continue;
        }
        seen.add(leaf.command);
        stepRow.leaves += 1;
        const run = spawnSync("bash", ["-c", leaf.command], { cwd: root, stdio: "inherit", env: process.env });
        if (run.status !== 0) {
          const chain = [...leaf.via, leaf.command];
          const invariants = chain.flatMap((name) => invariantsByGate.get(name) ?? []);
          stepRow.status = "FAIL";
          suiteRow.status = "FAIL";
          result.failed = { suite: suite.id, gate: step, via: leaf.via, command: leaf.command, exitCode: run.status, signal: run.signal ?? null, invariants };
          result.failedInvariant = invariants[0]?.id ?? null;
          stepRow.durationMs = Date.now() - st;
          suiteRow.durationMs = Date.now() - s0;
          return finish(result, t0, args.json);
        }
      }
      stepRow.durationMs = Date.now() - st;
    }
    suiteRow.durationMs = Date.now() - s0;
    console.log(`✓ suite ${suite.id} (${Math.round(suiteRow.durationMs / 1000)}s)`);
  }
  return finish(result, t0, args.json);
}

function finish(result, t0, jsonPath) {
  result.durationMs = Date.now() - t0;
  if (jsonPath) {
    const target = path.resolve(root, jsonPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (result.failed) {
    const f = result.failed;
    console.error("\n✗ CANONICAL BETA GATE FAILED");
    console.error(`  suite:      ${f.suite}`);
    console.error(`  gate:       ${f.gate}`);
    console.error(`  via:        ${f.via.join(" → ") || "(direct)"}`);
    console.error(`  command:    ${f.command}`);
    console.error(`  exit code:  ${f.exitCode}${f.signal ? ` (signal ${f.signal})` : ""}`);
    if (f.invariants.length) {
      for (const inv of f.invariants) console.error(`  invariant:  ${inv.id} · owner ${inv.owner} · introduced by ${inv.introducedBy} · ${inv.criticality}`);
    } else {
      console.error("  invariant:  (no canonical invariant mapped — see docs/release/gate-registry.json)");
    }
    process.exitCode = 1;
    return;
  }
  console.log(`\n✓ canonical beta gates PASS · ${result.suites.length} suite(s) · ${Math.round(result.durationMs / 1000)}s · ${result.dedupedExecutions} duplicate execution(s) skipped`);
}

main();
