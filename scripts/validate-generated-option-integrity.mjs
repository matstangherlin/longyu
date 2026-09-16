#!/usr/bin/env node
import { validateGeneratedOptionIntegrity } from "./lib/rc1-4-gates.mjs";
const result = validateGeneratedOptionIntegrity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:generated-option-integrity");
}
