#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureTeachBeforeTest } from "./lib/culture-teaching-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureTeachBeforeTest(data);
console.log(JSON.stringify({ failures, missions: count }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-teach-before-test (${count} missions)`);
