#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureGamification } from "./lib/culture-gamification-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureGamification(data);
console.log(JSON.stringify({ failures, missions: count, seals: data.seals.length }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-gamification (${count} missions, ${data.seals.length} seals)`);
