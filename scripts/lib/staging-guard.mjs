/**
 * Proteção de staging Longyu (V4.7.3).
 *
 * MandarimProject de produção nunca é alvo de migrate/deploy/harness de staging.
 * Scripts de staging exigem LONGYU_STAGING_PROJECT_ID explícito.
 */
export const LONGYU_PRODUCTION_PROJECT_ID = "drjcfalvlbbeblmmyhwj";
export const LONGYU_PRODUCTION_PROJECT_NAME = "MandarimProject";
export const LONGYU_INTENDED_STAGING_PROJECT_ID = "wpnmygzxqvmpdlcuwrjp";
export const LONGYU_INTENDED_STAGING_PROJECT_NAME = "longyu-preview";
/** Outro produto na mesma org Free. Nunca usar como banco Longyu. */
export const LONGYU_FOREIGN_PROJECTS = {
  ylofdottauzcqcifnnpm: "atomurus",
};

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

export function foreignProductName(urlOrId) {
  const ref = extractProjectRef(urlOrId);
  return LONGYU_FOREIGN_PROJECTS[ref] ?? null;
}

export function isForeignProductProjectId(urlOrId) {
  return Boolean(foreignProductName(urlOrId));
}

export function assertNotProduction(urlOrId, label = "project_id") {
  const ref = extractProjectRef(urlOrId);
  if (!ref) {
    throw new StagingGuardError(`${label} ausente.`);
  }
  if (isProductionProjectId(ref)) {
    throw new StagingGuardError(
      `HARD FAIL: ${label}=${ref} é ${LONGYU_PRODUCTION_PROJECT_NAME} de produção. ` +
        "Recusado. Use um projeto de staging isolado e LONGYU_STAGING_PROJECT_ID."
    );
  }
  return ref;
}

export function assertNotForeignProduct(urlOrId, label = "project_id") {
  const ref = extractProjectRef(urlOrId);
  const name = foreignProductName(ref);
  if (name) {
    throw new StagingGuardError(
      `HARD FAIL: ${label}=${ref} é ${name} (outro produto). Não usar como banco Longyu.`
    );
  }
  return ref;
}

export function assertAllowedStagingTarget(urlOrId, label = "project_id") {
  const ref = assertNotProduction(urlOrId, label);
  return assertNotForeignProduct(ref, label);
}

export function requireStagingProjectId(env = process.env) {
  const id = String(env.LONGYU_STAGING_PROJECT_ID ?? "").trim();
  if (!id) {
    throw new StagingGuardError(
      "LONGYU_STAGING_PROJECT_ID ausente. Defina o project_id do staging isolado " +
        `(pretendido: ${LONGYU_INTENDED_STAGING_PROJECT_NAME} ${LONGYU_INTENDED_STAGING_PROJECT_ID}). ` +
        "Nunca use MandarimProject nem atomurus."
    );
  }
  return assertAllowedStagingTarget(id, "LONGYU_STAGING_PROJECT_ID");
}

export function requireHealthyStagingStatus(status, projectId) {
  if (status !== "ACTIVE_HEALTHY") {
    throw new StagingGuardError(
      `BLOCKED: staging ${projectId} status=${status || "UNKNOWN"}. ` +
        "Não aplicar migrations nem deploy. Exige ACTIVE_HEALTHY."
    );
  }
}

export function assertStagingUrlMatches(url, stagingId, label = "STAGING_SUPABASE_URL") {
  const urlRef = extractProjectRef(url);
  if (!urlRef) {
    throw new StagingGuardError(`${label} ausente ou inválida.`);
  }
  assertAllowedStagingTarget(urlRef, label);
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
