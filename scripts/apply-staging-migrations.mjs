/**
 * STAGE-002 — Aplicar migrations no staging isolado, em ordem, parando no primeiro erro.
 * Nunca defaulta para MandarimProject. Não usa o default perigoso de db:apply-api.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { fetchSupabaseProject } from "./lib/staging-api.mjs";
import {
  StagingGuardError,
  failClosed,
  requireHealthyStagingStatus,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const root = projectRoot();
const env = mergedEnv();
const args = new Set(process.argv.slice(2));
const planOnly = args.has("--plan");
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();
const migrationsDir = path.join(root, "supabase", "migrations");

const OPERATIONAL_PENDING = [
  "20260812180000_production_help_telemetry.sql",
  "20260813180000_pearl_pro_economy.sql",
  "20260814010000_mastery_pass_telemetry.sql",
  "20260825043000_business_foundation.sql",
  "20260825062000_business_operational_hardening.sql",
  "20260826230000_placement_onboarding.sql",
  "20260827023000_placement_onboarding_handoff.sql",
];

function localMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
}

function versionOf(filename) {
  return filename.replace(/\.sql$/, "").split("_")[0];
}

function slugOf(filename) {
  return filename.replace(/^\d+_/, "").replace(/\.sql$/, "");
}

function isApplied(filename, remote) {
  const version = versionOf(filename);
  const slug = slugOf(filename);
  return remote.some((row) => {
    const remoteVersion = String(row.version ?? "");
    const remoteName = String(row.name ?? "");
    return (
      remoteVersion === version ||
      remoteName === slug ||
      remoteName === `${version}_${slug}` ||
      remoteName.endsWith(slug)
    );
  });
}

async function fetchRemoteMigrations(projectId) {
  const url = `https://api.supabase.com/v1/projects/${projectId}/database/migrations`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new StagingGuardError(
      `Falha ao listar migrations do staging ${projectId}: ${response.status} ${text.slice(0, 1200)}`
    );
  }
  const body = text ? JSON.parse(text) : [];
  return Array.isArray(body) ? body : body.migrations ?? [];
}

async function applyOne(projectId, filename) {
  const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");
  const name = filename.replace(/\.sql$/, "");
  const started = Date.now();
  const timestamp = new Date().toISOString();
  const url = `https://api.supabase.com/v1/projects/${projectId}/database/migrations`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, name }),
  });
  const body = await response.text();
  const duration_ms = Date.now() - started;
  if (!response.ok) {
    const alreadyApplied =
      response.status === 400 &&
      (body.includes("already exists") || body.includes("duplicate key"));
    if (alreadyApplied) {
      return {
        version: versionOf(filename),
        file: filename,
        status: "ALREADY_APPLIED",
        timestamp,
        duration_ms,
        error: null,
      };
    }
    return {
      version: versionOf(filename),
      file: filename,
      status: "FAIL",
      timestamp,
      duration_ms,
      error: `${response.status}: ${body.slice(0, 1500)}`,
    };
  }
  return {
    version: versionOf(filename),
    file: filename,
    status: "PASS",
    timestamp,
    duration_ms,
    error: null,
  };
}

function printLog(entries) {
  console.log("STAGE-002 migration log:");
  for (const entry of entries) {
    console.log(
      JSON.stringify({
        version: entry.version,
        status: entry.status,
        timestamp: entry.timestamp,
        duration: entry.duration_ms,
        error: entry.error,
        file: entry.file,
      })
    );
  }
}

try {
  const stagingId = requireStagingProjectId(env);
  if (token) {
    const project = await fetchSupabaseProject(token, stagingId);
    requireHealthyStagingStatus(project.status, stagingId);
  }
  const files = localMigrationFiles();
  console.log(`Alvo staging=${stagingId}`);
  console.log(`Migrations locais: ${files.length}`);
  console.log("Pendentes operacionais (repo vs produção conhecida):");
  for (const file of OPERATIONAL_PENDING) {
    const exists = files.includes(file);
    console.log(`  - ${file}${exists ? "" : " (AUSENTE NO REPO)"}`);
  }

  if (!token) {
    printLog(
      OPERATIONAL_PENDING.map((file) => ({
        version: versionOf(file),
        file,
        status: "BLOCKED",
        timestamp: new Date().toISOString(),
        duration_ms: 0,
        error: "SUPABASE_ACCESS_TOKEN ausente; staging não confirmado",
      }))
    );
    throw new StagingGuardError(
      "STAGE-002 BLOCKED: sem token. Não aplicar. Não usar db:apply-api (defaulta produção)."
    );
  }

  const remote = await fetchRemoteMigrations(stagingId);
  const pending = files.filter((file) => !isApplied(file, remote));
  console.log(`Remotas aplicadas: ${remote.length}`);
  console.log(`Pendentes neste staging: ${pending.length}`);
  for (const file of pending) console.log(`  - ${file}`);

  if (planOnly) {
    printLog(
      pending.map((file) => ({
        version: versionOf(file),
        file,
        status: "PLANNED",
        timestamp: new Date().toISOString(),
        duration_ms: 0,
        error: null,
      }))
    );
    process.exit(pending.length === 0 ? 0 : 2);
  }

  if (pending.length === 0) {
    console.log("OK: nenhuma migration pendente neste staging.");
    process.exit(0);
  }

  const log = [];
  for (const file of pending) {
    const entry = await applyOne(stagingId, file);
    log.push(entry);
    if (entry.status === "FAIL") {
      printLog(log);
      throw new StagingGuardError(
        `STAGE-002 PAROU em ${file}: ${entry.error}. Não continuar.`
      );
    }
    console.log(`${entry.status === "PASS" ? "✓" : "↷"} ${file} (${entry.duration_ms}ms)`);
  }
  printLog(log);
  console.log("OK: migrations de staging aplicadas em ordem.");
} catch (error) {
  failClosed(error);
}
