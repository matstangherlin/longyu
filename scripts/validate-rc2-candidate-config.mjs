#!/usr/bin/env node
import { loadRc2CandidateManifest, validateRc2CandidateConfig } from "./lib/rc2-content-freeze.mjs";

const candidateManifest = loadRc2CandidateManifest(process.cwd());
if (!candidateManifest) {
  console.error("MISSING docs/release/rc2-candidate.json");
  process.exitCode = 1;
} else {
  const { failures } = validateRc2CandidateConfig({ candidateManifest });
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:rc2-candidate-config — status ${candidateManifest.status}`);
  }
}
