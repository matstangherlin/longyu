#!/usr/bin/env node
/**
 * CI npm audit with documented allowlist for vulns that have no upstream patch yet.
 *
 * Policy:
 * - Production audit must stay clean (handled separately in workflow).
 * - Full audit may allow ONLY GHSA IDs listed in docs/release/security-audit-allowlist.json
 *   with decision ACCEPTED_PENDING_UPSTREAM and shippedToUsers=false.
 * - Packages that are only flagged because they depend on an allowlisted package
 *   (via: ["braces"]) are also allowed — they are the same finding.
 * - Any other vulnerability fails the job (no silent ignore).
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowlistPath = path.join(root, "docs/release/security-audit-allowlist.json");

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const ghsa = new Set(
    (raw.entries ?? [])
      .filter((e) => e.decision === "ACCEPTED_PENDING_UPSTREAM" && e.shippedToUsers === false)
      .flatMap((e) => (e.advisories ?? []).map((id) => id.toUpperCase()))
  );
  const packages = new Set(
    (raw.entries ?? [])
      .filter((e) => e.decision === "ACCEPTED_PENDING_UPSTREAM" && e.shippedToUsers === false)
      .map((e) => e.package)
  );
  return { raw, ghsa, packages };
}

function viaNamesAndGhsa(via) {
  const names = [];
  const ghsa = [];
  for (const item of via ?? []) {
    if (typeof item === "string") {
      names.push(item);
      continue;
    }
    if (item.name) names.push(item.name);
    const url = item.url ?? "";
    const m = url.match(/GHSA-[a-z0-9-]+/i);
    if (m) ghsa.push(m[0].toUpperCase());
  }
  return { names, ghsa };
}

function isAllowed(name, vulns, allow, visiting = new Set()) {
  if (allow.packages.has(name)) return true;
  if (visiting.has(name)) return true;
  visiting.add(name);
  const row = vulns[name];
  if (!row) return false;
  const { names, ghsa } = viaNamesAndGhsa(row.via);
  if (ghsa.length > 0 && ghsa.every((id) => allow.ghsa.has(id))) return true;
  if (names.length > 0 && names.every((dep) => isAllowed(dep, vulns, allow, visiting))) return true;
  return false;
}

function main() {
  const allow = loadAllowlist();
  const res = spawnSync("npm", ["audit", "--json", "--audit-level=moderate"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(res.stdout || "{}");
  } catch {
    console.error("ci-npm-audit: failed to parse npm audit JSON");
    console.error(res.stderr || res.stdout);
    process.exit(1);
  }

  const vulns = report.vulnerabilities ?? {};
  const blockers = [];
  for (const [name, row] of Object.entries(vulns)) {
    if (isAllowed(name, vulns, allow)) {
      const { ghsa, names } = viaNamesAndGhsa(row.via);
      console.log(`ALLOWLISTED ${name}: ${ghsa.join(", ") || names.join(" → ")}`);
      continue;
    }
    blockers.push({
      name,
      severity: row.severity,
      via: viaNamesAndGhsa(row.via),
    });
  }

  if (blockers.length) {
    console.error("ci-npm-audit FAIL — unallowlisted vulnerabilities:");
    for (const b of blockers) {
      console.error(` - ${b.name} (${b.severity}) ${JSON.stringify(b.via)}`);
    }
    process.exit(1);
  }

  console.log(
    "ci-npm-audit PASS (production-shipped risk unchanged; allowlisted pending-upstream only)"
  );
  process.exit(0);
}

main();
