import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalCapstone } from "./lib/china-survival-capstone-validation.mjs";

const data = loadCapstoneRuntime();
const result = validateChinaSurvivalCapstone(data);
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_CAPSTONE: three variants, transfer, speaking, repair.");
