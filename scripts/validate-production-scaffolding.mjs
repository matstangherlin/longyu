#!/usr/bin/env node
import fs from "node:fs";
import { loadHotelRuntime } from "./lib/v495a-runtime.mjs";
import { validateProductionScaffolding } from "./lib/v498b1-gates.mjs";

const data = loadHotelRuntime();
const result = validateProductionScaffolding(data);
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASS validate:production-scaffolding");
}
void fs;
