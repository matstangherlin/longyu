/**
 * STAGE-004 — Deploy das Edge Functions no staging isolado.
 * Recusa MandarimProject. Não usa o default de produção de deploy-functions-env.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { fetchSupabaseProject } from "./lib/staging-api.mjs";
import { edgeFunctionCatalog, LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";
import {
  StagingGuardError,
  failClosed,
  requireHealthyStagingStatus,
  requireRemoteRehearsalTarget,
  supabaseApiUrl,
} from "./lib/staging-guard.mjs";

const root = projectRoot();
const env = mergedEnv();
const args = new Set(process.argv.slice(2));
const planOnly = args.has("--plan");
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

async function smokeSlug(baseUrl, slug) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/functions/v1/${slug}`, { method: "GET" });
    return {
      smoke_status: response.status === 404 ? "FAIL" : "REACHABLE",
      http_status: response.status,
      duration_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      smoke_status: "FAIL",
      http_status: null,
      duration_ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

try {
  const stagingId = requireRemoteRehearsalTarget(env);
  const catalog = edgeFunctionCatalog();
  const deployedAt = new Date().toISOString();
  const plan = catalog.map((item) => ({
    slug: item.slug,
    version: null,
    verify_jwt: item.verify_jwt,
    deployed_at: null,
    smoke_status: "NOT_RUN",
  }));

  console.log(`Alvo staging=${stagingId}`);
  console.log("STAGE-004 plan:");
  console.log(JSON.stringify(plan, null, 2));

  if (planOnly || !token) {
    throw new StagingGuardError(
      token
        ? "STAGE-004 --plan: nenhum deploy executado."
        : "STAGE-004 BLOCKED: sem SUPABASE_ACCESS_TOKEN. Não implantar em produção."
    );
  }

  const project = await fetchSupabaseProject(token, stagingId);
  requireHealthyStagingStatus(project.status, stagingId);

  if (run("npx", ["supabase", "--version"]) !== 0) {
    throw new StagingGuardError("STAGE-004 BLOCKED: Supabase CLI indisponível.");
  }
  if (run("npx", ["supabase", "login", "--token", token]) !== 0) {
    throw new StagingGuardError("STAGE-004 FAIL: supabase login.");
  }
  if (run("npx", ["supabase", "link", "--project-ref", stagingId, "--yes"]) !== 0) {
    throw new StagingGuardError(`STAGE-004 FAIL: supabase link ${stagingId}.`);
  }
  if (run("npx", ["supabase", "functions", "deploy", ...LONGYU_EDGE_FUNCTIONS]) !== 0) {
    throw new StagingGuardError("STAGE-004 FAIL: functions deploy. Parado.");
  }

  const baseUrl = supabaseApiUrl(stagingId);
  const records = [];
  for (const item of catalog) {
    const smoke = await smokeSlug(baseUrl, item.slug);
    records.push({
      slug: item.slug,
      version: "repo",
      verify_jwt: item.verify_jwt,
      deployed_at: deployedAt,
      smoke_status: smoke.smoke_status,
      http_status: smoke.http_status,
    });
  }
  console.log("STAGE-004 deployed:");
  console.log(JSON.stringify(records, null, 2));
  const failed = records.filter((row) => row.smoke_status === "FAIL");
  if (failed.length) {
    throw new StagingGuardError(
      `STAGE-004 smoke FAIL: ${failed.map((row) => row.slug).join(", ")}`
    );
  }
  console.log("OK: Edge Functions no staging.");
} catch (error) {
  failClosed(error);
}
