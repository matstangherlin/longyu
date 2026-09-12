import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateCapstoneTransfer } from "./lib/capstone-transfer-validation.mjs";

const data = loadCapstoneRuntime();
const result = validateCapstoneTransfer(data);
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS capstone-transfer: 我要 / 在哪里 / 请问 across contexts.");
