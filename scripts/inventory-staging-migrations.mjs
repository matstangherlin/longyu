#!/usr/bin/env node
/**
 * Inventário local vs watermark de MandarimProject.
 * Não aplica nada. Hard fail se o alvo remoto for produção.
 */
import fs from "node:fs";
import path from "node:path";
import {
  BLOCKED_REMOTE_STAGING,
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  isProductionProjectId,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";
import { V476_OPERATIONAL_MIGRATIONS, V476_PRODUCTION_WATERMARK } from "./lib/v476-constants.mjs";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const PRODUCTION_WATERMARK = {
  ...V476_PRODUCTION_WATERMARK,
  as_of: "2026-08-28T00:50Z",
  source: "MCP list_migrations MandarimProject — DO_NOT_APPLY",
};

function localFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
}

try {
  let stagingId = null;
  let remoteStatus = BLOCKED_REMOTE_STAGING;
  if (String(process.env.LONGYU_STAGING_PROJECT_ID ?? "").trim()) {
    stagingId = requireStagingProjectId(process.env);
    if (isProductionProjectId(stagingId)) {
      console.error("HARD FAIL: inventário recusou MandarimProject.");
      process.exit(2);
    }
    remoteStatus = "UNCONFIRMED";
  }

  const files = localFiles();
  const inventory = files.map((file) => {
    const version = file.replace(/\.sql$/, "").split("_")[0];
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    const pendingOperational = V476_OPERATIONAL_MIGRATIONS.includes(file);
    const afterProd = version > PRODUCTION_WATERMARK.version;
    return {
      version,
      name,
      file,
      production: afterProd ? "NOT_APPLIED (watermark)" : "APPLIED_OR_OLDER (watermark)",
      remote_staging: stagingId ? "unknown_until_healthy" : BLOCKED_REMOTE_STAGING,
      operational_pending: pendingOperational,
    };
  });

  const payload = {
    generated_at: new Date().toISOString(),
    production: {
      project_id: LONGYU_PRODUCTION_PROJECT_ID,
      name: LONGYU_PRODUCTION_PROJECT_NAME,
      watermark: PRODUCTION_WATERMARK,
      action: "DO_NOT_APPLY",
    },
    remote_staging: {
      project_id: stagingId,
      status: remoteStatus,
    },
    ephemeral: {
      note: "EPHEMERAL_BACKEND_VALIDATION aplica a cadeia local sem projeto remoto.",
    },
    files: inventory,
  };

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
