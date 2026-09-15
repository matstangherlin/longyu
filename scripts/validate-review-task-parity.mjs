#!/usr/bin/env node
import { validateReviewTaskParity } from "./lib/rc1-3-gates.mjs";

const result = validateReviewTaskParity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:review-task-parity` + (result.scanned != null ? ` · ${result.scanned} itens varridos` : ""));
}
