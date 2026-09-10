import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureNativeLessons } from "./lib/culture-native-validation.mjs";

const data = loadCultureRuntime();
const { failures } = validateCultureNativeLessons(data);
console.log(JSON.stringify({ failures, lessons: (data.nativeLessons ?? []).length }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:culture-native-lessons (${data.nativeLessons.length} lessons)`);
