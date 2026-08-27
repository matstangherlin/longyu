/**
 * Management API helpers for Longyu staging scripts.
 * Never default the project ref. Callers must pass a guard-checked id.
 */
import { StagingGuardError } from "./staging-guard.mjs";

export async function fetchSupabaseJson(token, url, init = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...init.headers,
  };
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const snippet =
      typeof body === "string" ? body.slice(0, 800) : JSON.stringify(body).slice(0, 800);
    throw new StagingGuardError(`Management API ${response.status} ${url}: ${snippet}`);
  }
  return body;
}

export async function fetchSupabaseProject(token, projectId) {
  return fetchSupabaseJson(token, `https://api.supabase.com/v1/projects/${projectId}`);
}

export async function fetchProjectMigrations(token, projectId) {
  const body = await fetchSupabaseJson(
    token,
    `https://api.supabase.com/v1/projects/${projectId}/database/migrations`
  );
  return Array.isArray(body) ? body : body?.migrations ?? [];
}

export async function queryStagingSql(token, projectId, query) {
  return fetchSupabaseJson(token, `https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
