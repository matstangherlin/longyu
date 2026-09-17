import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureHubCollections } from "./lib/culture-hub-collections-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureHubCollections(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-hub-collections");
