#!/usr/bin/env node
import { validateVictoryMinimalism } from "./lib/rc1-1-gates.mjs";

const { failures } = validateVictoryMinimalism();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:victory-minimalism");
}
