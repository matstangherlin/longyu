#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyPlacement } from "./lib/v498b2-gates.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureJourneyPlacement(data);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:culture-journey-placement");
}
