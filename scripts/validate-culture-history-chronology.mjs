import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureHistoryChronology } from "./lib/culture-history-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureHistoryChronology(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-history-chronology");
