/**
 * V4.7.8B human gate. Zero MandarimProject writes.
 * Hosted scoreboard stays NOT_RUN. Does not invent PHYSICAL_QA / PAYMENTS / closed-beta PASS.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import { sha256File } from "./lib/schema-canonical.mjs";
import { localMigrationFiles, localSchemaHash, classifyMigrationDrift } from "./lib/migration-drift.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { LONGYU_BACKEND_RC, V478_PENDING_MIGRATIONS } from "./lib/v478-backend-rc.mjs";
import { V477_LOCAL_ONLY_CLASS } from "./lib/v477-constants.mjs";
import {
  V478B_APPROVAL_TOKEN,
  V478B_BACKUP_GATE,
  V478B_HOSTED_SCOREBOARD_KEYS,
  V478B_INSEPARABLE_PAIRS,
  V478B_MAIN_SHA,
  V478B_PRODUCTION_PROJECT_ID,
  V478B_REMESSA,
  V478B_REMESSA_STATUS,
  V478B_WATERMARK_VERSION,
} from "./lib/v478b-human-gate.mjs";

const root = projectRoot();
const errors = [];
function assert(cond, message) {
  if (!cond) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const identitySrc = read("src/lib/releaseCandidate.ts");
assert(identitySrc.includes('LONGYU_RC_VERSION = "v4.7.4-rc.1"'), "product RC stays v4.7.4-rc.1");
assert(identitySrc.includes("EXPECTED_PLACEMENT_VERSION = 2"), "placement version 2");
assert(LONGYU_BACKEND_RC === "v4.7.8-rc.1", "backend RC stays v4.7.8-rc.1");
assert(V478B_MAIN_SHA === "3223d4379b5ab4af118a8d88773186e965c504b5", "MAIN_SHA recorded");
assert(V478B_BACKUP_GATE === "BLOCKED_BACKUP_NOT_CONFIRMED", "backup gate blocked");
assert(V478B_REMESSA_STATUS === "WAITING_HUMAN_APPROVAL", "waiting approval");
assert(V478B_APPROVAL_TOKEN === "APPROVE_MANDARINPROJECT_BACKEND_UPGRADE", "token exact");

const rcJson = JSON.parse(read("docs/backend/v478-backend-rc.json"));
assert(rcJson.LONGYU_BACKEND_RC === LONGYU_BACKEND_RC, "generated RC matches const");
assert(rcJson.canonical_schema_hash === "NOT_RUN", "does not invent schema hash");
assert(rcJson.journey_fingerprint === journeyFingerprint(root), "journey fingerprint live");
assert(rcJson.migration_chain_sha256 === localSchemaHash(localMigrationFiles(root)), "chain hash live");
assert(rcJson.migration_manifest_sha256 === sha256File(path.join(root, "docs/backend/migration-manifest.json")), "manifest hash live");
assert(rcJson.rpc_contract_sha256 === sha256File(path.join(root, "docs/backend/rpc-contract.json")), "rpc hash live");
assert(rcJson.edge_contract_sha256 === sha256File(path.join(root, "docs/backend/edge-contract.json")), "edge hash live");

const netlify = read("netlify.toml");
assert(
  /\[context\.production\.environment\][\s\S]*VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"/.test(netlify),
  "production onboarding stays false"
);

const drift = classifyMigrationDrift(localMigrationFiles(root));
for (const file of V478_PENDING_MIGRATIONS) {
  assert(
    drift.localOnly.some((row) => row.local.file === file),
    `pending still LOCAL_ONLY: ${file}`
  );
  assert(V477_LOCAL_ONLY_CLASS[file]?.class === "NOT_YET_DEPLOYED", `classified NOT_YET_DEPLOYED: ${file}`);
}
assert(V478_PENDING_MIGRATIONS.length === 11, "eleven pending migrations");
assert(V478B_INSEPARABLE_PAIRS[0][0].includes("api_role_table_grants"), "grants pair first");
assert(V478B_INSEPARABLE_PAIRS[0][1].includes("least_privilege_api_grants"), "grants pair second");
assert(V478B_INSEPARABLE_PAIRS[1][0].includes("progress_mastery_monotonic.sql"), "monotonic pair first");
assert(V478B_INSEPARABLE_PAIRS[1][1].includes("progress_mastery_monotonic_clamp"), "monotonic pair second");

const live = read("docs/reports/v478b-preapply-live-state.md");
assert(live.includes(V478B_MAIN_SHA), "live state names MAIN_SHA");
assert(live.includes(V478B_PRODUCTION_PROJECT_ID), "names MandarimProject id");
assert(live.includes(V478B_WATERMARK_VERSION), "watermark");
assert(live.includes("| profiles | 11 |"), "exact profile count");
assert(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(live), "live state avoids emails");
assert(!/sk_live_|sbp_/.test(live), "no tokens");
assert(live.includes("TURNSTILE_SECRET_KEY"), "records Turnstile vault name");
assert(!/TURNSTILE_SECRET_KEY.{0,40}[:=]\s*\S+/.test(live), "does not print Turnstile value");

const delta = read("docs/reports/v478b-pending-delta.md");
assert(/immediately/i.test(delta), "inseparable immediately");
assert(delta.includes("20260828013000_api_role_table_grants.sql"), "grants in delta");
assert(delta.includes("20260828032249_progress_mastery_monotonic_clamp.sql"), "clamp in delta");

const backup = read("docs/reports/v478b-backup-record.md");
assert(backup.includes(V478B_BACKUP_GATE), "backup blocked");
assert(/PITR|Backups/i.test(backup), "names dashboard backups");

const lock = read("docs/reports/v478b-deploy-lock.md");
assert(/NOT_ARMED/.test(lock), "lock not armed");

const gate = read("docs/reports/v478b-human-gate.md");
assert(gate.includes(V478B_APPROVAL_TOKEN), "human gate token");
assert(/STOP/.test(gate), "STOP");
assert(/not approval|não é aprovação|is \*\*not\*\* approval/i.test(gate), "prompt is not approval");
assert(/ZERO WRITE/i.test(gate), "zero write");
assert(/Firefox E2E[^\n]*PASS/.test(gate), "Firefox PASS on MAIN_SHA");
assert(/IN_PROGRESS/.test(gate), "records #208 Portão IN_PROGRESS until that HEAD is green");
assert(/V4\.7\.9/.test(gate) && /not start/i.test(gate), "V4.7.9 not started while hosted keys NOT_RUN");

const report = read("docs/reports/v478b-hosted-validation.md");
for (const key of V478B_HOSTED_SCOREBOARD_KEYS) {
  assert(report.includes(key), `report mentions ${key}`);
  assert(new RegExp(`${key}[^\n]*NOT_RUN`).test(report), `${key} stays NOT_RUN`);
  assert(!new RegExp(`${key}[^\n]*PASS`).test(report), `${key} must not be PASS`);
}
assert(report.includes(V478B_REMESSA_STATUS), "remessa status");
assert(report.includes(V478B_REMESSA), "names remessa");
assert(!/PHYSICAL_QA_READY[^\n]*PASS/.test(report), "no PHYSICAL_QA PASS");
assert(!/PAYMENTS_READY[^\n]*PASS/.test(report), "no PAYMENTS PASS");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(report), "no closed beta PASS");

const board = JSON.parse(read("docs/reports/v478b-hosted-scoreboard.json"));
assert(board.remessa_status === V478B_REMESSA_STATUS, "json status");
assert(board.production_writes === "ZERO", "json zero writes");
assert(board.backup_gate === V478B_BACKUP_GATE, "json backup");
assert(board.MAIN_SHA === V478B_MAIN_SHA, "json MAIN_SHA");
assert(board.MAIN_SHA_FIREFOX === "PASS", "json Firefox PASS");
assert(board.PR_HEAD_SHA === "3587fd06a559a1fad8dffaf6be1af05c6340b40b", "json PR_HEAD");
assert(board.v479_started === false, "V4.7.9 not started");
for (const key of V478B_HOSTED_SCOREBOARD_KEYS) {
  assert(board[key] === "NOT_RUN", `json ${key}=NOT_RUN`);
}

const applyCall = ["apply", "_migration"].join("");
const deployCall = ["deploy", "_edge_function"].join("");
const v478bLib = read("scripts/lib/v478b-human-gate.mjs");
assert(!v478bLib.includes(applyCall), "v478b lib must not call apply migration MCP");
assert(!v478bLib.includes(deployCall), "v478b lib must not deploy edges");

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:v478b-human-gate"] === "node scripts/test-v478b-human-gate.mjs", "script human gate");
assert(pkg.scripts["v478b:fase-b-plan"] === "node scripts/v478b-fase-b-plan.mjs", "script fase-b plan");
assert(pkg.scripts["validate:beta"].includes("test:v478b-human-gate"), "validate:beta includes v478b gate");

const runbook = read("docs/reports/v478b-fase-b-runbook.md");
assert(runbook.includes(V478B_APPROVAL_TOKEN), "runbook names token");
assert(/do not execute|not approval/i.test(runbook), "runbook is not execute-now");
for (const file of V478_PENDING_MIGRATIONS) {
  assert(runbook.includes(file), `runbook lists ${file}`);
}
assert(/immediately 9/.test(runbook) && /immediately 11/.test(runbook), "runbook inseparable pairs");

const planSrc = read("scripts/v478b-fase-b-plan.mjs");
assert(!planSrc.includes(applyCall), "plan script must not call apply migration MCP");
assert(!planSrc.includes(deployCall), "plan script must not deploy edges");
const planOk = spawnSync(process.execPath, [path.join(root, "scripts/v478b-fase-b-plan.mjs")], {
  cwd: root,
  encoding: "utf8",
});
assert(planOk.status === 0, "fase-b-plan exits 0");
assert(planOk.stdout.includes(V478B_APPROVAL_TOKEN), "plan prints token");
assert(planOk.stdout.includes("ZERO"), "plan prints ZERO writes");
const planApply = spawnSync(process.execPath, [path.join(root, "scripts/v478b-fase-b-plan.mjs"), "--apply"], {
  cwd: root,
  encoding: "utf8",
});
assert(planApply.status === 2, "fase-b-plan --apply refused");
assert(/REFUSED/.test(planApply.stderr), "--apply stderr REFUSED");

const evidence = read("docs/reports/v478b-fase-b-live-evidence.md");
assert(/pre-flight STOP/i.test(evidence), "evidence is pre-flight");
assert(evidence.includes(V478B_MAIN_SHA), "evidence MAIN_SHA");
assert(evidence.includes("3587fd06a559a1fad8dffaf6be1af05c6340b40b"), "evidence PR_HEAD");
assert(/ZERO/.test(evidence), "evidence zero writes");
assert(!/sk_live_|sbp_/.test(evidence), "evidence no tokens");
for (const key of V478B_HOSTED_SCOREBOARD_KEYS) {
  assert(!new RegExp(`${key}[^\n]*PASS`).test(evidence), `evidence ${key} not PASS`);
}

const blocked = read("docs/reports/v479-blocked-pending-v478b.md");
assert(/Not started/i.test(blocked), "v479 blocked file says not started");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(blocked), "v479 file must not PASS closed beta");

if (errors.length) {
  console.error("FAIL test:v478b-human-gate:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:v478b-human-gate");
