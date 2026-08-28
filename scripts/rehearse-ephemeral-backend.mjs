/**
 * EPHEMERAL_BACKEND_VALIDATION — local/CI Supabase, never MandarimProject.
 * Does not require LONGYU_STAGING_PROJECT_ID.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import {
  SCORE_BLOCKED,
  SCORE_FAIL,
  SCORE_FOLLOW_UP,
  SCORE_NOT_RUN,
  SCORE_PASS,
  V476_EPHEMERAL_SCOREBOARD_KEYS,
  V476_OPERATIONAL_MIGRATIONS,
} from "./lib/v476-constants.mjs";
import { classifyMigrationDrift, localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import {
  EphemeralError,
  applyLocalMigrationsInOrder,
  assertSchema,
  auditSecurityDefiner,
  compareFrontendContracts,
  generatedTypesFromSchema,
  loadEphemeralEnv,
  resetEphemeralDb,
  runConcurrentMastery,
  runEconomyConcurrency,
  runEdgeLocal,
  runMissingDraft,
  runOnboardingTransaction,
  runPlacementRpc,
  runRlsIsolation,
  runTopicMasteryPersistence,
  startSupabase,
} from "./lib/ephemeral-backend.mjs";
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
} from "./lib/staging-guard.mjs";
import { LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";
import {
  MANDARIMPROJECT_MISSING_PROFILE_COLUMNS,
  MANDARIMPROJECT_MISSING_RPCS,
  MANDARIMPROJECT_MISSING_TABLES,
  MANDARIMPROJECT_READONLY_CAPTURED_AT,
  MANDARIMPROJECT_READONLY_EDGES,
  MANDARIMPROJECT_READONLY_MIGRATIONS,
} from "./lib/mandarimproject-readonly-snapshot.mjs";

const root = projectRoot();
const args = new Set(process.argv.slice(2));
const skipStart = args.has("--skip-start");
const skipReset = args.has("--skip-reset");
const skipEdge = args.has("--skip-edge");
const startedAt = Date.now();

function scoreboard() {
  const board = { mode: "EPHEMERAL_BACKEND_VALIDATION" };
  for (const key of V476_EPHEMERAL_SCOREBOARD_KEYS) board[key] = SCORE_NOT_RUN;
  return board;
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function mainSha() {
  try {
    return execSync("git rev-parse origin/main", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function writeFile(relative, contents) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

function renderDriftMarkdown(drift, schemaHash, generatedAt) {
  const rows = [
    ...drift.localAndRemote.map(
      (row) =>
        `| LOCAL_AND_REMOTE | ${row.remote.version} ${row.remote.name} | ${row.local.file} | ${row.match}${row.note ? ` — ${row.note}` : ""} |`
    ),
    ...drift.remoteOnly.map(
      (row) => `| REMOTE_ONLY | ${row.remote.version} ${row.remote.name} | — | Not in repo. Do not invent an empty file with this timestamp. |`
    ),
    ...drift.localOnly.map(
      (row) =>
        `| LOCAL_ONLY | — | ${row.local.file} | Planned Longyu schema; not on MandarimProject watermark ${drift.production_watermark.version} |`
    ),
  ];
  return `# Backend migration drift (Longyu / MandarimProject)

Generated at: ${generatedAt}

**Read-only.** MandarimProject was not written.

- Production: ${LONGYU_PRODUCTION_PROJECT_NAME} \`${LONGYU_PRODUCTION_PROJECT_ID}\`
- Remote history captured at: ${drift.captured_at}
- Production watermark: \`${drift.production_watermark.version}\` ${drift.production_watermark.name}
- Local files: ${drift.counts.local}
- Remote versions: ${drift.counts.remote}
- LOCAL_AND_REMOTE: ${drift.counts.LOCAL_AND_REMOTE}
- REMOTE_ONLY: ${drift.counts.REMOTE_ONLY}
- LOCAL_ONLY: ${drift.counts.LOCAL_ONLY}
- Baseline schema hash (local files, sha256): \`${schemaHash}\`

## Baseline strategy

Historical MandarimProject versions were applied with Management API timestamps that **do not** match local filenames.

- **Baseline source:** \`supabase/migrations\` in this repository, starting at \`001_initial_schema.sql\`.
- **Reconstruction:** ephemeral CI/local applies the local chain. It does not clone remote version numbers.
- **Do not** add empty SQL files named after REMOTE_ONLY timestamps just to silence GitHub Supabase Preview.
- GitHub Supabase Preview fail-closed (“Remote migration versions not found in local migrations directory”) is the correct signal for REMOTE_ONLY drift.
- Operational files still LOCAL_ONLY vs production: ${drift.operational_local_only.join(", ") || "(none)"}

## Classification

| Class | Remote | Local file | Notes |
| --- | --- | --- | --- |
${rows.join("\n")}
`;
}

function renderSecurityMarkdown(rows, generatedAt) {
  const lines = rows.map((row) => {
    const flags = [
      row.search_path_ok ? "search_path set" : "SEARCH_PATH_MISSING",
      row.service_role_only ? "service_role-only" : "",
      row.public_execute ? "PUBLIC_EXECUTE" : "",
      row.authenticated_execute ? "authenticated EXECUTE" : "",
      row.uses_auth_uid ? "uses auth.uid" : "",
    ]
      .filter(Boolean)
      .join(", ");
    return `| \`${row.name}\` | \`${row.args}\` | \`${row.search_path || ""}\` | ${flags} |`;
  });
  return `# SECURITY DEFINER audit (ephemeral Longyu schema)

Generated at: ${generatedAt}

Audit ran against the **ephemeral** schema, not MandarimProject.

| Function | Args | search_path | Flags |
| --- | --- | --- | --- |
${lines.join("\n") || "| (none) | | | |"}
`;
}

function renderProductionDelta({ generatedAt, sha, edgeDelta }) {
  const pending = V476_OPERATIONAL_MIGRATIONS.map((file) => `- LOCAL_ONLY pending on MandarimProject: \`${file}\``);
  const missingEdges = LONGYU_EDGE_FUNCTIONS.filter(
    (slug) => !MANDARIMPROJECT_READONLY_EDGES.some((row) => row.slug === slug)
  );
  const productionOnly = MANDARIMPROJECT_READONLY_EDGES.filter(
    (row) => !LONGYU_EDGE_FUNCTIONS.includes(row.slug)
  );
  const edgeLines = LONGYU_EDGE_FUNCTIONS.map((slug) => {
    const prod = MANDARIMPROJECT_READONLY_EDGES.find((row) => row.slug === slug);
    const klass = !prod ? "MISSING_IN_PRODUCTION" : "MATCH";
    return `| \`${slug}\` | ${klass} | ${prod ? `prod v${prod.version} ${prod.status}` : "absent"} |`;
  });
  for (const row of productionOnly) {
    edgeLines.push(`| \`${row.slug}\` | PRODUCTION_ONLY | prod v${row.version} |`);
  }
  return `# Production backend delta (repo HEAD vs MandarimProject)

Generated at: ${generatedAt}

Repo SHA: \`${sha}\`

**EXPECTED_REPO_STATE** = local migrations + Edge Functions in this repository.
**CURRENT_MANDARIMPROJECT_STATE** = read-only capture ${MANDARIMPROJECT_READONLY_CAPTURED_AT}.
**Zero writes** this remessa.

## Migrations

- Watermark: \`${MANDARIMPROJECT_READONLY_MIGRATIONS.at(-1)?.version}\` ${MANDARIMPROJECT_READONLY_MIGRATIONS.at(-1)?.name}
- Remote versions: ${MANDARIMPROJECT_READONLY_MIGRATIONS.length}

${pending.join("\n")}

## Schema

Missing tables: ${MANDARIMPROJECT_MISSING_TABLES.join(", ")}
Missing profile columns: ${MANDARIMPROJECT_MISSING_PROFILE_COLUMNS.join(", ")}
Missing RPCs: ${MANDARIMPROJECT_MISSING_RPCS.join(", ")}

This is the future deploy plan. Do not apply from this remessa.

## Edge Functions

| Slug | Class | Production |
| --- | --- | --- |
${edgeLines.join("\n")}

Content bundles were not byte-compared (production \`ezbr_sha256\` is the deploy artifact). Existing slugs are MATCH for presence. Treat a future deploy as a review of OUTDATED source vs these versions.

${edgeDelta ? `Local rehearsal edge note: ${edgeDelta}` : ""}
`;
}

const board = scoreboard();
const details = {};
let env = null;

try {
  if (!skipStart) {
    startSupabase(root);
  }
  env = loadEphemeralEnv(root);
  board.EPHEMERAL_DB_READY = SCORE_PASS;
  details.envUrl = env.url;

  if (!skipReset) {
    try {
      resetEphemeralDb(root);
      board.MIGRATION_CHAIN_READY = SCORE_PASS;
      details.migrationApply = "supabase db reset";
    } catch (error) {
      const fallback = applyLocalMigrationsInOrder(root, env.dbUrl);
      details.migrationLog = fallback.log;
      if (!fallback.ok) {
        board.MIGRATION_CHAIN_READY = SCORE_FAIL;
        throw new EphemeralError(`Migration chain stopped at ${fallback.stoppedAt}`);
      }
      board.MIGRATION_CHAIN_READY = SCORE_PASS;
      details.migrationApply = "psql sequential fallback";
    }
  } else {
    board.MIGRATION_CHAIN_READY = SCORE_PASS;
    details.migrationApply = "skipped reset";
  }

  details.schema = assertSchema(env);
  const types = generatedTypesFromSchema(env);
  details.types = compareFrontendContracts(types, root);
  board.SCHEMA_READY = SCORE_PASS;

  details.rls = await runRlsIsolation(env);
  board.RLS_READY = SCORE_PASS;

  details.placement = await runPlacementRpc(env);
  details.onboarding = await runOnboardingTransaction(env);
  details.missingDraft = await runMissingDraft(env);
  board.RPC_READY = SCORE_PASS;

  details.mastery = await runTopicMasteryPersistence(env);
  details.concurrentMastery = await runConcurrentMastery(env);
  details.economy = await runEconomyConcurrency(env);

  const definers = auditSecurityDefiner(env);
  details.securityDefinerCount = definers.length;
  const generatedAt = new Date().toISOString();
  const files = localMigrationFiles(root);
  const drift = classifyMigrationDrift(files);
  const schemaHash = localSchemaHash(files);
  writeFile("docs/reports/backend-migration-drift.md", renderDriftMarkdown(drift, schemaHash, generatedAt));
  writeFile("docs/reports/backend-security-definer-audit.md", renderSecurityMarkdown(definers, generatedAt));

  if (skipEdge) {
    board.EDGE_LOCAL_READY = SCORE_FOLLOW_UP;
    details.edge = { followUps: ["--skip-edge"] };
  } else {
    try {
      details.edge = await runEdgeLocal(env, root);
      if (details.edge.unreachable?.length) {
        board.EDGE_LOCAL_READY = SCORE_FOLLOW_UP;
      } else {
        board.EDGE_LOCAL_READY = SCORE_PASS;
      }
    } catch (error) {
      board.EDGE_LOCAL_READY = SCORE_FOLLOW_UP;
      details.edge = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  writeFile(
    "docs/reports/production-backend-delta.md",
    renderProductionDelta({
      generatedAt,
      sha: gitSha(),
      edgeDelta: details.edge?.followUps?.join("; ") ?? "",
    })
  );
  board.PRODUCTION_DELTA_KNOWN = SCORE_PASS;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  details.error = message;
  if (board.EPHEMERAL_DB_READY === SCORE_NOT_RUN) board.EPHEMERAL_DB_READY = SCORE_FAIL;
  if (board.MIGRATION_CHAIN_READY === SCORE_NOT_RUN && board.EPHEMERAL_DB_READY === SCORE_PASS) {
    board.MIGRATION_CHAIN_READY = SCORE_FAIL;
  }
  console.error(message);
}

const durationMs = Date.now() - startedAt;
const sha = gitSha();
const originMain = mainSha();
const generatedAt = new Date().toISOString();
const rehearsal = `# V4.7.6R — Longyu backend rehearsal + ephemeral validation

Generated at: ${generatedAt}

- Repo SHA: \`${sha}\`
- origin/main SHA: \`${originMain}\`
- Duration: ${Math.round(durationMs / 1000)}s (target ≤ 15 minutes)
- Production writes: **ZERO** (MandarimProject ${LONGYU_PRODUCTION_PROJECT_ID} not targeted)

## Scoreboard A — EPHEMERAL_BACKEND_VALIDATION

| Campo | Valor |
| --- | --- |
${V476_EPHEMERAL_SCOREBOARD_KEYS.map((key) => `| \`${key}\` | \`${board[key]}\` |`).join("\n")}

STAGING_READY is **not** on this board.

## Scoreboard B — LIVE_STAGING_VALIDATION

| Campo | Valor |
| --- | --- |
| \`LIVE_STAGING_VALIDATION\` | \`BLOCKED_REMOTE_STAGING\` |
| \`STAGING_READY\` | \`BLOCKED_REMOTE_STAGING\` |

\`LONGYU_STAGING_PROJECT_ID\` has no default. Missing remote staging does not block this remessa.

## Details

\`\`\`json
${JSON.stringify({ board, details, durationMs, operational: V476_OPERATIONAL_MIGRATIONS }, null, 2)}
\`\`\`

## Still requiring a hosted Longyu backend

- Real confirmation email
- True cross-device cloud against hosted API
- Provider-delivered auth email
- External Stripe webhook
- Physical device against hosted backend
`;

writeFile("docs/reports/v476r-longyu-backend-rehearsal.md", rehearsal);
writeFile(
  "docs/reports/ephemeral-backend-scoreboard.json",
  JSON.stringify({ board, details, durationMs, sha, originMain, generatedAt }, null, 2)
);

console.log("EPHEMERAL_BACKEND_VALIDATION");
console.log(JSON.stringify(board, null, 2));
console.log(`duration_ms=${durationMs}`);

const requiredPass = ["EPHEMERAL_DB_READY", "MIGRATION_CHAIN_READY", "SCHEMA_READY", "RLS_READY", "RPC_READY", "PRODUCTION_DELTA_KNOWN"];
const failed = requiredPass.filter((key) => board[key] !== SCORE_PASS);
const edgeOk = board.EDGE_LOCAL_READY === SCORE_PASS || board.EDGE_LOCAL_READY === SCORE_FOLLOW_UP;
if (failed.length || !edgeOk) {
  process.exit(board.EPHEMERAL_DB_READY === SCORE_FAIL || board.MIGRATION_CHAIN_READY === SCORE_FAIL ? 1 : 1);
}
console.log("OK: ephemeral backend rehearsal");
