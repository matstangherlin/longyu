/**
 * Credenciais e clientes para probes V4.7.6.
 * Recusa produção e atomurus. Não imprime secrets.
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import {
  StagingGuardError,
  assertStagingUrlMatches,
  requireStagingProjectId,
} from "./staging-guard.mjs";

export function requireLiveStagingCredentials(env) {
  const stagingId = requireStagingProjectId(env);
  const url = String(env.STAGING_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anon = String(env.STAGING_SUPABASE_ANON_KEY ?? "");
  const service = String(env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (!url || !anon || !service) {
    throw new StagingGuardError(
      "V4.7.6 BLOCKED: STAGING_SUPABASE_URL / ANON / SERVICE_ROLE ausentes. Live identity não roda."
    );
  }
  assertStagingUrlMatches(url, stagingId);
  if (env.ALLOW_STAGING_SECURITY_TESTS !== "true") {
    throw new StagingGuardError(
      "V4.7.6 BLOCKED: ALLOW_STAGING_SECURITY_TESTS≠true. Sem fixtures no staging."
    );
  }
  return { stagingId, url, anon, service };
}

export function stagingClients({ url, anon, service }) {
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  return {
    admin: createClient(url, service, { auth }),
    anonClient() {
      return createClient(url, anon, { auth });
    },
  };
}

export async function createTempUser(admin, label) {
  const nonce = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `v476-${label}-${nonce}@example.com`;
  const password = `Ly!${crypto.randomBytes(16).toString("base64url")}9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `V476 ${label}` },
  });
  if (error || !data.user?.id) {
    throw new StagingGuardError(`createUser ${label}: ${error?.message ?? "sem user"}`);
  }
  return { id: data.user.id, email, password };
}

export async function signInAnon(url, anon, identity) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  if (error || data.user?.id !== identity.id) {
    throw new StagingGuardError(`signIn: ${error?.message ?? "mismatch"}`);
  }
  return client;
}

export async function deleteTempUsers(admin, ids) {
  for (const id of ids) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      /* best-effort */
    }
  }
}

export async function fetchWithTimeout(url, init = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || /fetch failed|ENOTFOUND|ECONN/i.test(String(error))) {
      throw new StagingGuardError(
        `V4.7.6 BLOCKED: staging inalcançável (${ms}ms). Não tratar timeout como PASS.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
