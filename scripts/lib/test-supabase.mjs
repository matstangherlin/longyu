/** Helpers compartilhados para testes de integração Supabase. */

import { createClient } from "@supabase/supabase-js";
import { mergedEnv } from "./env-local.mjs";

export const TEST_PASSWORD = "LongyuGateTest!84e7";

export function requireGateEnv() {
  const env = mergedEnv();
  const url = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !serviceRole) {
    throw new Error(
      "Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY em .env.local"
    );
  }

  return { url, anon, serviceRole };
}

export function adminClient() {
  const { url, serviceRole } = requireGateEnv();
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function userClient(accessToken) {
  const { url, anon } = requireGateEnv();
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function createTempUser(label) {
  const admin = adminClient();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `gate-${label}-${stamp}@longyu-gate.test`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { gate_test: true, label },
  });

  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário ${label}: ${error?.message ?? "sem user"}`);
  }

  return { id: data.user.id, email };
}

export async function signInUser(email) {
  const { url, anon } = requireGateEnv();
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (error || !data.session?.access_token) {
    throw new Error(`Falha no login ${email}: ${error?.message ?? "sem token"}`);
  }

  return data.session.access_token;
}

export async function deleteTempUser(userId) {
  const admin = adminClient();
  await admin.from("transactions").delete().eq("user_id", userId);
  await admin.from("subscriptions").delete().eq("user_id", userId);
  await admin.from("league_memberships").delete().eq("user_id", userId);
  await admin.from("league_weekly_results").delete().eq("user_id", userId);
  await admin.from("league_xp_events").delete().eq("user_id", userId);
  await admin.from("user_progress").delete().eq("user_id", userId);
  await admin.from("user_economy").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}

export function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function isServerPro(subscription) {
  if (!subscription) return false;
  const activeStatuses = new Set(["trialing", "active"]);
  const periodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : undefined;
  const stillValid = !periodEnd || periodEnd > Date.now();
  if (activeStatuses.has(subscription.status) && stillValid) return true;
  if ((subscription.status === "canceled" || subscription.cancel_at_period_end) && stillValid) {
    return true;
  }
  return false;
}
