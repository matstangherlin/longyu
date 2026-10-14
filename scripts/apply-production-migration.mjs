/**
 * Apply ONE allowlisted production migration after PRODUCTION_MIGRATION_READY.
 * Never replays supabase/migrations/. Refuses when readiness is BLOCKED.
 *
 * Usage (CI / owner machine):
 *   node scripts/apply-production-migration.mjs \
 *     --migration-id rc2-3-10-league-memberships-policy-recursion \
 *     --confirm APPLY-rc2-3-10-league-memberships-policy-recursion \
 *     --expected-sha <40-hex> \
 *     --project-ref drjcfalvlbbeblmmyhwj
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { LONGYU_PRODUCTION_PROJECT_ID } from "./lib/staging-guard.mjs";
import { productionMigrationReady } from "./lib/rc2-3-10-cloud.mjs";
import { lookupProductionMigration } from "./lib/production-migration-allowlist.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const root = projectRoot();
const migrationId = arg("--migration-id");
const confirm = arg("--confirm");
const expectedSha = arg("--expected-sha");
const projectRef = arg("--project-ref") ?? LONGYU_PRODUCTION_PROJECT_ID;
const dryRun = process.argv.includes("--dry-run");

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

if (!migrationId) fail(6, "MIGRATION_ID_REQUIRED");
if (confirm !== `APPLY-${migrationId}`) fail(6, `CONFIRMATION_MISSING: digite APPLY-${migrationId}`);
if (!/^[0-9a-f]{40}$/.test(String(expectedSha ?? ""))) fail(6, "EXPECTED_SHA_REQUIRED");
if (projectRef !== LONGYU_PRODUCTION_PROJECT_ID) fail(6, "PROJECT_REF_MISMATCH");

const entry = lookupProductionMigration(migrationId);
if (!entry) fail(6, `MIGRATION_NOT_ALLOWLISTED: ${migrationId}`);

const readyAbs = path.join(root, entry.readyPath);
if (!existsSync(readyAbs)) fail(6, `READY_FILE_MISSING: ${entry.readyPath}`);
const readyDoc = JSON.parse(readFileSync(readyAbs, "utf8"));
if (readyDoc.migrationId !== migrationId) fail(6, "READY_FILE_ID_MISMATCH");
if (readyDoc.file !== entry.file) fail(6, "READY_FILE_PATH_MISMATCH");

const request = readyDoc.request ?? {};
if (request.candidateSha !== expectedSha) {
  fail(6, `CANDIDATE_SHA_MISMATCH: ready=${request.candidateSha} expected=${expectedSha}`);
}

let head = "";
try {
  head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  fail(6, "GIT_HEAD_UNREADABLE");
}
if (head !== expectedSha) fail(6, `HEAD_SHA_MISMATCH: head=${head} expected=${expectedSha}`);

const readiness = productionMigrationReady(request);
if (readiness.status !== "PASS") {
  console.error(`PRODUCTION_MIGRATION_READY=${readiness.status}`);
  console.error(`blockers=${readiness.blockers.join(",")}`);
  fail(6, "PRODUCTION_MIGRATION_NOT_READY");
}

const sqlPath = path.join(root, entry.file);
if (!existsSync(sqlPath)) fail(6, `SQL_MISSING: ${entry.file}`);
const sql = readFileSync(sqlPath, "utf8");
if (!sql.trim()) fail(6, "SQL_EMPTY");

console.log(`Allowlisted single migration: ${migrationId}`);
console.log(`  file       : ${entry.file}`);
console.log(`  remoteName : ${entry.remoteName}`);
console.log(`  project    : ${projectRef}`);
console.log(`  sha        : ${expectedSha}`);
console.log(`  readiness  : PASS`);

if (dryRun) {
  console.log("DRY_RUN: no Management API call.");
  process.exit(0);
}

const env = mergedEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) fail(1, "SUPABASE_ACCESS_TOKEN ausente");

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`;
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql, name: entry.remoteName }),
});
const body = await response.text();
if (!response.ok) {
  const already =
    response.status === 400 && (body.includes("already exists") || body.includes("duplicate key"));
  if (already) {
    console.log(`↷ ${entry.remoteName} (já aplicada)`);
    process.exit(0);
  }
  fail(1, `APPLY_FAILED ${response.status}: ${body.slice(0, 1500)}`);
}
console.log(`✓ applied ${entry.remoteName}`);
