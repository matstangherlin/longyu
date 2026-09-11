#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateConversationAutoReveal } from "./lib/v498b2-gates.mjs";

assert.equal(validateConversationAutoReveal().failures.length, 0, "positive control");

function killed(label, data, code) {
  const failures = validateConversationAutoReveal(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed(
  "tap to reveal returns",
  { conversationPlayerSource: `Ouça e toque para revelar\ndata-conversation-auto-reveal` },
  "TAP_REVEAL"
);
killed(
  "NPC hides text again",
  { conversationPlayerSource: `function SpeechBubble(){ return <div>hanzi</div> }` },
  "AUTO_REVEAL"
);

console.log("PASS test:conversation-auto-reveal");
