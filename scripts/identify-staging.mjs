/**
 * Identify an optional isolated Longyu remote staging project.
 * Hard fail if the target is MandarimProject.
 * Missing LONGYU_STAGING_PROJECT_ID → BLOCKED_REMOTE_STAGING (does not block ephemeral).
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import { fetchSupabaseProject } from "./lib/staging-api.mjs";
import {
  BLOCKED_REMOTE_STAGING,
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  StagingGuardError,
  failClosed,
  isProductionProjectId,
  requireHealthyStagingStatus,
  requireStagingProjectId,
  supabaseApiUrl,
} from "./lib/staging-guard.mjs";

const env = mergedEnv();
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();

try {
  console.log("LIVE_STAGING_VALIDATION");
  console.log(`production_forbidden_id=${LONGYU_PRODUCTION_PROJECT_ID} (${LONGYU_PRODUCTION_PROJECT_NAME})`);
  console.log("LONGYU_STAGING_PROJECT_ID has no default. Ephemeral validation does not need it.");

  const stagingId = requireStagingProjectId(env);

  const record = {
    project_id: stagingId,
    project_name: null,
    region: null,
    status: null,
    supabase_url: supabaseApiUrl(stagingId),
    identified_at: new Date().toISOString(),
  };

  if (token) {
    const match = await fetchSupabaseProject(token, stagingId);
    record.project_name = match.name ?? null;
    record.region = match.region ?? null;
    record.status = match.status ?? null;
    record.supabase_url = supabaseApiUrl(match.ref ?? match.id);
  } else {
    console.log("SUPABASE_ACCESS_TOKEN ausente — status remoto não confirmado.");
  }

  console.log("STAGE-001 record:");
  console.log(JSON.stringify(record, null, 2));

  if (isProductionProjectId(record.project_id)) {
    throw new StagingGuardError("HARD FAIL: staging resolveu para produção.");
  }
  if (record.status && record.status !== "ACTIVE_HEALTHY") {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} staging ${record.project_id} status=${record.status}. ` +
        "Não aplicar migrations nem deploy."
    );
  }
  if (!record.status) {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} não foi possível confirmar ACTIVE_HEALTHY. ` +
        "Defina SUPABASE_ACCESS_TOKEN ou provisione staging Longyu isolado."
    );
  }

  requireHealthyStagingStatus(record.status, stagingId);
  console.log("OK: staging Longyu isolado identificado e ACTIVE_HEALTHY.");
} catch (error) {
  failClosed(error);
}
