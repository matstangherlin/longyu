import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureFestivalDatePolicy } from "./lib/culture-festival-date-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureFestivalDatePolicy(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-festival-date-policy`);
