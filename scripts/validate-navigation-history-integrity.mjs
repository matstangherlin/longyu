#!/usr/bin/env node
import { validateNavigationHistoryIntegrity } from "./lib/rc1-2-gates.mjs";

const { failures } = validateNavigationHistoryIntegrity();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:navigation-history-integrity");
}
