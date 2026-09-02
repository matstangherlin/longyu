/**
 * V4.7.7 — ephemeral backend contract rehearsal.
 * Never links MandarimProject. Never uses production DB password or access token.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import { SCORE_FAIL, SCORE_NOT_RUN, SCORE_PASS } from "./lib/v476-constants.mjs";
import { classifyMigrationDrift, localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import {
  V477_LOCAL_ONLY_CLASS,
  V477_REMOTE_ONLY_CLASS,
  V477_SCOREBOARD_KEYS,
} from "./lib/v477-constants.mjs";
import { assertFrozenMigrations, edgeSourceCatalog } from "./lib/schema-canonical.mjs";
import { describeProductionDelta } from "./lib/mandarimproject-schema-delta.mjs";
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  isProductionProjectId,
} from "./lib/staging-guard.mjs";
import {
  EphemeralError,
  loadEphemeralEnv,
  resetEphemeralDb,
  runConcurrentMastery,
  runEconomyConcurrency,
  startSupabase,
  verifySecondMigrationApplyIsNoop,
} from "./lib/ephemeral-backend.mjs";
import {
  assertLeastPrivilegeGrants,
  assertLiveRpcContract,
  assertRlsEnabled,
  dumpCanonicalSchema,
  runCourseLanguageBackendCompatibility,
  runCreateAccountEdge,
  runLocalAuthFlow,
  runMalformedMasteryMatrix,
  runMultiDeviceSyncContract,
  runMonotonicityMatrix,
  runOnboardingEdgeFlow,
  runPasswordRecoveryFlow,
  runRlsNegativeMatrix,
} from "./lib/v477-harness.mjs";
import {
  V489_BACKEND_RC,
  V489_DECISION,
  V489_PRODUCTION_WRITE_BOUNDARY,
  V489_SCOREBOARD,
  V489_SCOREBOARD_KEYS,
} from "./lib/v489-production-preflight.mjs";

const root = projectRoot();
const args = new Set(process.argv.slice(2));
const skipStart = args.has("--skip-start");
const skipReset = args.has("--skip-reset");
const skipEdge = args.has("--skip-edge");
const startedAt = Date.now();

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function writeFile(relative, contents) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

function boardInit() {
  const board = {
    remessa: "V4.7.7",
    mode: "EPHEMERAL_BACKEND_CONTRACT",
    production_writes: "ZERO",
    production_project: `${LONGYU_PRODUCTION_PROJECT_NAME} ${LONGYU_PRODUCTION_PROJECT_ID}`,
  };
  for (const key of V477_SCOREBOARD_KEYS) board[key] = SCORE_NOT_RUN;
  return board;
}

function requiredFail(board) {
  return V477_SCOREBOARD_KEYS.some((key) => board[key] === SCORE_FAIL);
}

function v489EvidenceBoard(board, details) {
  const evidence = { ...V489_SCOREBOARD };
  const classify = (passed, attempted) => (passed ? SCORE_PASS : attempted ? SCORE_FAIL : SCORE_NOT_RUN);
  const edgeAttempted = details.EDGE_CONTRACT_READY != null && typeof details.EDGE_CONTRACT_READY === "object";
  evidence.MIGRATION_REHEARSAL = classify(
    board.CANONICAL_SCHEMA_READY === SCORE_PASS && details.MIGRATION_SECOND_APPLY?.ok === true,
    Boolean(details.MIGRATION_SECOND_APPLY || details.error)
  );
  evidence.EDGE_CONTRACT = classify(
    board.EDGE_CONTRACT_READY === SCORE_PASS,
    edgeAttempted
  );
  evidence.RLS_A_NOT_B = classify(board.RLS_MATRIX_READY === SCORE_PASS, details.RLS_MATRIX_READY !== undefined);
  evidence.AUTH_EPHEMERAL = classify(
    board.LOCAL_AUTH_FLOW_READY === SCORE_PASS,
    details.LOCAL_AUTH_FLOW_READY !== undefined
  );
  evidence.PLACEMENT_EPHEMERAL = classify(
    details.EDGE_CONTRACT_READY?.createAcct?.localeCases?.some((row) => row.placementDraft === true) === true &&
      details.EDGE_CONTRACT_READY?.onboarding?.ok === true,
    edgeAttempted
  );
  evidence.FINALIZE_ONBOARDING_EPHEMERAL = classify(
    details.EDGE_CONTRACT_READY?.onboarding?.ok === true,
    edgeAttempted
  );
  evidence.SYNC_EPHEMERAL = classify(
    board.SYNC_MONOTONICITY_READY === SCORE_PASS,
    details.SYNC_MONOTONICITY_READY !== undefined
  );
  evidence.RECOVERY_EPHEMERAL = classify(
    details.RECOVERY_EPHEMERAL?.ok === true,
    Boolean(details.RECOVERY_EPHEMERAL || details.error)
  );
  evidence.COURSE_LANGUAGE_BACKEND_COMPATIBLE = classify(
    details.COURSE_LANGUAGE_BACKEND_COMPATIBLE?.ok === true &&
      details.EDGE_CONTRACT_READY?.createAcct?.localeCases?.length === 4,
    Boolean(details.COURSE_LANGUAGE_BACKEND_COMPATIBLE || edgeAttempted)
  );
  return evidence;
}

async function main() {
  const board = boardInit();
  const generatedAt = new Date().toISOString();
  const details = {};

  if (isProductionProjectId(process.env.SUPABASE_URL) || isProductionProjectId(process.env.LONGYU_TARGET_PROJECT_ID)) {
    throw new EphemeralError("RECUSADO: rehearsal apontou para MandarimProject.");
  }

  const files = localMigrationFiles(root);
  const drift = classifyMigrationDrift(files);
  const unclassifiedRemote = drift.remoteOnly.filter((row) => !V477_REMOTE_ONLY_CLASS[row.remote.version]);
  const unclassifiedLocal = drift.localOnly.filter((row) => !V477_LOCAL_ONLY_CLASS[row.local.file]);
  const freezeErrors = assertFrozenMigrations(root);
  if (unclassifiedRemote.length || unclassifiedLocal.length) {
    board.MIGRATION_HISTORY_UNDERSTOOD = SCORE_FAIL;
    details.MIGRATION_HISTORY_UNDERSTOOD = `unclassified remote=${unclassifiedRemote.length} local=${unclassifiedLocal.length}`;
  } else {
    board.MIGRATION_HISTORY_UNDERSTOOD = SCORE_PASS;
    details.MIGRATION_HISTORY_UNDERSTOOD = `${drift.counts.REMOTE_ONLY} REMOTE_ONLY + ${drift.counts.LOCAL_ONLY} LOCAL_ONLY classified`;
  }
  if (freezeErrors.length) {
    board.HISTORICAL_MIGRATIONS_FROZEN = SCORE_FAIL;
    details.HISTORICAL_MIGRATIONS_FROZEN = freezeErrors.join("; ");
  } else {
    board.HISTORICAL_MIGRATIONS_FROZEN = SCORE_PASS;
    details.HISTORICAL_MIGRATIONS_FROZEN = `${files.length} FROZEN hashes`;
  }

  const planPath = path.join(root, "docs/reports/mandarimproject-deployment-plan.md");
  const plan = fs.readFileSync(planPath, "utf8");
  board.PRODUCTION_DEPLOYMENT_PLAN_READY =
    /do not apply|não executar|NOT execute/i.test(plan) && /20260813180000_pearl_pro_economy/i.test(plan)
      ? SCORE_PASS
      : SCORE_FAIL;
  details.PRODUCTION_DEPLOYMENT_PLAN_READY = "plan on disk; not executed";

  const prodDelta = describeProductionDelta();
  details.PRODUCTION_DELTA = prodDelta;

  let env = null;
  try {
    if (!skipStart) startSupabase(root);
    env = loadEphemeralEnv(root);
    if (isProductionProjectId(env.url)) {
      throw new EphemeralError("RECUSADO: supabase status resolveu MandarimProject.");
    }
    if (!skipReset) resetEphemeralDb(root);
    details.MIGRATION_SECOND_APPLY = verifySecondMigrationApplyIsNoop(root);

    const dump = dumpCanonicalSchema(env);
    const baselineDir = path.join(root, "supabase/baseline");
    fs.mkdirSync(baselineDir, { recursive: true });
    writeFile(
      "supabase/baseline/canonical-schema.json",
      `${JSON.stringify({ remessa: "V4.7.7", hash: dump.hash, payload: dump.payload }, null, 2)}\n`
    );
    writeFile("supabase/baseline/LONGYU_BACKEND_SCHEMA_HASH", `${dump.hash}\n`);
    writeFile("docs/backend/canonical-schema.json", `${JSON.stringify({ hash: dump.hash, payload: dump.payload }, null, 2)}\n`);
    board.CANONICAL_SCHEMA_READY = SCORE_PASS;
    details.CANONICAL_SCHEMA_READY = dump.hash;

    const grants = assertLeastPrivilegeGrants(env);
    board.GRANT_SURFACE_READY = SCORE_PASS;
    details.GRANT_SURFACE_READY = grants;

    const rls = assertRlsEnabled(env);
    const matrix = await runRlsNegativeMatrix(env);
    board.RLS_MATRIX_READY = SCORE_PASS;
    details.RLS_MATRIX_READY = { rls, matrix: matrix.results };

    const rpc = assertLiveRpcContract(env);
    board.RPC_CONTRACT_READY = SCORE_PASS;
    details.RPC_CONTRACT_READY = rpc;

    const mono = await runMonotonicityMatrix(env);
    const malformed = await runMalformedMasteryMatrix(env);
    const race = await runConcurrentMastery(env);
    const economy = await runEconomyConcurrency(env);
    const multiDevice = await runMultiDeviceSyncContract(env);
    board.SYNC_MONOTONICITY_READY = SCORE_PASS;
    details.SYNC_MONOTONICITY_READY = { mono, malformed, race, economy, multiDevice };

    const auth = await runLocalAuthFlow(env);
    board.LOCAL_AUTH_FLOW_READY = SCORE_PASS;
    details.LOCAL_AUTH_FLOW_READY = auth;

    details.RECOVERY_EPHEMERAL = await runPasswordRecoveryFlow(env);
    details.COURSE_LANGUAGE_BACKEND_COMPATIBLE = await runCourseLanguageBackendCompatibility(env);

    if (skipEdge) {
      board.EDGE_CONTRACT_READY = SCORE_NOT_RUN;
      details.EDGE_CONTRACT_READY = "skipped (--skip-edge)";
    } else {
      const createAcct = await runCreateAccountEdge(env);
      const onboarding = await runOnboardingEdgeFlow(env);
      const hashes = edgeSourceCatalog(root);
      board.EDGE_CONTRACT_READY = SCORE_PASS;
      details.EDGE_CONTRACT_READY = { createAcct, onboarding, hashes: hashes.map((row) => row.slug) };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const key of V477_SCOREBOARD_KEYS) {
      if (board[key] === SCORE_NOT_RUN) {
        if (
          key === "MIGRATION_HISTORY_UNDERSTOOD" ||
          key === "HISTORICAL_MIGRATIONS_FROZEN" ||
          key === "PRODUCTION_DEPLOYMENT_PLAN_READY"
        ) {
          continue;
        }
        board[key] = SCORE_FAIL;
      }
    }
    details.error = message.slice(0, 2000);
    console.error(`FAIL rehearse-backend-contract: ${message}`);
  }

  const scoreboardPath = "docs/reports/v477-backend-contract-scoreboard.json";
  writeFile(
    scoreboardPath,
    `${JSON.stringify(
      {
        generated_at: generatedAt,
        sha: gitSha(),
        duration_ms: Date.now() - startedAt,
        local_schema_hash: localSchemaHash(files),
        drift_counts: drift.counts,
        board,
        details,
      },
      null,
      2
    )}\n`
  );

  const rows = V477_SCOREBOARD_KEYS.map((key) => `| \`${key}\` | \`${board[key]}\` |`).join("\n");
  const report = `# V4.7.7 — CI scoreboard (ephemeral)

Generated at: ${generatedAt}

- Repo SHA: \`${gitSha()}\`
- Production writes: **ZERO** (${LONGYU_PRODUCTION_PROJECT_NAME} \`${LONGYU_PRODUCTION_PROJECT_ID}\`)
- Mailbox: local **Inbucket** (\`127.0.0.1:54324\`)
- Canonical schema hash: \`${details.CANONICAL_SCHEMA_READY ?? "NOT_RUN"}\`

Narrative freeze report: \`docs/reports/v477-backend-contract-freeze.md\`.

## Scoreboard

| Campo | Valor |
| --- | --- |
${rows}

## Drift

LOCAL_AND_REMOTE=${drift.counts.LOCAL_AND_REMOTE} REMOTE_ONLY=${drift.counts.REMOTE_ONLY} LOCAL_ONLY=${drift.counts.LOCAL_ONLY}

## Production delta (read-only)

${prodDelta.differences.map((row) => `- ${row.class}: ${row.name ?? row.table}`).join("\n")}
`;
  writeFile("docs/reports/v477-backend-contract-freeze.ci.md", report);

  const v489Board = v489EvidenceBoard(board, details);
  const v489Payload = {
    remessa: "V4.8.9",
    generated_at: generatedAt,
    sha: gitSha(),
    backend_rc: V489_BACKEND_RC,
    production_writes: 0,
    stripe_live_writes: 0,
    decision: V489_DECISION,
    boundary: V489_PRODUCTION_WRITE_BOUNDARY,
    board: v489Board,
    evidence: {
      migration_second_apply: details.MIGRATION_SECOND_APPLY ?? null,
      rls: details.RLS_MATRIX_READY ?? null,
      auth: details.LOCAL_AUTH_FLOW_READY ?? null,
      recovery: details.RECOVERY_EPHEMERAL ?? null,
      sync: details.SYNC_MONOTONICITY_READY ?? null,
      create_account: details.EDGE_CONTRACT_READY?.createAcct ?? null,
      placement_finalize: details.EDGE_CONTRACT_READY?.onboarding ?? null,
      course_language: details.COURSE_LANGUAGE_BACKEND_COMPATIBLE ?? null,
      error: details.error ?? null,
    },
  };
  writeFile("docs/reports/v489-ephemeral-scoreboard.json", `${JSON.stringify(v489Payload, null, 2)}\n`);
  const v489Rows = V489_SCOREBOARD_KEYS.map((key) => `| \`${key}\` | \`${v489Board[key]}\` |`).join("\n");
  writeFile(
    "docs/reports/v489-production-backend-preflight.ci.md",
    `# V4.8.9 — exact-run ephemeral evidence\n\n` +
      `Generated at: ${generatedAt}\n\n` +
      `- Repo SHA: \`${gitSha()}\`\n` +
      `- Backend RC: \`${V489_BACKEND_RC}\`\n` +
      `- Production writes: **ZERO**\n` +
      `- Stripe Live writes: **ZERO**\n` +
      `- Decision: \`${V489_DECISION}\`\n\n` +
      `| Gate | Status |\n| --- | --- |\n${v489Rows}\n\n` +
      `\`${V489_PRODUCTION_WRITE_BOUNDARY}\`\n`
  );

  if (requiredFail(board) || details.error) {
    process.exit(1);
  }
  console.log("OK: rehearse-backend-contract");
  for (const key of V477_SCOREBOARD_KEYS) {
    console.log(`  ${key}=${board[key]}`);
  }
  for (const key of V489_SCOREBOARD_KEYS) {
    console.log(`  V489.${key}=${v489Board[key]}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
