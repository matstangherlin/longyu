#!/usr/bin/env node
import { validateReviewHelpParity } from "./lib/rc1-3-gates.mjs";

const result = validateReviewHelpParity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:review-help-parity` + (result.scanned != null ? ` · ${result.scanned} itens varridos` : ""));
}
