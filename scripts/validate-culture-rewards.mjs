import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureRewards } from "./lib/v498a2-gates.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureRewards(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-rewards");
