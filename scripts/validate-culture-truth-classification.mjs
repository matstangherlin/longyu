import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureTruthClassification } from "./lib/culture-truth-classification-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureTruthClassification(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-truth-classification");
