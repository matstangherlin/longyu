#!/usr/bin/env node
import { validateReviewAnswerIntegrity } from "./lib/rc1-3-gates.mjs";

const result = validateReviewAnswerIntegrity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:review-answer-integrity` + (result.scanned != null ? ` · ${result.scanned} itens varridos` : ""));
}
