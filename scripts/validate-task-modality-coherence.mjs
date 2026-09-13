#!/usr/bin/env node
import { validateTaskModalityCoherence } from "./lib/rc1-1-gates.mjs";

const { failures } = validateTaskModalityCoherence();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:task-modality-coherence");
}
