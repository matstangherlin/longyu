import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import { localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import { edgeSourceCatalog, sha256File } from "./lib/schema-canonical.mjs";
import { CURRICULUM_SOURCES, journeyFingerprint } from "./lib/report-meta.mjs";
import {
  V489_BACKEND_RC,
  V489_BASE_MAIN_SHA,
  V489_DECISION,
  V489_INSEPARABLE_PAIRS,
  V489_PENDING_MIGRATIONS,
  V489_PRODUCTION_COUNTS,
  V489_PRODUCTION_PROJECT_ID,
  V489_PRODUCTION_WATERMARK,
  V489_PRODUCTION_WRITE_BOUNDARY,
  V489_SCOREBOARD,
  V489_SCOREBOARD_KEYS,
} from "./lib/v489-production-preflight.mjs";

const root = projectRoot();
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const lfRoot = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-journey-lf-"));
const crlfRoot = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-journey-crlf-"));
try {
  for (const relative of CURRICULUM_SOURCES) {
    const lfPath = path.join(lfRoot, relative);
    const crlfPath = path.join(crlfRoot, relative);
    fs.mkdirSync(path.dirname(lfPath), { recursive: true });
    fs.mkdirSync(path.dirname(crlfPath), { recursive: true });
    fs.writeFileSync(lfPath, `source:${relative}\nline:2\n`);
    fs.writeFileSync(crlfPath, `source:${relative}\r\nline:2\r\n`);
  }
  assert(journeyFingerprint(lfRoot) === journeyFingerprint(crlfRoot), "portable Journey fingerprint across LF/CRLF");
} finally {
  fs.rmSync(lfRoot, { recursive: true, force: true });
  fs.rmSync(crlfRoot, { recursive: true, force: true });
}

assert(V489_BASE_MAIN_SHA === "02bf2f1803ffbde0e17efc00dbf3f0cde5b71163", "exact V4.8.9 base main");
assert(V489_PRODUCTION_PROJECT_ID === "drjcfalvlbbeblmmyhwj", "MandarimProject id");
assert(V489_PRODUCTION_WATERMARK === "20260810175737", "fresh production watermark");
assert(V489_PENDING_MIGRATIONS.length === 11, "eleven pending migrations");
assert(Object.keys(V489_PRODUCTION_COUNTS).length >= 10, "aggregate snapshot is present");
assert(V489_SCOREBOARD.NEW_LOGICAL_BACKUP === "BLOCKED", "new logical backup is blocked");
assert(V489_SCOREBOARD.BACKUP_VERIFIED === "BLOCKED", "restore verification is blocked");
assert(V489_SCOREBOARD.PRODUCTION_APPLY_READY === "BLOCKED", "production apply is blocked");
assert(V489_SCOREBOARD.FRONTEND_OLD_BACKEND_COMPATIBLE === "FAIL", "old backend incompatibility remains explicit");
assert(V489_SCOREBOARD.PHYSICAL_DEVICE_READY === "NOT_RUN", "physical device pass is not invented");
const expectedScoreboardKeys = [
  "MAIN_BASE_CURRENT",
  "BACKEND_RC_CURRENT",
  "PRODUCTION_DELTA_COMPUTED",
  "PRODUCTION_SCHEMA_SNAPSHOT",
  "NEW_LOGICAL_BACKUP",
  "BACKUP_VERIFIED",
  "MIGRATION_REHEARSAL",
  "EDGE_CONTRACT",
  "RLS_A_NOT_B",
  "AUTH_EPHEMERAL",
  "PLACEMENT_EPHEMERAL",
  "FINALIZE_ONBOARDING_EPHEMERAL",
  "SYNC_EPHEMERAL",
  "RECOVERY_EPHEMERAL",
  "COURSE_LANGUAGE_BACKEND_COMPATIBLE",
  "FRONTEND_OLD_BACKEND_COMPATIBLE",
  "ROLLOUT_ORDER_READY",
  "ROLLBACK_PLAN_READY",
  "OBSERVABILITY_READY",
  "CI_HEAD_READY",
  "SECURITY_HEAD_READY",
  "PHYSICAL_DEVICE_READY",
  "PRODUCTION_APPLY_READY",
];
assert(JSON.stringify(V489_SCOREBOARD_KEYS) === JSON.stringify(expectedScoreboardKeys), "exact V489 scoreboard contract");
assert(
  Object.values(V489_SCOREBOARD).every((value) => ["PASS", "FAIL", "BLOCKED", "NOT_RUN"].includes(value)),
  "scoreboard uses only approved values"
);
assert(V489_DECISION === "BLOCKED_BEFORE_PRODUCTION_APPLY", "fail-closed decision");

const local = new Set(localMigrationFiles(root).map((row) => row.file));
for (const row of V489_PENDING_MIGRATIONS) {
  assert(local.has(row.file), `pending migration exists: ${row.file}`);
  assert(/^R[0-5]$/.test(row.risk), `risk classified: ${row.file}`);
}
for (const [first, second] of V489_INSEPARABLE_PAIRS) {
  assert(V489_PENDING_MIGRATIONS.findIndex((row) => row.file === second) === V489_PENDING_MIGRATIONS.findIndex((row) => row.file === first) + 1, `inseparable order ${first} -> ${second}`);
}

const identity = JSON.parse(read("docs/backend/v489-backend-rc.json"));
assert(identity.LONGYU_BACKEND_RC === V489_BACKEND_RC, "V489 backend identity");
assert(identity.base_main_sha === V489_BASE_MAIN_SHA, "identity base SHA");
assert(identity.migration_chain_sha256 === localSchemaHash(localMigrationFiles(root)), "identity migration chain");
assert(identity.migration_manifest_sha256 === sha256File(path.join(root, "docs/backend/migration-manifest.json")), "identity manifest hash");
assert(identity.edge_contract_sha256 === sha256File(path.join(root, "docs/backend/edge-contract.json")), "identity edge hash");
assert(identity.canonical_schema_hash === "NOT_RUN", "does not invent canonical schema result");

const edgeContract = JSON.parse(read("docs/backend/edge-contract.json"));
for (const current of edgeSourceCatalog(root)) {
  const frozen = edgeContract.functions.find((row) => row.slug === current.slug);
  assert(frozen?.source_sha256 === current.source_sha256, `portable edge hash ${current.slug}`);
  assert(current.files.every((file) => !file.includes("\\")), `portable edge path ${current.slug}`);
}

const reports = [
  "docs/reports/v489-production-migration-delta.md",
  "docs/reports/v489-backup-record.md",
  "docs/reports/v489-physical-smoke-checklist.md",
  "docs/reports/v489-production-backend-preflight.md",
];
for (const report of reports) assert(fs.existsSync(path.join(root, report)), `report exists: ${report}`);
const combined = reports.map(read).join("\n");
assert(combined.includes(V489_BACKEND_RC), "reports cite backend identity");
assert(combined.includes(V489_PRODUCTION_WATERMARK), "reports cite production watermark");
assert(/MANDARIMPROJECT_WRITES\s*=\s*0/.test(combined), "zero MandarimProject writes recorded");
assert(/STRIPE_LIVE_WRITES\s*=\s*0/.test(combined), "zero Stripe Live writes recorded");
assert(!/PHYSICAL_QA_READY\s*[=|:]\s*PASS/.test(combined), "physical QA not promoted");
assert(!/READY_FOR_PUBLIC_BETA\s*[=|:]\s*PASS/.test(combined), "public beta not promoted");
assert(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(combined), "reports contain no email addresses");
assert(!/sk_(?:live|test)_[A-Za-z0-9]+|sbp_[A-Za-z0-9]+/.test(combined), "reports contain no credentials");

const scriptFiles = ["scripts/v489-production-preflight.mjs", "scripts/v489-identity.mjs"];
for (const file of scriptFiles) {
  const source = read(file);
  assert(!/apply_migration|deploy_edge_function|supabase\s+db\s+push/.test(source), `${file} has no hosted mutation primitive`);
}
for (const flag of ["--apply", "--deploy", "--write", "--set-secret", "--create-user"]) {
  const run = spawnSync(process.execPath, [path.join(root, "scripts/v489-production-preflight.mjs"), flag], { cwd: root, encoding: "utf8" });
  assert(run.status === 2, `${flag} hard-refused`);
  assert(`${run.stdout}${run.stderr}`.includes(V489_PRODUCTION_WRITE_BOUNDARY), `${flag} reaches boundary`);
}

const normal = spawnSync(process.execPath, [path.join(root, "scripts/v489-production-preflight.mjs")], { cwd: root, encoding: "utf8" });
assert(normal.status === 0, "read-only preflight command passes");
assert(normal.stdout.includes(V489_DECISION), "read-only command reports blocked decision");

const workflow = read(".github/workflows/backend-contract.yml");
assert(/node-version:\s*"22"/.test(workflow), "Node 22 current Supabase runtime");
assert(/SUPABASE_ACCESS_TOKEN:\s*""/.test(workflow), "ephemeral CI has no hosted token");
assert(!/logs\.all/.test(workflow), "removed logs.all endpoint not used");
assert(workflow.includes("v489-ephemeral-scoreboard.json"), "workflow uploads V489 exact-run evidence");
assert(workflow.includes("v489-production-backend-preflight.ci.md"), "workflow uploads V489 CI report");

if (errors.length) {
  console.error("FAIL test:v489-production-preflight:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("OK: test:v489-production-preflight (read-only inventory + immutable boundary)");
