import { loadShoppingRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationDecisions } from "./lib/conversation-decisions-validation.mjs";

const data = loadShoppingRuntime();
const result = validateConversationDecisions(data);
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS conversation decisions: valid replies do not take the error branch.");
