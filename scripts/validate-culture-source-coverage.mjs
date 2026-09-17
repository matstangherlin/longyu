import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureSourceCoverage } from "./lib/culture-source-coverage-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureSourceCoverage(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-source-coverage (${data.items.length} items)`);
