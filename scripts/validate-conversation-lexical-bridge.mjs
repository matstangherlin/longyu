#!/usr/bin/env node
import fs from "node:fs";
import { loadIntegratedLearningRuntime } from "./lib/v495a-runtime.mjs";
import { validateConversationLexicalBridge, writeBridgeReport } from "./lib/v498b1-gates.mjs";

const data = loadIntegratedLearningRuntime();
const result = validateConversationLexicalBridge(data);
writeBridgeReport(process.cwd(), { ...result, lessonCount: data.lessons.length });
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:conversation-lexical-bridge");
}
void fs;
