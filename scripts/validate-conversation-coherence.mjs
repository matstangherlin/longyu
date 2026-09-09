import fs from "node:fs";
import path from "node:path";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationCoherence } from "./lib/conversation-coherence-validation.mjs";

const data = loadIntegratedLearningRuntime();
const { failures, audits } = validateConversationCoherence(data);
const lines = [
  "# Conversation coherence audit",
  "",
  `Cenas: ${audits.length}.`,
  "",
];
for (const audit of audits) {
  lines.push(`## ${audit.sceneId}`, "");
  lines.push(`- intent: ${audit.intent}`);
  lines.push(`- ending: ${audit.ending}`);
  lines.push(`- last interaction: ${audit.lastInteractionType || "(none)"}`);
  lines.push("");
  for (const turn of audit.turns) {
    lines.push(`### ${turn.id}`, "");
    lines.push(`- NPC_UTTERANCE: ${turn.npc}`);
    lines.push(`- MEANING: ${turn.meaning}`);
    lines.push(`- PROMPT: ${turn.prompt}`);
    lines.push(`- EXPECTED_RESPONSE: ${turn.expected}`);
    lines.push(`- ACCEPTS: ${turn.accepts.join(" | ") || "(none)"}`);
    lines.push(`- NEXT_TURN: ${turn.next}`);
    lines.push(`- REPAIR: ${turn.repair || "(none)"}`);
    lines.push(`- speechAct: ${turn.speechAct || "(undeclared)"} → ${turn.expectedResponseAct || "(undeclared)"} (${turn.repairType || "no repairType"})`);
    lines.push(`- CLASS: ${turn.labels.join(", ")}`);
    lines.push("");
  }
}
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(path.join("reports", "conversation-coherence.md"), lines.join("\n"));
console.log(JSON.stringify({ failures, scenes: audits.length }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PASS validate:conversation-coherence (${audits.length} scenes)`);
