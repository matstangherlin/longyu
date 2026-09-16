#!/usr/bin/env node
import { validateGeneratedAudioIntegrity } from "./lib/rc1-4-gates.mjs";
const result = validateGeneratedAudioIntegrity();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:generated-audio-integrity");
}
