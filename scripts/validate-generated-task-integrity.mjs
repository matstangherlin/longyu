#!/usr/bin/env node
import { validateGeneratedTaskIntegrity } from "./lib/rc1-4-gates.mjs";
const result = validateGeneratedTaskIntegrity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `PASS validate:generated-task-integrity · plans=${result.plans} tasks=${result.tasks} traced=${result.traced} mismatches=${result.mismatches}`
  );
}
