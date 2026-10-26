#!/usr/bin/env node
/**
 * LGY-039 — uma rotina de staging. Recusa produção antes de qualquer passo.
 * Não cria projeto, não aplica SQL e não publica função sozinha: só chama
 * os comandos que o Matty já apontou para um projeto isolado.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  REFUSING_TO_USE_PRODUCTION_AS_STAGING,
  StagingGuardError,
  assertNotProduction,
  extractProjectRef,
  failClosed,
  requireStagingProjectId,
  supabaseApiUrl,
} from "./lib/staging-guard.mjs";

const root = projectRoot();
const PRODUCTION_WEB_HOSTS = new Set([
  "singular-meringue-7838cd.netlify.app",
  "longyu.app",
  "www.longyu.app",
  "longyu.com.br",
  "www.longyu.com.br",
]);

export function assertQaStagingTargets(env = process.env) {
  const stagingId = requireStagingProjectId(env);
  const supabaseUrl = String(env.STAGING_SUPABASE_URL || supabaseApiUrl(stagingId)).trim();
  assertNotProduction(supabaseUrl, "STAGING_SUPABASE_URL");
  const urlRef = extractProjectRef(supabaseUrl);
  if (urlRef !== extractProjectRef(stagingId)) {
    throw new StagingGuardError(
      `STAGING_SUPABASE_URL ref=${urlRef} não coincide com LONGYU_STAGING_PROJECT_ID=${stagingId}.`
    );
  }
  const web = String(env.PLAYWRIGHT_BASE_URL ?? env.STAGING_WEB_URL ?? "").trim();
  if (!web) {
    throw new StagingGuardError(
      "PLAYWRIGHT_BASE_URL ausente. qa:staging não sobe o preview local e não chuta o site de produção."
    );
  }
  let host = "";
  try {
    host = new URL(web).hostname.toLowerCase();
  } catch {
    throw new StagingGuardError(`PLAYWRIGHT_BASE_URL inválida.`);
  }
  if (PRODUCTION_WEB_HOSTS.has(host) || host.includes(LONGYU_PRODUCTION_PROJECT_ID)) {
    throw new StagingGuardError(
      `${REFUSING_TO_USE_PRODUCTION_AS_STAGING} PLAYWRIGHT_BASE_URL host=${host} é o site de produção.`
    );
  }
  return { stagingId, supabaseUrl, web };
}

function run(label, command, args, env) {
  console.log(`qa:staging step=${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env });
  if (result.error) {
    throw new StagingGuardError(`qa:staging não conseguiu iniciar ${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const code = result.status ?? 1;
    throw new StagingGuardError(`qa:staging parou em ${label} (exit ${code}).`, code);
  }
}

function childEnv(base, supabaseUrl) {
  const anon = String(base.STAGING_SUPABASE_ANON_KEY ?? "").trim();
  return {
    ...base,
    LONGYU_STAGING_PROJECT_ID: extractProjectRef(base.LONGYU_STAGING_PROJECT_ID),
    STAGING_SUPABASE_URL: supabaseUrl,
    SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anon,
    VITE_SUPABASE_ANON_KEY: anon,
  };
}

function playwrightEnv(env) {
  const next = { ...env };
  delete next.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  delete next.SUPABASE_SERVICE_ROLE_KEY;
  delete next.SUPABASE_ACCESS_TOKEN;
  return next;
}

function main() {
  const env = mergedEnv();
  const { supabaseUrl, web } = assertQaStagingTargets(env);
  const shared = childEnv(env, supabaseUrl);
  shared.PLAYWRIGHT_BASE_URL = web;
  const node = process.execPath;
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  run("identify:staging", npm, ["run", "identify:staging"], shared);
  run("assert:staging-schema", npm, ["run", "assert:staging-schema"], shared);
  run("check:schema-health", npm, ["run", "check:schema-health"], shared);
  run("test:rls:staging", npm, ["run", "test:rls:staging"], shared);
  run("smoke:edge-preflight", npm, ["run", "smoke:edge-preflight"], shared);
  const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
  run(
    "playwright:@qa-staging",
    node,
    [playwrightCli, "test", "--grep", "@qa-staging", "--project=chromium"],
    playwrightEnv(shared)
  );
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    main();
  } catch (error) {
    failClosed(error);
  }
}
