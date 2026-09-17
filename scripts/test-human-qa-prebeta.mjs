#!/usr/bin/env node
/**
 * Mutation tests for human-qa-prebeta honesty gate.
 * Refuses automation inventing human PASS / external testers / formal flips.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertHumanQaPrebeta } from "./lib/human-qa-prebeta.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = assertHumanQaPrebeta(root);
assert.equal(baseline.ok, true, baseline.failures.join("; "));

const copyRel = [
  "docs/BETA_HUMAN_QA_RUNBOOK.md",
  "docs/BETA_BUG_LOG.md",
  "docs/release/beta-tester-instructions.md",
  "docs/release/human-qa-prebeta.json",
  "docs/reports/rc2-2-3-human-qa-prebeta.md",
  "index.html",
  "docs/REAL_DEVICE_QA.md",
  "docs/release/rc1-operational-checks.json",
  "docs/release/device-preflight.json",
  "docs/release/public-beta-core.json",
];

function withTempTree(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-human-qa-"));
  for (const rel of copyRel) {
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  }
  mutate(tmp);
  return assertHumanQaPrebeta(tmp);
}

function kill(label, mutate) {
  const result = withTempTree(mutate);
  assert.equal(result.ok, false, `${label} should FAIL`);
  console.log(`KILLED ${label}: ${result.failures[0]}`);
}

kill("automation marks founderQa PASS without evidence", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.founderQa = "PASS";
  data.status = "PASS_WITH_FINDINGS";
  data.p0Open = 0;
  data.automationMarkedHumanPass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("Playwright counted as tester", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.status = "PASS_WITH_FINDINGS";
  data.founderQa = "PASS";
  data.l1ToL20 = "PASS";
  data.p0Open = 0;
  data.humanEvidence = [{ tester: "playwright", sha: data.sha, date: "2026-09-17" }];
  data.playwrightCountedAsTester = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("seeded L1–L20 counted as human", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.status = "PASS_WITH_FINDINGS";
  data.l1ToL20 = "PASS";
  data.p0Open = 0;
  data.humanEvidence = [{ tester: "founder", sha: data.sha, date: "2026-09-17" }];
  data.l1ToL20Seeded = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("externalTesterCount=5 without records", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.externalTesterCount = 5;
  delete data.externalTesterRecords;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("P0 open with PASS_WITH_FINDINGS", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.status = "PASS_WITH_FINDINGS";
  data.p0Open = 1;
  data.humanEvidence = [{ tester: "founder", sha: data.sha, date: "2026-09-17" }];
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("P1 open without waiver on PASS", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.status = "PASS_WITH_FINDINGS";
  data.p0Open = 0;
  data.p1Open = 2;
  delete data.p1Waivers;
  data.humanEvidence = [{ tester: "founder", sha: data.sha, date: "2026-09-17" }];
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("Stripe required for Free Beta", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.stripeRequiredForFreeBeta = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("cloudStatus flipped to PASS by local human QA", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.cloudStatus = "PASS";
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("emulation flips android formalPass", (tmp) => {
  const p = path.join(tmp, "docs/release/device-preflight.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.android.formalPass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("pinch zoom re-blocked in index.html", (tmp) => {
  const p = path.join(tmp, "index.html");
  fs.writeFileSync(
    p,
    fs
      .readFileSync(p, "utf8")
      .replace(
        /content="width=device-width, initial-scale=1.0, viewport-fit=cover"/,
        'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"'
      )
  );
});

kill("iOS apple-mobile meta removed", (tmp) => {
  const p = path.join(tmp, "index.html");
  fs.writeFileSync(
    p,
    fs
      .readFileSync(p, "utf8")
      .replace(/<meta name="apple-mobile-web-app-capable"[^>]*>\s*/g, "")
      .replace(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>\s*/g, "")
  );
});

kill("ops json flips cloud_auth PASS from human local", (tmp) => {
  const p = path.join(tmp, "docs/release/rc1-operational-checks.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.checks.cloud_auth.pass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("fingerprint drift in manifest", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.fingerprint = "000000000000";
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("verdict flipped to GO", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.verdict = "GO";
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

console.log("PASS test:human-qa-prebeta");
