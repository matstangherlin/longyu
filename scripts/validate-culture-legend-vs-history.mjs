import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureLegendVsHistory } from "./lib/culture-truth-classification-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureLegendVsHistory(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-legend-vs-history");
