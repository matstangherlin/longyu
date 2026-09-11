import { loadHealthRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalHealth } from "./lib/china-survival-health-validation.mjs";

const data = loadHealthRuntime();
const result = validateChinaSurvivalHealth(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["wo bu shu fu", "我不舒服", true],
  ["wo tou teng", "我头疼", true],
  ["wo fa shao le", "我发烧了", true],
  ["wo xu yao yi sheng", "我需要医生", true],
  ["yi yuan zai na li", "医院在哪里？", true],
  ["wo hen hao", "我不舒服", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_HEALTH_ARC: unwell → symptom → doctor → hospital in independent use.");
