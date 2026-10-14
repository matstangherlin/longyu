#!/usr/bin/env node
/**
 * RC2.3.10 — post-deploy cloud smoke (idempotent, synthetic only).
 *
 *   LONGYU_PRODUCTION_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *   LONGYU_QA_EMAIL, LONGYU_QA_PASSWORD (the seeded QA account — never a real learner),
 *   LONGYU_EXPECTED_SHA (optional: the SHA that must be live)
 *   node scripts/cloud-smoke.mjs [--json reports/cloud-smoke.json]
 *
 * Writes: one feedback row whose message starts with "[cloud-smoke]" (namespaced,
 * identifiable; remove with `delete from beta_feedback where message like '[cloud-smoke]%'`
 * after export, owner-run). No purchase, no billing, no other write.
 * Never prints a secret: only booleans, counts, HTTP codes and the public SHA.
 */
import fs from "node:fs";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = (key, fallback = "") => String(process.env[key] ?? fallback).trim();
const SITE = env("LONGYU_PRODUCTION_URL", "https://singular-meringue-7838cd.netlify.app").replace(/\/$/, "");
const SUPABASE_URL = env("VITE_SUPABASE_URL", "https://drjcfalvlbbeblmmyhwj.supabase.co");
const ANON = env("VITE_SUPABASE_ANON_KEY");
const QA_EMAIL = env("LONGYU_QA_EMAIL");
const QA_PASSWORD = env("LONGYU_QA_PASSWORD");
const EXPECTED_SHA = env("LONGYU_EXPECTED_SHA").toLowerCase();
const runId = `cloud-smoke-${new Date().toISOString().slice(0, 19)}-${randomUUID().slice(0, 8)}`;

const results = [];
async function step(id, fn) {
  try {
    const detail = await fn();
    results.push({ id, status: "PASS", detail: detail ?? null });
  } catch (error) {
    results.push({ id, status: "FAIL", detail: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200) });
  }
}
const must = (cond, message) => {
  if (!cond) throw new Error(message);
};

await step("site_reachable", async () => {
  const res = await fetch(SITE, { redirect: "follow" });
  must(res.ok, `HTTP ${res.status}`);
  return { http: res.status };
});

await step("release_sha", async () => {
  const res = await fetch(`${SITE}/version.json`, { cache: "no-store" });
  must(res.ok, `version.json HTTP ${res.status}`);
  const v = await res.json();
  must(/^[0-9a-f]{40}$/.test(String(v.commitSha ?? "")), "version.json has no commit SHA");
  if (EXPECTED_SHA) must(String(v.commitSha).startsWith(EXPECTED_SHA), `live ${String(v.commitSha).slice(0, 12)} ≠ expected ${EXPECTED_SHA.slice(0, 12)}`);
  return { commitSha: v.commitSha, curriculumFingerprint: v.curriculumFingerprint ?? null, buildChannel: v.buildChannel ?? null };
});

await step("security_headers", async () => {
  const res = await fetch(SITE, { redirect: "follow" });
  const h = (name) => res.headers.get(name) ?? "";
  const csp = h("content-security-policy");
  must(/frame-ancestors 'none'/.test(csp), "CSP without frame-ancestors 'none'");
  must(h("x-content-type-options") === "nosniff", "no nosniff");
  must(/microphone=\(self\)/.test(h("permissions-policy")), "Permissions-Policy microphone not self-only");
  return { hsts: Boolean(h("strict-transport-security")), referrerPolicy: h("referrer-policy") };
});

await step("supabase_auth_health", async () => {
  must(ANON, "VITE_SUPABASE_ANON_KEY missing");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: ANON } });
  must(res.ok, `auth health HTTP ${res.status}`);
  return { http: res.status };
});

await step("edge_triage_requires_auth", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/triage-feedback`, { method: "POST", headers: { apikey: ANON } });
  must(res.status === 401 || res.status === 403, `triage-feedback without a user JWT answered ${res.status}`);
  return { http: res.status };
});

let client = null;
let userId = null;
await step("login_synthetic_account", async () => {
  must(QA_EMAIL && QA_PASSWORD, "LONGYU_QA_EMAIL / LONGYU_QA_PASSWORD missing");
  client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: QA_EMAIL, password: QA_PASSWORD });
  must(!error && data.user, `sign-in failed: ${error?.message ?? "no user"}`);
  userId = data.user.id;
  return { signedIn: true };
});

await step("account_isolation_basic", async () => {
  must(client && userId, "not signed in");
  const { data, error } = await client.from("user_progress").select("user_id").neq("user_id", userId).limit(5);
  must(!error, error?.message);
  must((data ?? []).length === 0, `synthetic account can read ${data.length} other learner row(s)`);
  return { otherRowsVisible: 0 };
});

await step("progress_read_own", async () => {
  must(client && userId, "not signed in");
  const { error } = await client.from("user_progress").select("user_id, updated_at").eq("user_id", userId).maybeSingle();
  must(!error, error?.message);
  return { ownRowReadable: true };
});

await step("feedback_ingestion", async () => {
  must(client, "not signed in");
  const { error } = await client.rpc("submit_beta_feedback", {
    p_category: "outro",
    p_message: `[cloud-smoke] ${runId} synthetic post-deploy check`,
    p_route: "/cloud-smoke",
    p_lesson_id: null,
    p_exercise_kind: null,
    p_exercise_index: null,
    p_app_version: "cloud-smoke",
    p_browser: "node",
    p_viewport: "0x0",
    p_local_profile_id: null,
    p_client_dedupe_key: runId,
  });
  must(!error, error?.message);
  return { namespaced: "[cloud-smoke]" };
});

await step("logout", async () => {
  must(client, "not signed in");
  const { error } = await client.auth.signOut();
  must(!error, error?.message);
  return { signedOut: true };
});

const failed = results.filter((r) => r.status !== "PASS");
const report = { schema: "longyu-cloud-smoke/1", runId, site: SITE, supabase: SUPABASE_URL.replace(/^https:\/\//, ""), at: new Date().toISOString(), status: failed.length ? "FAIL" : "PASS", results };
const jsonAt = process.argv.indexOf("--json");
if (jsonAt > 0) fs.writeFileSync(process.argv[jsonAt + 1], `${JSON.stringify(report, null, 2)}\n`);
for (const r of results) console.log(`${r.status} ${r.id}${r.detail ? ` · ${typeof r.detail === "string" ? r.detail : JSON.stringify(r.detail)}` : ""}`);
console.log(`${report.status} cloud-smoke · ${results.length - failed.length}/${results.length}`);
process.exit(failed.length ? 1 : 0);
