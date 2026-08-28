/**
 * LIVE_STAGING_VALIDATION runner.
 * Default: probe + fail-closed. Não aplica DDL nem deploy sem --apply/--deploy
 * e ACTIVE_HEALTHY. Nunca aponta para MandarimProject.
 * Ausência de LONGYU_STAGING_PROJECT_ID = BLOCKED_REMOTE_STAGING (não é EPHEMERAL).
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import {
  BLOCKED_REMOTE_STAGING,
  StagingGuardError,
  failClosed,
  requireHealthyStagingStatus,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";
import { fetchSupabaseProject } from "./lib/staging-api.mjs";
import { V476_LIVE_SCOREBOARD_KEYS, V476_OPERATIONAL_MIGRATIONS } from "./lib/v476-constants.mjs";

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
  const board = { mode: "LIVE_STAGING_VALIDATION" };
  for (const key of V476_LIVE_SCOREBOARD_KEYS) board[key] = "BLOCKED";
  board.STAGING_READY = BLOCKED_REMOTE_STAGING;
  board.LIVE_STAGING_VALIDATION = BLOCKED_REMOTE_STAGING;
  board.reason = reason;
  board.physical_qa_ready = "NOT_IN_SCOPE";
  board.payments_ready = "NOT_IN_SCOPE";
  board.ready_for_closed_beta_br = "NOT_IN_SCOPE";
  board.note =
    "STAGING_READY não é sinônimo do scoreboard efêmero. Use npm run rehearse:ephemeral.";
  return board;
}

try {
  const stagingId = requireStagingProjectId(env);

  const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  let status = "UNKNOWN";
  if (token) {
    const project = await fetchSupabaseProject(token, stagingId);
    status = project.status ?? "UNKNOWN";
    console.log(
      JSON.stringify({
        mode: "LIVE_STAGING_VALIDATION",
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
        mode: "LIVE_STAGING_VALIDATION",
        project_id: stagingId,
        status,
        timestamp: new Date().toISOString(),
        note: "SUPABASE_ACCESS_TOKEN ausente — status remoto não confirmado neste processo",
      })
    );
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} sem token de Management API neste runner. Não aplicar migrations remotas.`
    );
  }

  console.log("Pendentes operacionais (não aplicadas nesta invocação default):");
  for (const file of V476_OPERATIONAL_MIGRATIONS) console.log(`  - ${file}`);

  if (wantApply) {
    const migrate = runNode("scripts/apply-staging-migrations.mjs");
    process.stdout.write(migrate.stdout);
    process.stderr.write(migrate.stderr);
    if (migrate.status !== 0) {
      throw new StagingGuardError("LIVE_STAGING PAROU em migrate:staging. Não continuar.");
    }
  } else {
    console.log("migrate:staging não executado (passe --apply só com ACTIVE_HEALTHY).");
  }

  if (wantDeploy) {
    const deploy = runNode("scripts/deploy-staging-functions.mjs");
    process.stdout.write(deploy.stdout);
    process.stderr.write(deploy.stderr);
    if (deploy.status !== 0) {
      throw new StagingGuardError("LIVE_STAGING PAROU em deploy:staging-functions. Não continuar.");
    }
  } else {
    console.log("deploy:staging-functions não executado (passe --deploy só com ACTIVE_HEALTHY).");
  }

  if (args.has("--identity")) {
    for (const script of [
      "scripts/v476-auth-identity.mjs",
      "scripts/v476-placement-authority.mjs",
      "scripts/v476-sync-identity.mjs",
      "scripts/test-rls-staging.mjs",
    ]) {
      const result = runNode(script);
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      if (result.status !== 0) {
        throw new StagingGuardError(`LIVE_STAGING PAROU em ${script}. Não continuar.`);
      }
    }
  } else {
    console.log("identity live não executado (passe --identity só com ACTIVE_HEALTHY + credenciais).");
  }

  console.log("LIVE_STAGING_VALIDATION chegou em ACTIVE_HEALTHY.");
} catch (error) {
  const board = blockedScoreboard(error instanceof Error ? error.message : String(error));
  console.log("V476_LIVE_SCOREBOARD");
  console.log(JSON.stringify(board, null, 2));
  failClosed(error);
}
