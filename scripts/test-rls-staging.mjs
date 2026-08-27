/**
 * RLS A≠B somente em staging isolado.
 * Não altera test:rls (ainda usado por gate:production).
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import {
  StagingGuardError,
  assertStagingUrlMatches,
  failClosed,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const root = projectRoot();
const env = mergedEnv();

try {
  const stagingId = requireStagingProjectId(env);
  const url = String(env.STAGING_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anon = String(env.STAGING_SUPABASE_ANON_KEY ?? "");
  const service = String(env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (!url || !anon || !service) {
    throw new StagingGuardError(
      "test:rls:staging exige STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY e STAGING_SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  assertStagingUrlMatches(url, stagingId);
  if (env.ALLOW_STAGING_SECURITY_TESTS !== "true") {
    throw new StagingGuardError(
      "Defina ALLOW_STAGING_SECURITY_TESTS=true para fixtures A≠B no staging."
    );
  }

  const result = spawnSync(process.execPath, ["scripts/test-rls-smoke.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      LONGYU_STAGING_ONLY: "true",
      LONGYU_STAGING_PROJECT_ID: stagingId,
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: anon,
      SUPABASE_SERVICE_ROLE_KEY: service,
    },
  });
  process.exit(result.status ?? 1);
} catch (error) {
  failClosed(error);
}
