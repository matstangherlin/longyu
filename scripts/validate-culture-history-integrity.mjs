import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureHistoryIntegrity } from "./lib/culture-history-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureHistoryIntegrity(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-history-integrity (${(data.items ?? []).filter((i) => i.kind === "history").length} history)`);
