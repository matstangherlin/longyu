import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureStandardTasks } from "./lib/culture-native-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureStandardTasks(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-standard-tasks");
