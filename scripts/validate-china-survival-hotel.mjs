import { loadHotelRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalHotel } from "./lib/china-survival-hotel-validation.mjs";

const data = loadHotelRuntime();
const result = validateChinaSurvivalHotel(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["wo you yu ding", "我有预订", true],
  ["wo de fang jian zai na li", "我的房间在哪里？", true],
  ["zhe shi wo de hu zhao", "这是我的护照", true],
  ["wo hen hao", "我有预订", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_HOTEL_ARC: hotel check-in capabilities in independent runtime use.");
