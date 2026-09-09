#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureDistribution } from "./lib/culture-distribution-validation.mjs";

const data = loadCultureRuntime();
const { failures, touchpoints, eligibleUnits } = validateCultureDistribution(data);
console.log(JSON.stringify({ failures, touchpoints, eligibleUnits }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-distribution (${touchpoints} touchpoints, ${eligibleUnits} eligible units)`);
