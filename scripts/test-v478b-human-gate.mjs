/**
 * V4.7.8B human gate. Zero MandarimProject writes.
 * Hosted scoreboard stays NOT_RUN. Does not invent PHYSICAL_QA / PAYMENTS / closed-beta PASS.
 * Manual logical backup CREATED/VERIFIED stay NOT_RUN until a later human confirms dumps.
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
  V478B_AUTH_RECOVERY_SCOPE,
  V478B_BACKUP_CREATED_AT,
  V478B_BACKUP_GATE,
  V478B_BACKUP_RECOVERY_GATE,
  V478B_BACKUP_TYPE,
  V478B_CRITICAL_ROW_COUNTS,
  V478B_HOSTED_SCOREBOARD_KEYS,
  V478B_INSEPARABLE_PAIRS,
  V478B_MAIN_SHA,
  V478B_MANUAL_LOGICAL_BACKUP_CREATED,
  V478B_MANUAL_LOGICAL_BACKUP_VERIFIED,
  V478B_MANUAL_LOGICAL_DUMP_FILES,
  V478B_PRODUCTION_PROJECT_ID,
  V478B_REMESSA,
  V478B_REMESSA_STATUS,
  V478B_WATERMARK_VERSION,
  isV478bManualLogicalBackupReady,
  v478bBackupRecoveryGateStatus,
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
assert(V478B_BACKUP_TYPE === "MANUAL_LOGICAL", "backup type manual logical");
assert(V478B_MANUAL_LOGICAL_BACKUP_CREATED === "PASS", "CREATED PASS after human dump");
assert(V478B_MANUAL_LOGICAL_BACKUP_VERIFIED === "PASS", "VERIFIED PASS after restore rehearsal");
assert(V478B_BACKUP_CREATED_AT === "2026-08-28", "dump calendar date");
assert(V478B_AUTH_RECOVERY_SCOPE === "OUT_OF_SCOPE_THIS_MIGRATION", "auth out of scope");
assert(V478B_BACKUP_RECOVERY_GATE === "PASS_WITH_MANUAL_LOGICAL_BACKUP", "recovery gate PASS");
assert(V478B_BACKUP_GATE === V478B_BACKUP_RECOVERY_GATE, "alias matches recovery gate");
assert(isV478bManualLogicalBackupReady(), "backup ready");
assert(
  v478bBackupRecoveryGateStatus({ created: "PASS", verified: "PASS" }) ===
    "PASS_WITH_MANUAL_LOGICAL_BACKUP",
  "both PASS → PASS_WITH_MANUAL_LOGICAL_BACKUP"
);
assert(
  v478bBackupRecoveryGateStatus({ created: "PASS", verified: "NOT_RUN" }) ===
    "WAITING_MANUAL_LOGICAL_BACKUP",
  "CREATED alone is not the recovery gate"
);
assert(V478B_REMESSA_STATUS === "READY_FOR_HUMAN_APPLY_APPROVAL", "ready for apply token");
assert(V478B_APPROVAL_TOKEN === "APPROVE_MANDARINPROJECT_BACKEND_UPGRADE", "token exact");
assert(
  V478B_MANUAL_LOGICAL_DUMP_FILES.join(",") ===
    "roles.sql,schema.sql,data.sql,history_schema.sql,history_data.sql",
  "five official dump filenames"
);
assert(V478B_CRITICAL_ROW_COUNTS.profiles === 11, "profiles 11");
assert(V478B_CRITICAL_ROW_COUNTS.user_progress === 10, "progress 10");
assert(V478B_CRITICAL_ROW_COUNTS.user_economy === 9, "economy 9");
assert(V478B_CRITICAL_ROW_COUNTS.user_srs === 0, "srs 0");
assert(V478B_CRITICAL_ROW_COUNTS.transactions === 0, "transactions 0");

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
assert(/manual logical dump/i.test(live), "live state names manual logical dump");

const delta = read("docs/reports/v478b-pending-delta.md");
assert(/immediately/i.test(delta), "inseparable immediately");
assert(delta.includes("20260828013000_api_role_table_grants.sql"), "grants in delta");
assert(delta.includes("20260828032249_progress_mastery_monotonic_clamp.sql"), "clamp in delta");

const backup = read("docs/reports/v478b-backup-record.md");
assert(backup.includes(V478B_BACKUP_GATE), "backup gate in record");
assert(backup.includes("MANUAL_LOGICAL_BACKUP_CREATED"), "names CREATED gate");
assert(backup.includes("MANUAL_LOGICAL_BACKUP_VERIFIED"), "names VERIFIED gate");
assert(backup.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "names combined PASS");
assert(
  /\| `BACKUP_RECOVERY_GATE` \| \*\*`PASS_WITH_MANUAL_LOGICAL_BACKUP`\*\*/.test(backup),
  "current recovery gate is PASS_WITH_MANUAL_LOGICAL_BACKUP"
);
assert(
  !/\| `BACKUP_RECOVERY_GATE` \| \*\*`WAITING_MANUAL_LOGICAL_BACKUP`\*\*/.test(backup),
  "does not claim current waiting"
);
assert(/PITR/i.test(backup) && /not PITR/i.test(backup), "states not PITR");
assert(/RPO/.test(backup), "names RPO");
assert(/FREE/.test(backup), "records Free plan");
assert(/slower/i.test(backup), "recovery slower than physical");
assert(/db dump/i.test(backup), "names logical dump path on Free");
for (const dumpFile of V478B_MANUAL_LOGICAL_DUMP_FILES) {
  assert(backup.includes(dumpFile), `backup record names ${dumpFile}`);
}
assert(/auth\.users/.test(backup) && /auth\.identities/.test(backup), "auth tables named");
assert(/OUT_OF_SCOPE_THIS_MIGRATION/.test(backup), "auth out-of-scope option");
assert(/EXPORTED_SEPARATELY/.test(backup), "auth export option");
assert(/Do \*\*not\*\* ask for dump contents, passwords, or a DB URL/.test(backup), "never ask secrets");
assert(!/postgres(ql)?:\/\//i.test(backup), "no db url");
assert(!/sk_live_|sbp_/.test(backup), "backup record no tokens");
assert(
  !/\bBLOCKED_BACKUP_NOT_CONFIRMED\b/.test(
    backup.replace(/`?BLOCKED_BACKUP_NOT_CONFIRMED`?[^.\n]*replac[^.\n]*\.?/gi, "")
  ),
  "old paid blocker only as historical replaced note"
);

const gitignore = read(".gitignore");
for (const dumpFile of V478B_MANUAL_LOGICAL_DUMP_FILES) {
  assert(gitignore.includes(`/${dumpFile}`), `gitignore blocks ${dumpFile}`);
  assert(!fs.existsSync(path.join(root, dumpFile)), `repo must not contain ${dumpFile}`);
}

const lock = read("docs/reports/v478b-deploy-lock.md");
assert(/NOT_ARMED/.test(lock), "lock not armed");
assert(lock.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "lock waits on logical backup PASS");

const gate = read("docs/reports/v478b-human-gate.md");
assert(gate.includes(V478B_APPROVAL_TOKEN), "human gate token");
assert(/STOP/.test(gate), "STOP");
assert(/not approval|não é aprovação|is \*\*not\*\* approval/i.test(gate), "prompt is not approval");
assert(/ZERO WRITE/i.test(gate), "zero write");
assert(/Firefox E2E[^\n]*PASS/.test(gate), "Firefox PASS on MAIN_SHA");
assert(/#208 CI[\s\S]*Portão[\s\S]*PASS/.test(gate), "records #208 Portão PASS");
assert(!/IN_PROGRESS/.test(gate), "no stale IN_PROGRESS on human gate");
assert(/V4\.7\.9/.test(gate) && /not start/i.test(gate), "V4.7.9 not started while hosted keys NOT_RUN");
assert(gate.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "human gate shows dump PASS");
assert(gate.includes("READY_FOR_HUMAN_APPLY_APPROVAL"), "human gate ready for token");
assert(/not PITR/i.test(gate), "human gate not PITR");

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
assert(report.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "hosted report dump PASS");
assert(report.includes("READY_FOR_HUMAN_APPLY_APPROVAL"), "hosted report ready for token");

const board = JSON.parse(read("docs/reports/v478b-hosted-scoreboard.json"));
assert(board.remessa_status === V478B_REMESSA_STATUS, "json status");
assert(board.production_writes === "ZERO", "json zero writes");
assert(board.backup_type === "MANUAL_LOGICAL", "json backup type");
assert(board.MANUAL_LOGICAL_BACKUP_CREATED === "PASS", "json CREATED");
assert(board.MANUAL_LOGICAL_BACKUP_VERIFIED === "PASS", "json VERIFIED");
assert(board.BACKUP_RECOVERY_GATE === "PASS_WITH_MANUAL_LOGICAL_BACKUP", "json recovery gate");
assert(board.backup_gate === V478B_BACKUP_GATE, "json backup alias");
assert(board.backup_created_at === "2026-08-28", "json dump time");
assert(board.auth_recovery_scope === "OUT_OF_SCOPE_THIS_MIGRATION", "json auth scope");
assert(board.BACKUP_STILL_VALID === "PASS", "json backup still valid");
assert(board.CI_HEAD_READY === "PASS", "json CI head ready");
assert(board.PRODUCTION_DELTA_REFRESHED === "PASS", "json delta refreshed");
assert(board.PR_HEAD_PORTAO === "PASS", "json Portão PASS");
assert(board.restored_counts.profiles === 11, "json restored profiles");
assert(board.critical_row_counts.profiles === 11, "json profiles");
assert(board.PITR_available === "NO", "json not PITR");
assert(board.RPO === "dump_created_at", "json RPO");
assert(board.MAIN_SHA === V478B_MAIN_SHA, "json MAIN_SHA");
assert(board.MAIN_SHA_FIREFOX === "PASS", "json Firefox PASS");
assert(/^[a-f0-9]{40}$/.test(board.PR_HEAD_SHA), "json PR_HEAD sha");
assert(board.v479_started === false, "V4.7.9 not started");
for (const key of V478B_HOSTED_SCOREBOARD_KEYS) {
  assert(board[key] === "NOT_RUN", `json ${key}=NOT_RUN`);
}

const applyCall = ["apply", "_migration"].join("");
const deployCall = ["deploy", "_edge_function"].join("");
const v478bLib = read("scripts/lib/v478b-human-gate.mjs");
assert(!v478bLib.includes(applyCall), "v478b lib must not call apply migration MCP");
assert(!v478bLib.includes(deployCall), "v478b lib must not deploy edges");
assert(!v478bLib.includes("BLOCKED_BACKUP_NOT_CONFIRMED"), "lib replaced paid blocker");

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:v478b-human-gate"] === "node scripts/test-v478b-human-gate.mjs", "script human gate");
assert(pkg.scripts["v478b:fase-b-plan"] === "node scripts/v478b-fase-b-plan.mjs", "script fase-b plan");
assert(pkg.scripts["validate:beta"].includes("test:v478b-human-gate"), "validate:beta includes v478b gate");

const runbook = read("docs/reports/v478b-fase-b-runbook.md");
assert(runbook.includes(V478B_APPROVAL_TOKEN), "runbook names token");
assert(/do not execute|not approval/i.test(runbook), "runbook is not execute-now");
assert(runbook.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "runbook requires logical backup PASS");
assert(/Not PITR/i.test(runbook), "runbook not PITR");
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
assert(planOk.stdout.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "plan prints dump PASS");
assert(planOk.stdout.includes("MANUAL_LOGICAL"), "plan prints backup type");
assert(/"pitr": false/.test(planOk.stdout), "plan pitr false");
assert(/"manual_logical_backup_ready": true/.test(planOk.stdout), "plan backup ready");
assert(planOk.stdout.includes("READY_FOR_HUMAN_APPLY_APPROVAL"), "plan ready for token");
const planApply = spawnSync(process.execPath, [path.join(root, "scripts/v478b-fase-b-plan.mjs"), "--apply"], {
  cwd: root,
  encoding: "utf8",
});
assert(planApply.status === 2, "fase-b-plan --apply refused");
assert(/REFUSED/.test(planApply.stderr), "--apply stderr REFUSED");
assert(/MANUAL_LOGICAL_BACKUP_CREATED/.test(planApply.stderr), "--apply names dump gates");

const evidence = read("docs/reports/v478b-fase-b-live-evidence.md");
assert(/pre-flight STOP/i.test(evidence), "evidence is pre-flight");
assert(evidence.includes(V478B_MAIN_SHA), "evidence MAIN_SHA");
assert(evidence.includes(board.PR_HEAD_SHA), "evidence PR_HEAD matches json");
assert(/ZERO/.test(evidence), "evidence zero writes");
assert(!/sk_live_|sbp_/.test(evidence), "evidence no tokens");
assert(evidence.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "evidence dump PASS");
assert(evidence.includes("READY_FOR_HUMAN_APPLY_APPROVAL"), "evidence ready for token");
assert(/not PITR/i.test(evidence), "evidence not PITR");
for (const key of V478B_HOSTED_SCOREBOARD_KEYS) {
  assert(!new RegExp(`${key}[^\n]*PASS`).test(evidence), `evidence ${key} not PASS`);
}

const blocked = read("docs/reports/v479-blocked-pending-v478b.md");
assert(/Not started/i.test(blocked), "v479 blocked file says not started");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(blocked), "v479 file must not PASS closed beta");
assert(blocked.includes("PASS_WITH_MANUAL_LOGICAL_BACKUP"), "v479 notes dump PASS");
assert(/APPROVE_MANDARINPROJECT_BACKEND_UPGRADE/.test(blocked), "v479 still needs apply token");

if (errors.length) {
  console.error("FAIL test:v478b-human-gate:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:v478b-human-gate");
