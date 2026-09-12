import { loadEverydayRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalEveryday } from "./lib/china-survival-everyday-validation.mjs";

const data = loadEverydayRuntime();
const result = validateChinaSurvivalEveryday(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["wo hen hao ni ne", "我很好。你呢？", true],
  ["ni ne", "你呢", true],
  ["ming tian jian", "明天见", true],
  ["zai jian", "再见", true],
  ["wo bu shu fu", "我很好", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_EVERYDAY_ARC: greet → 你呢 → weather → plan → repair → close.");
