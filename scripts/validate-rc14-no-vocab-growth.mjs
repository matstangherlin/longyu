#!/usr/bin/env node
import { validateRc14NoVocabGrowth } from "./lib/rc1-4-gates.mjs";
const result = validateRc14NoVocabGrowth();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:rc14-no-vocab-growth");
}
