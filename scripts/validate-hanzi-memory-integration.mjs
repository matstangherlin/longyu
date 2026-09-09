import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateHanziMemoryIntegration } from "./lib/hanzi-memory-validation.mjs";

const result = validateHanziMemoryIntegration(loadIntegratedLearningRuntime());
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS validate:hanzi-memory-integration");
