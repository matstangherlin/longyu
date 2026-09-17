#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateRc2CandidateDrift } from "./lib/rc2-content-freeze.mjs";

function kill(label, data, code) {
  const { failures } = validateRc2CandidateDrift(data);
  assert.ok(failures.some((f) => f.code === code), `${label} → ${code}; got ${failures.map((f) => f.code)}`);
  console.log(`KILLED ${label}: ${code}`);
}

{
  const { failures } = validateRc2CandidateDrift({
    candidateManifest: { status: "PREPARING" },
    operationalChecks: { release_candidate_sha: "", checks: {} },
  });
  assert.equal(failures.length, 0);
  console.log("PASS positive drift (preparing)");
}

kill("stale evidence SHA", {
  candidateManifest: { status: "DEPLOYED", candidateSha: "cand-aaa" },
  operationalChecks: {
    release_candidate_sha: "cand-aaa",
    checks: {
      cloud_auth: { pass: true, commitSha: "old-bbb", testedAt: "x", environment: "qa" },
    },
  },
}, "STALE_EVIDENCE");

kill("runtime drift reusing evidence", {
  candidateManifest: { status: "DEPLOYED", candidateSha: "cand-aaa" },
  operationalChecks: { release_candidate_sha: "cand-aaa", checks: {} },
  runtimeHeadSha: "newer-ccc",
  reuseOldEvidence: true,
}, "RUNTIME_DRIFT");

console.log("PASS test:rc2-candidate-drift");
