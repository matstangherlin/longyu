#!/usr/bin/env node
/**
 * smoke:rc — fast RC identity + learning surface smoke (no network writes).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const candidate = readJson("docs/release/rc-candidate.json");
const pkg = readJson("package.json");
const truth = readJson("docs/release/product-truth.json");
const fp = journeyFingerprint(root);
const errors = [];

if (candidate.rcId !== "RC2.3.12-RC1") errors.push("RC_ID");
if (candidate.version !== pkg.version) errors.push("VERSION");
if (candidate.fingerprint !== fp) errors.push("FINGERPRINT");
if (truth.product?.lessons !== 134) errors.push("LESSONS");
if (truth.product?.teachingTopics !== 113) errors.push("TOPICS");
if (candidate.commercialMode !== "TEST") errors.push("COMMERCIAL");
if (candidate.liveMonetization) errors.push("LIVE");
if (!fs.existsSync(path.join(root, "docs/release/RC_CHANGE_POLICY.md"))) errors.push("FREEZE_POLICY");
if (!fs.existsSync(path.join(root, "src/commercial/monetizationMode.ts"))) errors.push("MONETIZATION_MODE");

// Route/module presence (static)
for (const rel of [
  "src/features/pro/ProPage.tsx",
  "src/components/pro/ProPaywall.tsx",
  "src/lib/entitlements.ts",
  "src/commercial/billing.ts",
]) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`MISSING:${rel}`);
}

if (errors.length) {
  console.error("FAIL smoke:rc", errors.join(", "));
  process.exit(1);
}
console.log(
  `PASS smoke:rc · ${candidate.rcId} · sha=${sha.slice(0, 7)} · v${candidate.version} · vc${candidate.versionCode} · fp=${fp} · status=${candidate.status}`
);
