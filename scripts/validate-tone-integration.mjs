import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateToneIntegration } from "./lib/tone-integration-validation.mjs";

const result = validateToneIntegration(loadIntegratedLearningRuntime());
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS validate:tone-integration");
