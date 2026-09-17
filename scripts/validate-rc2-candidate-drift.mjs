#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadRc2CandidateManifest, validateRc2CandidateDrift } from "./lib/rc2-content-freeze.mjs";

const root = process.cwd();
const operationalChecks = JSON.parse(
  fs.readFileSync(path.join(root, "docs/release/rc1-operational-checks.json"), "utf8")
);
const candidateManifest = loadRc2CandidateManifest(root) ?? { status: "PREPARING" };

const { failures } = validateRc2CandidateDrift({
  candidateManifest,
  operationalChecks,
  runtimeHeadSha: process.env.RC2_RUNTIME_HEAD || "",
  reuseOldEvidence: process.env.RC2_REUSE_OLD_EVIDENCE === "1",
});

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:rc2-candidate-drift — status ${candidateManifest.status}`);
}
