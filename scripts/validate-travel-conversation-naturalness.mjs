import { loadTravelRuntime } from "./lib/v495a-runtime.mjs";
import { validateTravelConversationNaturalness } from "./lib/travel-conversation-naturalness-validation.mjs";

const data = loadTravelRuntime();
const result = validateTravelConversationNaturalness(data);
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS TRAVEL_CONVERSATION_NATURALNESS: hotel/airport continuity and transfer.");
