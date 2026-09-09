#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureContent } from "./lib/culture-content-validation.mjs";

const data = loadCultureRuntime();
const { failures, count } = validateCultureContent(data);
console.log(JSON.stringify({ failures, items: count }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-content (${count} items)`);
