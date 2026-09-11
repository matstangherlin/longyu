#!/usr/bin/env node
import { validateLessonUiConsistency } from "./lib/v498b2-gates.mjs";

const { failures } = validateLessonUiConsistency();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:lesson-ui-consistency");
}
