/**
 * V4.7.6 live runner.
 * Default: probe + fail-closed. Não aplica DDL nem deploy sem --apply/--deploy
 * e ACTIVE_HEALTHY. Nunca aponta para MandarimProject ou atomurus.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import {
  LONGYU_INTENDED_STAGING_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_ID,
  StagingGuardError,
  failClosed,
  requireHealthyStagingStatus,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";
import { fetchSupabaseProject } from "./lib/staging-api.mjs";
import { V476_OPERATIONAL_MIGRATIONS, V476_SCOREBOARD_KEYS } from "./lib/v476-constants.mjs";

const root = projectRoot();
const env = mergedEnv();
const args = new Set(process.argv.slice(2));
const wantApply = args.has("--apply");
const wantDeploy = args.has("--deploy");

function runNode(script, extraArgs = []) {
  return spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function blockedScoreboard(reason) {
  const board = {};
  for (const key of V476_SCOREBOARD_KEYS) board[key] = "BLOCKED";
  board.reason = reason;
  board.physical_qa_ready = "NOT_IN_SCOPE";
  board.payments_ready = "NOT_IN_SCOPE";
  board.ready_for_closed_beta_br = "NOT_IN_SCOPE";
  return board;
}

try {
  const stagingId = requireStagingProjectId(env);
  if (stagingId === LONGYU_PRODUCTION_PROJECT_ID) {
    throw new StagingGuardError("HARD FAIL: V4.7.6 recusou produção.");
  }

  const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  let status = "UNKNOWN";
  if (token) {
    const project = await fetchSupabaseProject(token, stagingId);
    status = project.status ?? "UNKNOWN";
    console.log(
      JSON.stringify({
        project_id: project.id ?? stagingId,
        name: project.name ?? null,
        region: project.region ?? null,
        status,
        database_version: project.database?.version ?? null,
        timestamp: new Date().toISOString(),
      })
    );
    requireHealthyStagingStatus(status, stagingId);
  } else {
    console.log(
      JSON.stringify({
        project_id: stagingId,
        intended: LONGYU_INTENDED_STAGING_PROJECT_ID,
        status,
        timestamp: new Date().toISOString(),
        note: "SUPABASE_ACCESS_TOKEN ausente — status remoto não confirmado neste processo",
      })
    );
    throw new StagingGuardError(
      "V4.7.6 BLOCKED: sem token de Management API neste runner. " +
        "MCP live (sessão) registrou longyu-preview INACTIVE e restore 2 project limit. " +
        "Não aplicar migrations."
    );
  }

  console.log("Pendentes operacionais (não aplicadas nesta invocação default):");
  for (const file of V476_OPERATIONAL_MIGRATIONS) console.log(`  - ${file}`);

  if (wantApply) {
    const migrate = runNode("scripts/apply-staging-migrations.mjs");
    process.stdout.write(migrate.stdout);
    process.stderr.write(migrate.stderr);
    if (migrate.status !== 0) {
      throw new StagingGuardError("V4.7.6 PAROU em migrate:staging. Não continuar.");
    }
  } else {
    console.log("migrate:staging não executado (passe --apply só com ACTIVE_HEALTHY).");
  }

  if (wantDeploy) {
    const deploy = runNode("scripts/deploy-staging-functions.mjs");
    process.stdout.write(deploy.stdout);
    process.stderr.write(deploy.stderr);
    if (deploy.status !== 0) {
      throw new StagingGuardError("V4.7.6 PAROU em deploy:staging-functions. Não continuar.");
    }
  } else {
    console.log("deploy:staging-functions não executado (passe --deploy só com ACTIVE_HEALTHY).");
  }

  console.log("V4.7.6 live runner chegou em ACTIVE_HEALTHY; passos auth/sync ainda manuais/scripts dedicados.");
} catch (error) {
  const board = blockedScoreboard(error instanceof Error ? error.message : String(error));
  console.log("V476_SCOREBOARD");
  console.log(JSON.stringify(board, null, 2));
  failClosed(error);
}
