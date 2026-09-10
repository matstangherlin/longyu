import { loadMobilityRuntime, require } from "./lib/v495a-runtime.mjs";
import { validateChinaSurvivalMobility } from "./lib/china-survival-mobility-validation.mjs";
import { validateConversationDecisions } from "./lib/conversation-decisions-validation.mjs";

const data = loadMobilityRuntime();
const result = validateChinaSurvivalMobility(data);
const decisions = validateConversationDecisions(data);
result.decisions = decisions.scenes.filter((id) => ["imersao-estacao", "pegar-taxi"].includes(id));
const { evaluateLearnerResponse } = require("../../src/lib/learnerResponse.ts");
for (const [draft, answer, expected] of [
  ["di tie zhan zai na li", "地铁站在哪里？", true],
  ["zen me zou", "怎么走？", true],
  ["wo yao qu jiu dian", "我要去酒店", true],
  ["zai zhe li ting che", "在这里停车", true],
  ["wo hen hao", "怎么走？", false],
]) {
  if (evaluateLearnerResponse({ draft, acceptedAnswers: [answer] }).accepted !== expected) {
    result.failures.push({ code: "RESPONSE", message: draft });
  }
}
console.log(JSON.stringify({ failures: result.failures, decisions: result.decisions }, null, 2));
if (result.failures.length) process.exitCode = 1;
else console.log("PASS CHINA_SURVIVAL_MOBILITY_ARC: mobility capabilities in independent runtime use.");
