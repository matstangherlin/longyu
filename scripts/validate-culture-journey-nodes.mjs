import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyNodes } from "./lib/culture-native-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureJourneyNodes(data);
console.log(JSON.stringify({ failures, nodes: (data.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON").length }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-journey-nodes");
