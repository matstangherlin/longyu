import { loadRestaurantRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalRestaurant } from "./lib/china-survival-restaurant-validation.mjs";

const data = loadRestaurantRuntime();
const result = validateChinaSurvivalRestaurant(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["wo yao mifan", "我要米饭", true],
  ["bu yao le", "不要了", true],
  ["maidan", "买单", true],
  ["liang wei", "两位", true],
  ["wo hen hao", "买单", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_RESTAURANT_ARC: restaurant capabilities in independent runtime use.");
