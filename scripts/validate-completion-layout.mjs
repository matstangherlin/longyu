#!/usr/bin/env node
import { validateCompletionLayout } from "./lib/rc1-3-gates.mjs";

const result = validateCompletionLayout();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:completion-layout`);
}
