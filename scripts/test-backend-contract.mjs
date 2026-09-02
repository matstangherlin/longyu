/**
 * V4.7.7 backend contract — runs without a database.
 * Live schema/RPC/RLS checks run in rehearse:backend-contract.
 */
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";
import { classifyMigrationDrift, localMigrationFiles } from "./lib/migration-drift.mjs";
import {
  V477_CRITICAL_RPCS,
  V477_HISTORICAL_EDITS,
  V477_LOCAL_ONLY_CLASS,
  V477_REMOTE_ONLY_CLASS,
  V477_SCOREBOARD_KEYS,
} from "./lib/v477-constants.mjs";
import { assertFrozenMigrations, edgeSourceCatalog } from "./lib/schema-canonical.mjs";
import { LONGYU_PRODUCTION_PROJECT_ID } from "./lib/staging-guard.mjs";

const root = projectRoot();
const errors = [];
function assert(cond, message) {
  if (!cond) errors.push(message);
}

assert(isFinite(V477_SCOREBOARD_KEYS.length) && V477_SCOREBOARD_KEYS.length >= 9, "scoreboard keys");

const files = localMigrationFiles(root);
const drift = classifyMigrationDrift(files);

for (const row of drift.remoteOnly) {
  const klass = V477_REMOTE_ONLY_CLASS[row.remote.version];
  assert(Boolean(klass), `REMOTE_ONLY unclassified: ${row.remote.version} ${row.remote.name}`);
  assert(klass && klass.class !== "D", `REMOTE_ONLY UNKNOWN not allowed: ${row.remote.version}`);
}
for (const row of drift.localOnly) {
  const klass = V477_LOCAL_ONLY_CLASS[row.local.file];
  assert(Boolean(klass), `LOCAL_ONLY unclassified: ${row.local.file}`);
  assert(klass && klass.class !== "ERROR", `LOCAL_ONLY ERROR: ${row.local.file}`);
}

const freezeErrors = assertFrozenMigrations(root);
for (const item of freezeErrors) errors.push(item);

const viewSql = fs.readFileSync(path.join(root, "supabase/migrations/012_pedagogy_consent_rpc_gate.sql"), "utf8");
assert(/drop view if exists public\.admin_user_overview/i.test(viewSql), "012 drops view for fresh replay");
assert(V477_HISTORICAL_EDITS.some((row) => row.file.includes("012")), "012 historical edit recorded");

const grantsNew = fs.readFileSync(
  path.join(root, "supabase/migrations/20260828020000_least_privilege_api_grants.sql"),
  "utf8"
);
assert(/revoke all on table public\.user_progress from anon/i.test(grantsNew), "least privilege revokes anon progress");
assert(/grant select, insert, update on table public\.user_progress to authenticated/i.test(grantsNew), "progress DML without ALL");
assert(!/grant all on table public\.user_progress to anon/i.test(grantsNew), "no GRANT ALL to anon on progress");

const mono = fs.readFileSync(
  path.join(root, "supabase/migrations/20260828030000_progress_mastery_monotonic.sql"),
  "utf8"
);
assert(/merge_progress_mastery_monotonic/i.test(mono), "monotonic trigger exists");
assert(/greatest\(old_lvl, new_lvl\)/i.test(mono), "GREATEST level merge");

const rpcContract = JSON.parse(fs.readFileSync(path.join(root, "docs/backend/rpc-contract.json"), "utf8"));
assert(rpcContract.rpcs.length === V477_CRITICAL_RPCS.length, "rpc-contract matches constants");
assert(
  rpcContract.rpcs.every((row) => row.name && row.domain),
  "rpc-contract rows have name+domain"
);

const edgeContract = JSON.parse(fs.readFileSync(path.join(root, "docs/backend/edge-contract.json"), "utf8"));
const liveEdge = edgeSourceCatalog(root);
assert(edgeContract.functions.length === liveEdge.length, "edge-contract count");
for (const row of liveEdge) {
  const listed = edgeContract.functions.find((item) => item.slug === row.slug);
  assert(Boolean(listed), `edge contract missing ${row.slug}`);
  assert(listed?.source_sha256 === row.source_sha256, `edge hash stale for ${row.slug} — rerun generate-backend-contracts`);
}

const report = fs.readFileSync(path.join(root, "docs/reports/v477-backend-contract-freeze.md"), "utf8");
for (const key of V477_SCOREBOARD_KEYS) {
  assert(report.includes(key), `report mentions ${key}`);
}
assert(report.includes(LONGYU_PRODUCTION_PROJECT_ID), "report names MandarimProject id");
assert(!report.includes("STAGING_READY = PASS"), "does not invent STAGING_READY");

const plan = fs.readFileSync(path.join(root, "docs/reports/mandarimproject-deployment-plan.md"), "utf8");
assert(/NOT execute|NÃO executar|Do not apply/i.test(plan), "plan is not an apply script");
assert(/20260813180000_pearl_pro_economy/i.test(plan), "plan lists pearl migration");
assert(/commit-placement/i.test(plan), "plan lists placement edge");

const inventory = fs.readFileSync(path.join(root, "docs/reports/migration-drift-inventory.md"), "utf8");
assert(/REMOTE_ONLY/i.test(inventory), "inventory has REMOTE_ONLY");
assert(/referrals_mvp/i.test(inventory), "inventory names referrals_mvp");
assert(!/empty file with this timestamp/i.test(fs.readFileSync(path.join(root, "supabase/migrations/019_turnstile_vault_secret.sql"), "utf8")), "did not fake remote timestamps");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert(pkg.scripts["test:backend-contract"] === "node scripts/test-backend-contract.mjs", "script test:backend-contract");
assert(pkg.scripts["rehearse:backend-contract"] === "node scripts/rehearse-backend-contract.mjs", "script rehearse:backend-contract");
assert(pkg.scripts["generate:backend-contracts"] === "node scripts/generate-backend-contracts.mjs", "script generate:backend-contracts");
assert(pkg.scripts["validate:beta"].includes("test:backend-contract"), "validate:beta includes test:backend-contract");
assert(!pkg.scripts["validate:beta"].includes("rehearse:backend-contract"), "validate:beta does not start ephemeral supabase");

const workflow = fs.readFileSync(path.join(root, ".github/workflows/backend-contract.yml"), "utf8");
assert(/node-version:\s*"22"/.test(workflow), "backend-contract Node 22");
assert(/version:\s*2\.109\.1/.test(workflow), "backend-contract CLI 2.109.1");
assert(/TURNSTILE_ALLOW_SKIP:\s*"1"/.test(workflow), "local captcha skip env");
assert(/SUPABASE_ACCESS_TOKEN:\s*""/.test(workflow), "empty access token");
assert(/LONGYU_TARGET_PROJECT_ID:\s*""/.test(workflow), "empty target project");
assert(/timeout-minutes:\s*15/.test(workflow), "15 minute timeout");

assert(fs.existsSync(path.join(root, "supabase/baseline/README.md")), "baseline README");
assert(fs.existsSync(path.join(root, "scripts/rehearse-backend-contract.mjs")), "rehearsal script");
assert(edgeContract.functions.length === 9, "nine Edge slugs");

const freezeSrc = fs.readFileSync(path.join(root, "scripts/lib/schema-canonical.mjs"), "utf8");
assert(freezeSrc.includes("status: \"FROZEN\""), "manifest marks FROZEN");

if (errors.length) {
  console.error("FAIL test:backend-contract:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:backend-contract (freeze + drift classes + least privilege + contracts)");
