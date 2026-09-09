#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureMissions } from "./lib/culture-missions-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureMissions(data);
console.log(JSON.stringify({ failures, missions: count, stats: data.missionStats }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-missions (${count} missions)`);
