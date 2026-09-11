import { loadHealthRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalEmergency } from "./lib/china-survival-health-validation.mjs";

const data = loadHealthRuntime();
const result = validateChinaSurvivalEmergency(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["wo xu yao bang zhu", "我需要帮助", true],
  ["wo xu yao yi sheng", "我需要医生", true],
  ["yi yuan zai na li", "医院在哪里？", true],
  ["qing man yi dian", "请慢一点", true],
  ["wo hen hao", "我需要帮助", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_EMERGENCY_ARC: help → doctor → locate care.");
