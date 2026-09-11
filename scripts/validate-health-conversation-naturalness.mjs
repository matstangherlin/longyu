import { loadHealthRuntime } from "./lib/v495a-runtime.mjs";
import { validateHealthConversationNaturalness } from "./lib/health-conversation-naturalness-validation.mjs";

const data = loadHealthRuntime();
const result = validateHealthConversationNaturalness(data);
console.log(JSON.stringify({ failures: result.failures, rows: result.rows }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS HEALTH_CONVERSATION_NATURALNESS: friend vs clinic roles and contextual repairs.");
