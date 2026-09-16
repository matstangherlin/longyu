#!/usr/bin/env node
import { validateRc14CurriculumTopology } from "./lib/rc1-4-gates.mjs";
const result = validateRc14CurriculumTopology();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:rc14-curriculum-topology");
}
