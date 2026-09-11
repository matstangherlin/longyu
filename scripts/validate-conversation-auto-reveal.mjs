#!/usr/bin/env node
import { validateConversationAutoReveal } from "./lib/v498b2-gates.mjs";

const { failures } = validateConversationAutoReveal();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:conversation-auto-reveal");
}
