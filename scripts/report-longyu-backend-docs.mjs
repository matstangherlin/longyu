/**
 * Write Longyu-only backend reports that do not need Docker.
 * Production data is the read-only MCP snapshot. No MandarimProject writes.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import { classifyMigrationDrift, localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import { V476_OPERATIONAL_MIGRATIONS } from "./lib/v476-constants.mjs";
import { LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
} from "./lib/staging-guard.mjs";
import {
  MANDARIMPROJECT_MISSING_ECONOMY_COLUMNS,
  MANDARIMPROJECT_MISSING_PROFILE_COLUMNS,
  MANDARIMPROJECT_MISSING_RPCS,
  MANDARIMPROJECT_MISSING_TABLES,
  MANDARIMPROJECT_READONLY_CAPTURED_AT,
  MANDARIMPROJECT_READONLY_EDGES,
  MANDARIMPROJECT_READONLY_MIGRATIONS,
} from "./lib/mandarimproject-readonly-snapshot.mjs";

const root = projectRoot();
const generatedAt = new Date().toISOString();
const files = localMigrationFiles(root);
const drift = classifyMigrationDrift(files);
const schemaHash = localSchemaHash(files);

function gitSha(ref = "HEAD") {
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function staticSecurityDefinerAudit() {
  const dir = path.join(root, "supabase", "migrations");
  const found = [];
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const re = /create or replace function public\.([a-z0-9_]+)\s*\(([^)]*)\)[\s\S]*?security definer([\s\S]*?)as \$\$/gi;
    let match;
    while ((match = re.exec(sql))) {
      const header = match[0];
      found.push({
        file,
        name: match[1],
        args: match[2].replace(/\s+/g, " ").trim(),
        search_path: /set search_path/i.test(header),
      });
    }
  }
  const latest = new Map();
  for (const row of found) latest.set(`${row.name}(${row.args})`, row);
  return [...latest.values()];
}

const definers = staticSecurityDefinerAudit();
const sha = gitSha();
const originMain = gitSha("origin/main");

const driftMd = `# Backend migration drift (Longyu / MandarimProject)

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
- Baseline source: \`supabase/migrations\` (\`001_initial_schema.sql\` onward)
- generated_at: ${generatedAt}

## Baseline strategy

MandarimProject migration versions were recorded with Management API timestamps that **do not** match local filenames (name matches, version drift).

Do **not** add empty SQL files named after REMOTE_ONLY timestamps to silence GitHub Supabase Preview. That check fail-closed (“Remote migration versions not found in local migrations directory”) is the correct drift signal.

Ephemeral reconstruction uses the local chain only. Remote history is not altered.

Operational LOCAL_ONLY files (planned schema, not on production watermark):

${drift.operational_local_only.map((file) => `- \`${file}\``).join("\n")}

## Classification

| Class | Remote | Local file | Notes |
| --- | --- | --- | --- |
${[
  ...drift.localAndRemote.map(
    (row) =>
      `| LOCAL_AND_REMOTE | ${row.remote.version} ${row.remote.name} | ${row.local.file} | ${row.match}${row.note ? ` — ${row.note}` : ""} |`
  ),
  ...drift.remoteOnly.map(
    (row) =>
      `| REMOTE_ONLY | ${row.remote.version} ${row.remote.name} | — | Not in repo. Do not invent an empty file with this timestamp. |`
  ),
  ...drift.localOnly.map(
    (row) =>
      `| LOCAL_ONLY | — | ${row.local.file} | Planned Longyu schema; not on MandarimProject watermark |`
  ),
].join("\n")}
`;

const securityMd = `# SECURITY DEFINER audit (Longyu)

Generated at: ${generatedAt}

Static pass over \`supabase/migrations\` (latest \`create or replace\` per signature). Live ephemeral audit runs in CI (\`npm run rehearse:ephemeral\`) and overwrites findings from the applied schema.

| Function | Args | search_path in creator header | File |
| --- | --- | --- | --- |
${definers.map((row) => `| \`${row.name}\` | \`${row.args}\` | ${row.search_path ? "yes" : "NO"} | \`${row.file}\` |`).join("\n")}
`;

const missingEdges = LONGYU_EDGE_FUNCTIONS.filter(
  (slug) => !MANDARIMPROJECT_READONLY_EDGES.some((row) => row.slug === slug)
);
const productionOnly = MANDARIMPROJECT_READONLY_EDGES.filter(
  (row) => !LONGYU_EDGE_FUNCTIONS.includes(row.slug)
);
const edgeLines = [
  ...LONGYU_EDGE_FUNCTIONS.map((slug) => {
    const prod = MANDARIMPROJECT_READONLY_EDGES.find((row) => row.slug === slug);
    return `| \`${slug}\` | ${prod ? "MATCH" : "MISSING_IN_PRODUCTION"} | ${prod ? `v${prod.version} ${prod.status}` : "absent"} |`;
  }),
  ...productionOnly.map((row) => `| \`${row.slug}\` | PRODUCTION_ONLY | v${row.version} |`),
];

const deltaMd = `# Production backend delta (repo HEAD vs MandarimProject)

Generated at: ${generatedAt}

Repo SHA: \`${sha}\`
origin/main: \`${originMain}\`

**EXPECTED_REPO_STATE** vs **CURRENT_MANDARIMPROJECT_STATE** (read-only capture ${MANDARIMPROJECT_READONLY_CAPTURED_AT}).

MandarimProject writes this remessa: **ZERO**.

## Migrations

Remote watermark: \`${MANDARIMPROJECT_READONLY_MIGRATIONS.at(-1)?.version}\` ${MANDARIMPROJECT_READONLY_MIGRATIONS.at(-1)?.name}

${V476_OPERATIONAL_MIGRATIONS.map((file) => `- migration pending: \`${file}\``).join("\n")}

## Schema

- column missing: ${MANDARIMPROJECT_MISSING_PROFILE_COLUMNS.join(", ")}
- economy column missing: ${MANDARIMPROJECT_MISSING_ECONOMY_COLUMNS.map((name) => `user_economy.${name}`).join(", ")}
- table missing: ${MANDARIMPROJECT_MISSING_TABLES.join(", ")}
- RPC missing: ${MANDARIMPROJECT_MISSING_RPCS.join(", ")}

## Edge (LON-026)

| Slug | Class | Production |
| --- | --- | --- |
${edgeLines.join("\n")}

MATCH means the slug is deployed. Bundle hash was not byte-compared. Missing slugs: ${missingEdges.join(", ") || "(none)"}.
`;

fs.writeFileSync(path.join(root, "docs/reports/backend-migration-drift.md"), driftMd);
fs.writeFileSync(path.join(root, "docs/reports/backend-security-definer-audit.md"), securityMd);
fs.writeFileSync(path.join(root, "docs/reports/production-backend-delta.md"), deltaMd);

const rehearsalMd = `# V4.7.6R — Longyu backend rehearsal + ephemeral validation

Generated at: ${generatedAt}

- Repo SHA: \`${sha}\`
- origin/main SHA: \`${originMain}\`
- Production writes: **ZERO** (MandarimProject \`${LONGYU_PRODUCTION_PROJECT_ID}\`)

## Scoreboard A — EPHEMERAL_BACKEND_VALIDATION

Filled by \`npm run rehearse:ephemeral\` / GitHub Actions \`backend-rehearsal\`. Values: PASS | FAIL | BLOCKED | NOT_RUN. \`EDGE_LOCAL_READY\` may be FOLLOW_UP.

| Campo | Valor |
| --- | --- |
| \`EPHEMERAL_DB_READY\` | \`NOT_RUN\` until CI/local \`supabase start\` |
| \`MIGRATION_CHAIN_READY\` | \`NOT_RUN\` until CI/local \`supabase db reset\` |
| \`SCHEMA_READY\` | \`NOT_RUN\` |
| \`RLS_READY\` | \`NOT_RUN\` |
| \`RPC_READY\` | \`NOT_RUN\` |
| \`EDGE_LOCAL_READY\` | \`FOLLOW_UP\` until the Edge job runs |
| \`PRODUCTION_DELTA_KNOWN\` | \`PASS\` |

\`STAGING_READY\` is **not** on this board and is not a synonym of \`EPHEMERAL_DB_READY\`.

## Scoreboard B — LIVE_STAGING_VALIDATION

| Campo | Valor |
| --- | --- |
| \`LIVE_STAGING_VALIDATION\` | \`BLOCKED_REMOTE_STAGING\` |
| \`STAGING_READY\` | \`BLOCKED_REMOTE_STAGING\` |

## Baseline

- schema hash: \`${schemaHash}\`
- drift: LOCAL_AND_REMOTE=${drift.counts.LOCAL_AND_REMOTE} REMOTE_ONLY=${drift.counts.REMOTE_ONLY} LOCAL_ONLY=${drift.counts.LOCAL_ONLY}
- operational pending on MandarimProject: ${V476_OPERATIONAL_MIGRATIONS.join(", ")}

## Still requiring a hosted Longyu backend

- Real confirmation email
- True cross-device cloud against hosted API
- Provider-delivered auth email
- External Stripe webhook
- Physical device against hosted backend
`;

fs.writeFileSync(path.join(root, "docs/reports/v476r-longyu-backend-rehearsal.md"), rehearsalMd);

console.log("Wrote Longyu-only drift / security / production delta / v476r reports");
console.log(`schema_hash=${schemaHash}`);
console.log(`LOCAL_AND_REMOTE=${drift.counts.LOCAL_AND_REMOTE} REMOTE_ONLY=${drift.counts.REMOTE_ONLY} LOCAL_ONLY=${drift.counts.LOCAL_ONLY}`);
