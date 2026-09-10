import { loadAirportRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalAirport } from "./lib/china-survival-airport-validation.mjs";

const data = loadAirportRuntime();
const result = validateChinaSurvivalAirport(data);
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["zhe shi wo de hu zhao", "这是我的护照", true],
  ["deng ji kou zai na li", "登机口在哪里？", true],
  ["qing zai shuo yi bian", "请再说一遍", true],
  ["wo hen hao", "登机口在哪里？", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_AIRPORT_ARC: airport survival capabilities in independent runtime use.");
