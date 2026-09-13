#!/usr/bin/env node
import { validateFeedbackAudio } from "./lib/rc1-1-gates.mjs";

const { failures } = validateFeedbackAudio();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:feedback-audio");
}
