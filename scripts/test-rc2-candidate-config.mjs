#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateRc2CandidateConfig } from "./lib/rc2-content-freeze.mjs";

function kill(label, manifest, code) {
  const { failures } = validateRc2CandidateConfig({ candidateManifest: manifest });
  assert.ok(failures.some((f) => f.code === code), `${label} → ${code}; got ${failures.map((f) => f.code)}`);
  console.log(`KILLED ${label}: ${code}`);
}

{
  const { failures } = validateRc2CandidateConfig({
    candidateManifest: { status: "BLOCKED", blocker: "no QA credentials" },
  });
  assert.equal(failures.length, 0);
  console.log("PASS positive BLOCKED config");
}

kill("deploy-preview local", {
  status: "DEPLOYED",
  candidateSha: "abc",
  deploymentUrl: "https://example.netlify.app",
  backendMode: "local",
  fixtures: false,
  environment: "qa",
  contentFreezeSha: "x",
  fingerprint: "ef3d300ef2b9",
}, "LOCAL_BACKEND");

kill("fixtures true", {
  status: "DEPLOYED",
  candidateSha: "abc",
  deploymentUrl: "https://example.netlify.app",
  backendMode: "supabase",
  fixtures: true,
  environment: "qa",
  contentFreezeSha: "x",
  fingerprint: "ef3d300ef2b9",
}, "FIXTURES_ON");

kill("environment production", {
  status: "DEPLOYED",
  candidateSha: "abc",
  deploymentUrl: "https://example.netlify.app",
  backendMode: "supabase",
  fixtures: false,
  environment: "production",
  contentFreezeSha: "x",
  fingerprint: "ef3d300ef2b9",
}, "PROD_QA");

kill("missing sha when deployed", {
  status: "DEPLOYED",
  deploymentUrl: "https://example.netlify.app",
  backendMode: "supabase",
  fixtures: false,
  environment: "qa",
  contentFreezeSha: "x",
  fingerprint: "ef3d300ef2b9",
}, "MISSING_SHA");

console.log("PASS test:rc2-candidate-config");
