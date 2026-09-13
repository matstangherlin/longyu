#!/usr/bin/env node
import { validateReviewAdvance } from "./lib/rc1-1-gates.mjs";

const { failures } = validateReviewAdvance();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:review-advance");
}
