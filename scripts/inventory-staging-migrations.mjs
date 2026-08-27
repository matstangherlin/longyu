#!/usr/bin/env node
/**
 * STG-002 — inventário ordenado de migrations.
 * Não aplica nada. Hard fail se o alvo for produção.
 */
import fs from "node:fs";
import path from "node:path";
import {
  LONGYU_INTENDED_STAGING_PROJECT_ID,
  LONGYU_INTENDED_STAGING_PROJECT_NAME,
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  isProductionProjectId,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

/** Última migration conhecida em MandarimProject (MCP list_migrations 2026-08-27T22:18Z). Não aplicar daqui. */
const PRODUCTION_WATERMARK = {
  version: "20260810175737",
  name: "beta_experience_telemetry",
  as_of: "2026-08-27T22:18Z",
  source: "MCP list_migrations MandarimProject — DO_NOT_APPLY",
};

const STAGING_PENDING = [
  "20260812180000_production_help_telemetry.sql",
  "20260813180000_pearl_pro_economy.sql",
  "20260814010000_mastery_pass_telemetry.sql",
  "20260825043000_business_foundation.sql",
  "20260825062000_business_operational_hardening.sql",
  "20260826230000_placement_onboarding.sql",
  "20260827023000_placement_onboarding_handoff.sql",
];

function localFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
}

try {
  const stagingId = process.env.LONGYU_STAGING_PROJECT_ID
    ? requireStagingProjectId(process.env)
    : LONGYU_INTENDED_STAGING_PROJECT_ID;
  if (isProductionProjectId(stagingId)) {
    console.error("HARD FAIL: inventário recusou MandarimProject.");
    process.exit(2);
  }

  const files = localFiles();
  const inventory = files.map((file) => {
    const version = file.replace(/\.sql$/, "").split("_")[0];
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    const pendingOnStaging = STAGING_PENDING.includes(file);
    const afterProd = version > PRODUCTION_WATERMARK.version;
    return {
      version,
      name,
      file,
      production: afterProd ? "NOT_APPLIED (watermark)" : "APPLIED_OR_OLDER (watermark)",
      staging: pendingOnStaging ? "BLOCKED — staging INACTIVE" : "unknown_until_staging_active",
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
    staging: {
      project_id: stagingId,
      name: LONGYU_INTENDED_STAGING_PROJECT_NAME,
      status: "INACTIVE_OR_UNCONFIRMED",
      action: "APPLY_ONLY_WHEN_ACTIVE_HEALTHY",
    },
    ordered_repo_migrations: inventory,
    next_on_staging: STAGING_PENDING,
  };

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
