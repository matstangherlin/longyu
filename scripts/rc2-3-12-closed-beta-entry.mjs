#!/usr/bin/env node
/**
 * npm run gate:closed-beta-entry → GO | NO_GO | OWNER_ACTION_REQUIRED
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const criteriaPath = path.join(root, "docs/release/closed-beta-entry-criteria.json");
const criteria = JSON.parse(fs.readFileSync(criteriaPath, "utf8"));
const candidate = JSON.parse(fs.readFileSync(path.join(root, "docs/release/rc-candidate.json"), "utf8"));

const required = criteria.betaRequired ?? {};
const failures = [];
const owner = [];

for (const [key, status] of Object.entries(required)) {
  if (status === "PASS" || status === "CODE_READY") continue;
  if (status === "CONFIG_REQUIRED" || status === "OWNER_ACTION_REQUIRED" || status === "NOT_RUN" || status === "PENDING") {
    owner.push(`${key}=${status}`);
  } else if (status === "FAIL" || status === "BLOCKED") {
    failures.push(`${key}=${status}`);
  } else {
    owner.push(`${key}=${status}`);
  }
}

if (candidate.liveMonetization === true) failures.push("LIVE_MONETIZATION_ENABLED");
if (criteria.commercialMode === "LIVE") failures.push("BETA_LIVE_COMMERCIAL");

let result = "OWNER_ACTION_REQUIRED";
if (failures.length) result = "NO_GO";
else if (owner.length === 0 && criteria.hostedCi === "PASS" && candidate.status === "BETA_READY") {
  result = "GO";
}

criteria.result = result;
criteria.evaluatedAt = new Date().toISOString();
fs.writeFileSync(criteriaPath, JSON.stringify(criteria, null, 2) + "\n");

console.log(`CLOSED_BETA_ENTRY=${result}`);
if (failures.length) {
  console.log("NO-GO blockers:");
  for (const f of failures.slice(0, 12)) console.log(`- ${f}`);
}
if (owner.length) {
  console.log("Owner / pending:");
  for (const o of owner.slice(0, 20)) console.log(`- ${o}`);
}
if (result === "NO_GO") process.exit(1);
process.exit(0);
