#!/usr/bin/env node
/**
 * gate:beta-wave2-entry | gate:beta-wave3-entry | gate:closed-beta-exit
 * Refuse expansion / exit while closed-beta-entry ≠ GO.
 *
 * Cohort gates consume human-confirmed P0/P1 counts from beta-health.json
 * (health.p0 / health.p1Core). Raw Jev ai_p_candidate / ai_severity alone
 * must NEVER authorize 10→50 or 50→200.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2]; // wave2 | wave3 | exit
const entry = JSON.parse(fs.readFileSync(path.join(root, "docs/release/closed-beta-entry-criteria.json"), "utf8"));
const health = fs.existsSync(path.join(root, "docs/beta/beta-health.json"))
  ? JSON.parse(fs.readFileSync(path.join(root, "docs/beta/beta-health.json"), "utf8"))
  : { p0: 0, p1Core: 0, wave: 0 };

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (entry.result !== "GO") {
  fail(`HOLD: closed-beta-entry is ${entry.result} — no Wave expansion and no launch-candidate exit`);
}

if (mode === "wave2") {
  if ((health.wave ?? 0) < 1) fail("HOLD: Wave 1 not completed");
  if ((health.p0 ?? 0) > 0) fail("NO_GO: P0 open");
  if ((health.p1Core ?? 0) > 0) fail("NO_GO: P1 core open");
  console.log("WAVE2_ENTRY=GO");
} else if (mode === "wave3") {
  if ((health.wave ?? 0) < 2) fail("HOLD: Wave 2 not completed");
  if ((health.p0 ?? 0) > 0) fail("NO_GO: P0 open");
  console.log("WAVE3_ENTRY=GO");
} else if (mode === "exit") {
  if ((health.wave ?? 0) < 3) fail("HOLD_BETA: Wave 3 not completed");
  if ((health.p0 ?? 0) > 0) fail("NO_GO: P0 open");
  console.log("BETA_EXIT_GATE=GO_LAUNCH_CANDIDATE");
} else {
  fail("use wave2 | wave3 | exit");
}
process.exit(0);
