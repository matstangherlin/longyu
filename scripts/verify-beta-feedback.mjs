/**
 * Smoke do canal beta_feedback: RPCs e insert anônimo (rate-limited).
 */
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { readEnvFile, mergedEnv } from "./lib/env-local.mjs";

const env = {
  ...readEnvFile(".env.production"),
  ...mergedEnv(),
};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnon = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes.");
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const errors = [];

async function checkRpc(name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const msg = error.message ?? String(error);
    if (/Could not find the function|schema cache|PGRST202/i.test(msg)) {
      errors.push(`RPC ausente: ${name} → ${msg}`);
      return null;
    }
    console.log(`· ${name}: respondeu (${msg.slice(0, 120)})`);
    return null;
  }
  console.log(`· ${name}: ok`, data ?? "");
  return data;
}

console.log("== verify:beta-feedback ==");
console.log("URL:", supabaseUrl);

await checkRpc("is_beta_admin");

const dedupe = `verify-agent-${Date.now()}`;
const { data: feedbackId, error: submitError } = await client.rpc("submit_beta_feedback", {
  p_category: "sugestao",
  p_message: "Smoke verify beta feedback — pode ignorar.",
  p_route: "/verify-beta-feedback",
  p_lesson_id: null,
  p_exercise_kind: null,
  p_exercise_index: null,
  p_app_version: "verify",
  p_browser: "node",
  p_viewport: "0x0",
  p_local_profile_id: "verify-local-profile",
  p_client_dedupe_key: dedupe,
});

if (submitError) {
  const msg = submitError.message ?? String(submitError);
  if (/Could not find the function|PGRST202|schema cache/i.test(msg)) {
    errors.push(`submit_beta_feedback ausente: ${msg}`);
  } else if (/rate_limited/i.test(msg)) {
    console.log("· submit_beta_feedback: rate_limited (RPC viva)");
  } else {
    errors.push(`submit_beta_feedback falhou: ${msg}`);
  }
} else {
  console.log("· submit_beta_feedback: ok id=", feedbackId);
}

const { error: pedagogyError } = await client.rpc("submit_beta_pedagogy_event", {
  p_event_type: "lesson_started",
  p_route: "/verify-beta-feedback",
  p_lesson_id: "verify-l1",
  p_exercise_kind: null,
  p_exercise_index: null,
  p_metadata: { appVersion: "verify" },
  p_local_profile_id: "verify-local-profile",
  p_client_dedupe_key: `${dedupe}-pedagogy`,
  p_client_context: "verify-node-ua",
  p_anon_session_token: null,
});

if (pedagogyError) {
  const msg = pedagogyError.message ?? String(pedagogyError);
  if (/Could not find the function|PGRST202|schema cache/i.test(msg)) {
    errors.push(`submit_beta_pedagogy_event ausente: ${msg}`);
  } else {
    console.log(`· submit_beta_pedagogy_event: respondeu (${msg.slice(0, 120)})`);
  }
} else {
  console.log("· submit_beta_pedagogy_event: ok");
}

if (errors.length) {
  console.error("\nERRO: verify:beta-feedback falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("\nOK: verify:beta-feedback passou — RPCs ativas.");
