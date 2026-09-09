#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureExplanationDepth } from "./lib/culture-explanation-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureExplanationDepth(data);
console.log(JSON.stringify({ failures, missions: count }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-explanation-depth (${count} missions)`);
