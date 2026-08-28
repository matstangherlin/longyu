/**
 * Longyu project guards.
 *
 * This repository knows one production backend: MandarimProject.
 * Remote staging is optional (LONGYU_STAGING_PROJECT_ID) with no default.
 * Missing remote staging does not block ephemeral/local validation.
 */
export const LONGYU_PRODUCTION_PROJECT_ID = "drjcfalvlbbeblmmyhwj";
export const LONGYU_PRODUCTION_PROJECT_NAME = "MandarimProject";

export const REFUSING_TO_USE_PRODUCTION_AS_STAGING = "REFUSING_TO_USE_PRODUCTION_AS_STAGING";
export const BLOCKED_REMOTE_STAGING = "BLOCKED_REMOTE_STAGING";

export class StagingGuardError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.name = "StagingGuardError";
    this.exitCode = exitCode;
  }
}

export function extractProjectRef(urlOrId) {
  const raw = String(urlOrId ?? "").trim();
  if (!raw) return "";
  const hosted = raw.match(/^https?:\/\/([a-z0-9]+)(?:\.supabase\.co)(?:\/|$)/i);
  if (hosted) return hosted[1].toLowerCase();
  const dbHost = raw.match(/^https?:\/\/db\.([a-z0-9]+)\.supabase\.co(?:\/|$)/i);
  if (dbHost) return dbHost[1].toLowerCase();
  if (/^[a-z0-9]{20}$/i.test(raw)) return raw.toLowerCase();
  return raw.toLowerCase();
}

export function isProductionProjectId(urlOrId) {
  return extractProjectRef(urlOrId) === LONGYU_PRODUCTION_PROJECT_ID;
}

export function assertNotProduction(urlOrId, label = "project_id") {
  const ref = extractProjectRef(urlOrId);
  if (!ref) {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} ${label} ausente. Defina um projeto Longyu isolado; nunca ${LONGYU_PRODUCTION_PROJECT_NAME}.`
    );
  }
  if (isProductionProjectId(ref)) {
    throw new StagingGuardError(
      `${REFUSING_TO_USE_PRODUCTION_AS_STAGING} HARD FAIL: ${label}=${ref} é ` +
        `${LONGYU_PRODUCTION_PROJECT_NAME} de produção. Recusado. Use um projeto de staging isolado ` +
        "ou validação efêmera local/CI."
    );
  }
  return ref;
}

/**
 * Destructive/rehearsal remote ops: require LONGYU_TARGET_PROJECT_ID
 * (fallback: LONGYU_STAGING_PROJECT_ID) and refuse production.
 */
export function requireRemoteRehearsalTarget(env = process.env, label = "LONGYU_TARGET_PROJECT_ID") {
  const target = String(env.LONGYU_TARGET_PROJECT_ID ?? "").trim();
  const staging = String(env.LONGYU_STAGING_PROJECT_ID ?? "").trim();
  const id = target || staging;
  if (!id) {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} ${label} / LONGYU_STAGING_PROJECT_ID ausente. ` +
        "Operação remota de rehearsal/staging não corre. Validação efêmera não usa este guard."
    );
  }
  return assertNotProduction(id, target ? "LONGYU_TARGET_PROJECT_ID" : "LONGYU_STAGING_PROJECT_ID");
}

export function requireStagingProjectId(env = process.env) {
  const id = String(env.LONGYU_STAGING_PROJECT_ID ?? "").trim();
  if (!id) {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} LONGYU_STAGING_PROJECT_ID ausente. ` +
        "Não há staging remoto Longyu configurado. Isso não bloqueia o rehearsal efêmero."
    );
  }
  return assertNotProduction(id, "LONGYU_STAGING_PROJECT_ID");
}

export function requireHealthyStagingStatus(status, projectId) {
  if (status !== "ACTIVE_HEALTHY") {
    throw new StagingGuardError(
      `${BLOCKED_REMOTE_STAGING} staging ${projectId} status=${status || "UNKNOWN"}. ` +
        "Não aplicar migrations nem deploy. Exige ACTIVE_HEALTHY. " +
        "Use o rehearsal efêmero enquanto o remoto não existir."
    );
  }
}

export function assertStagingUrlMatches(url, stagingId, label = "STAGING_SUPABASE_URL") {
  const urlRef = extractProjectRef(url);
  if (!urlRef) {
    throw new StagingGuardError(`${label} ausente ou inválida.`);
  }
  assertNotProduction(urlRef, label);
  const expected = extractProjectRef(stagingId);
  if (expected && urlRef !== expected) {
    throw new StagingGuardError(
      `${label} ref=${urlRef} não coincide com LONGYU_STAGING_PROJECT_ID=${expected}.`
    );
  }
  return urlRef;
}

export function failClosed(error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof StagingGuardError ? error.exitCode : 2;
  console.error(message);
  process.exit(code);
}

export function supabaseApiUrl(projectId) {
  const ref = extractProjectRef(projectId);
  return ref ? `https://${ref}.supabase.co` : "";
}
