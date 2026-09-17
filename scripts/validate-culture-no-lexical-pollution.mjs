import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureNoLexicalPollution } from "./lib/culture-no-lexical-pollution-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureNoLexicalPollution(data);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-no-lexical-pollution");
