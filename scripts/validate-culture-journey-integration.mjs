#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyIntegration } from "./lib/culture-journey-integration-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureJourneyIntegration(data);
console.log(JSON.stringify({ failures, bridges: count }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-journey-integration (${count} bridges)`);
