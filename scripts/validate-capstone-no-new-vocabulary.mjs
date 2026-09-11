import { loadCapstoneRuntime } from "./lib/v495a-runtime.mjs";
import { validateCapstoneNoNewVocabulary } from "./lib/capstone-no-new-vocabulary-validation.mjs";

const data = loadCapstoneRuntime();
const result = validateCapstoneNoNewVocabulary(data);
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS capstone-no-new-vocabulary: zero newRefs, prior teach only.");
