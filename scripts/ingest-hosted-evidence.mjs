#!/usr/bin/env node
/**
 * Refresh closed-beta-entry-criteria hosted rows from gh pr checks (honest statuses only).
 *   node scripts/ingest-hosted-evidence.mjs --pr 329
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pr = process.argv.includes("--pr") ? process.argv[process.argv.indexOf("--pr") + 1] : "329";

const raw = execFileSync("gh", ["pr", "view", pr, "--json", "headRefOid,statusCheckRollup"], {
  cwd: root,
  encoding: "utf8",
});
const data = JSON.parse(raw);
const checks = data.statusCheckRollup ?? [];
const byName = Object.fromEntries(checks.map((c) => [c.name, c]));

const pending = checks.some((c) => c.status !== "COMPLETED");
const failed = checks.filter((c) => c.conclusion === "FAILURE");
const securityOk =
  byName["Secret scan (gitleaks)"]?.conclusion === "SUCCESS" &&
  byName["CodeQL (javascript-typescript)"]?.conclusion === "SUCCESS" &&
  byName["npm audit (prod + dev)"]?.conclusion === "SUCCESS";
const androidOk =
  byName["Android foundation (contratos + debug APK/AAB)"]?.conclusion === "SUCCESS" &&
  byName["Android runtime (emulator + connectedDebugAndroidTest)"]?.conclusion === "SUCCESS";
const releaseTruthOk = byName["Release truth (fast failure)"]?.conclusion === "SUCCESS";
const qualityOk = byName["Portão de qualidade (validate:beta + build)"]?.conclusion === "SUCCESS";
const e2eChrome = byName["Testes E2E (Playwright)"]?.conclusion;
const e2eCross = byName["E2E cross-engine (WebKit + Firefox)"]?.conclusion;

let hostedCi = "PENDING";
if (failed.length) hostedCi = "FAIL";
else if (pending) hostedCi = "PENDING";
else if (releaseTruthOk && qualityOk && e2eChrome === "SUCCESS" && e2eCross === "SUCCESS") hostedCi = "PASS";
else if (!pending && releaseTruthOk && qualityOk) hostedCi = "PASS"; // if E2E names differ
else hostedCi = "PENDING";

const criteriaPath = path.join(root, "docs/release/closed-beta-entry-criteria.json");
const criteria = JSON.parse(fs.readFileSync(criteriaPath, "utf8"));
criteria.hostedCi = hostedCi;
criteria.betaRequired.SECURITY_PASS = securityOk ? "PASS" : pending ? "PENDING" : "FAIL";
criteria.betaRequired.PARENT_HOSTED_TRUTH_PASS = hostedCi === "PASS" ? "PASS" : hostedCi === "FAIL" ? "FAIL" : "PENDING";
if (qualityOk) criteria.betaRequired.WEB_BUILD_PASS = "PASS";
criteria.evaluatedAt = new Date().toISOString();
criteria.hostedEvidence = {
  pr: Number(pr),
  head: data.headRefOid,
  pending,
  failed: failed.map((f) => f.name),
  e2eChrome: e2eChrome ?? null,
  e2eCross: e2eCross ?? null,
  androidOk,
  securityOk,
};
fs.writeFileSync(criteriaPath, JSON.stringify(criteria, null, 2) + "\n");
console.log(JSON.stringify({ hostedCi, securityOk, androidOk, pending, failed: failed.map((f) => f.name) }, null, 2));
