/**
 * STAGE-001 — Identificar staging isolado.
 * Hard fail se o alvo for MandarimProject de produção.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import {
  LONGYU_INTENDED_STAGING_PROJECT_ID,
  LONGYU_INTENDED_STAGING_PROJECT_NAME,
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  StagingGuardError,
  extractProjectRef,
  failClosed,
  isProductionProjectId,
  requireStagingProjectId,
  supabaseApiUrl,
} from "./lib/staging-guard.mjs";

const env = mergedEnv();
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();

function printInventory(projects) {
  console.log("Inventário de projetos:");
  for (const project of projects) {
    const role = isProductionProjectId(project.id)
      ? "PRODUCTION — HARD FAIL como alvo de staging"
      : project.id === LONGYU_INTENDED_STAGING_PROJECT_ID
        ? "staging pretendido"
        : "outro produto — não usar como Longyu staging";
    console.log(
      `  - ${project.name} id=${project.id} region=${project.region} status=${project.status} (${role})`
    );
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new StagingGuardError(
      `Management API ${response.status} ${url}: ${typeof body === "string" ? body.slice(0, 800) : JSON.stringify(body).slice(0, 800)}`
    );
  }
  return body;
}

try {
  let stagingId;
  try {
    stagingId = requireStagingProjectId(env);
  } catch (error) {
    console.log("STAGE-001");
    console.log(`production_forbidden_id=${LONGYU_PRODUCTION_PROJECT_ID} (${LONGYU_PRODUCTION_PROJECT_NAME})`);
    console.log(
      `intended_staging_id=${LONGYU_INTENDED_STAGING_PROJECT_ID} (${LONGYU_INTENDED_STAGING_PROJECT_NAME})`
    );
    throw error;
  }

  const record = {
    project_id: stagingId,
    project_name: null,
    region: null,
    status: null,
    supabase_url: supabaseApiUrl(stagingId),
    identified_at: new Date().toISOString(),
  };

  if (token) {
    const projects = await fetchJson("https://api.supabase.com/v1/projects");
    printInventory(Array.isArray(projects) ? projects : []);
    const match = (Array.isArray(projects) ? projects : []).find(
      (project) => extractProjectRef(project.id) === stagingId
    );
    if (!match) {
      throw new StagingGuardError(
        `LONGYU_STAGING_PROJECT_ID=${stagingId} não aparece na org. Não usar produção nem atomurus.`
      );
    }
    record.project_name = match.name ?? null;
    record.region = match.region ?? null;
    record.status = match.status ?? null;
    record.supabase_url = supabaseApiUrl(match.ref ?? match.id);
  } else {
    console.log("SUPABASE_ACCESS_TOKEN ausente — status remoto não confirmado.");
    if (stagingId === LONGYU_INTENDED_STAGING_PROJECT_ID) {
      record.project_name = LONGYU_INTENDED_STAGING_PROJECT_NAME;
    }
  }

  console.log("STAGE-001 record:");
  console.log(JSON.stringify(record, null, 2));

  if (isProductionProjectId(record.project_id)) {
    throw new StagingGuardError("HARD FAIL: staging resolveu para produção.");
  }
  if (record.status && record.status !== "ACTIVE_HEALTHY") {
    throw new StagingGuardError(
      `STAGE-001 BLOCKED: staging ${record.project_id} status=${record.status}. ` +
        "Não aplicar migrations nem deploy. Restaurar/provisionar o isolado antes."
    );
  }
  if (!record.status) {
    throw new StagingGuardError(
      "STAGE-001 BLOCKED: não foi possível confirmar ACTIVE_HEALTHY. " +
        "Defina SUPABASE_ACCESS_TOKEN ou provisione staging isolado."
    );
  }

  console.log("OK: staging isolado identificado e ACTIVE_HEALTHY.");
} catch (error) {
  failClosed(error);
}
