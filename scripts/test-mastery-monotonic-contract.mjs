/**
 * V4.7.8 HOST-002 — offline mastery clamp contract.
 * Live cases run in rehearse:backend-contract (runMalformedMasteryMatrix).
 */
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const errors = [];
function assert(cond, message) {
  if (!cond) errors.push(message);
}

function clampMasteryLevel(raw) {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(4, Math.trunc(raw)));
  }
  if (typeof raw === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(raw)) {
    return Math.max(0, Math.min(4, Math.trunc(Number(raw))));
  }
  return 0;
}

const matrix = [
  [null, 0],
  ["", 0],
  ["abc", 0],
  [-1, 0],
  [5, 4],
  [999, 4],
  [2.5, 2],
  [0, 0],
  [4, 4],
  [3, 3],
  ["2", 2],
  ["2.9", 2],
];
for (const [input, expected] of matrix) {
  const got = clampMasteryLevel(input);
  assert(got === expected, `clamp(${JSON.stringify(input)})=${got} expected=${expected}`);
}

const frozen = fs.readFileSync(
  path.join(root, "supabase/migrations/20260828030000_progress_mastery_monotonic.sql"),
  "utf8"
);
assert(/set search_path = public/.test(frozen), "frozen V4.7.7 trigger still search_path=public");
assert(/nullif\(old_map -> key ->> 'level', ''\)::integer/.test(frozen), "frozen file keeps historical cast");

const clamp = fs.readFileSync(
  path.join(root, "supabase/migrations/20260828032249_progress_mastery_monotonic_clamp.sql"),
  "utf8"
);
assert(/VALID LEVELS = integer 0\.\.4/.test(clamp), "documents VALID LEVELS 0..4");
assert(/set search_path = ''/.test(clamp), "HOST-003 empty search_path");
assert(!/set search_path = public/.test(clamp), "clamp migration must not use search_path=public");
assert(/longyu_clamp_mastery_level/.test(clamp), "helper clamp exists");
assert(/jsonb_typeof/.test(clamp), "uses jsonb_typeof");
assert(clamp.includes("^-?[0-9]+(\\.[0-9]+)?$"), "numeric string regex");
assert(/before insert or update/.test(clamp), "INSERT and UPDATE");
assert(/revoke all on function public\.merge_progress_mastery_monotonic\(\) from public, anon, authenticated/.test(clamp), "revoke execute");
assert(/revoke all on function public\.longyu_clamp_mastery_level\(jsonb\) from public, anon, authenticated/.test(clamp), "revoke helper");
assert(!/nullif\([^)]*\)::integer/.test(clamp), "no crashing integer cast on text");
assert(/trunc\(n\)/.test(clamp), "trunc before clamp");
assert(!/pg_catalog\.greatest/.test(clamp), "GREATEST is a SQL keyword, not pg_catalog.greatest");
assert(!/pg_catalog\.least/.test(clamp), "LEAST is a SQL keyword, not pg_catalog.least");
assert(/Not applied to MandarimProject/.test(clamp), "no silent prod apply");

const harness = fs.readFileSync(path.join(root, "scripts/lib/v477-harness.mjs"), "utf8");
assert(/export async function runMalformedMasteryMatrix/.test(harness), "live malformed matrix");
assert(/insert-999-clamps-to-4/.test(harness), "live 999→4");
assert(/keep-2-when-abc/.test(harness), "live abc keeps 2");

const rehearse = fs.readFileSync(path.join(root, "scripts/rehearse-backend-contract.mjs"), "utf8");
assert(/runMalformedMasteryMatrix/.test(rehearse), "rehearsal calls malformed matrix");

if (errors.length) {
  console.error("FAIL test:mastery-monotonic-contract:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:mastery-monotonic-contract");
