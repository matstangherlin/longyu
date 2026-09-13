#!/usr/bin/env node
import { validateReleaseEvidenceFreshness } from "./lib/rc1-2-gates.mjs";

const { failures } = validateReleaseEvidenceFreshness();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:release-evidence-freshness");
}
