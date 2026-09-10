import { loadShoppingRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalShopping } from "./lib/china-survival-shopping-validation.mjs";
import { validateConversationDecisions } from "./lib/conversation-decisions-validation.mjs";

const data = loadShoppingRuntime();
const result = validateChinaSurvivalShopping(data);
const decisions = validateConversationDecisions(data);
result.decisions = decisions;
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["duo shao qian", "多少钱？", true],
  ["xian jin ke yi ma", "现金可以吗？", true],
  ["bu yao le", "不要了", true],
  ["wo yao zhe ge", "我要这个", true],
  ["wo hen hao", "多少钱？", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures, decisions: decisions.scenes }, null, 2));
if (result.failures.length || decisions.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_SHOPPING_ARC: shopping capabilities in independent runtime use.");
