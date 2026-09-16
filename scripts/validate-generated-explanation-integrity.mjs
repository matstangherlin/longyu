#!/usr/bin/env node
import { validateGeneratedExplanationIntegrity } from "./lib/rc1-4-gates.mjs";
const result = validateGeneratedExplanationIntegrity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:generated-explanation-integrity");
}
