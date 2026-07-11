/**
 * Verifica se a conta teste@longyu.app tem Pro e progresso completo no servidor.
 */
import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const url = (env.VITE_SUPABASE_URL ?? "https://drjcfalvlbbeblmmyhwj.supabase.co").replace(/\/$/, "");
const anon = env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = "teste@longyu.app";
const TEST_PASSWORD = "teste999";

const errors = [];
const checks = [];

function ok(label, detail) {
  checks.push({ label, status: "OK", detail });
}

function fail(label, detail) {
  errors.push(`${label}: ${detail}`);
  checks.push({ label, status: "FAIL", detail });
}

async function login() {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error_description ?? body?.msg ?? `login HTTP ${response.status}`);
  }
  return { token: body.access_token, userId: body.user?.id };
}

async function rpc(token, name) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

async function rest(token, path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

console.log("== verify:test-account ==");

if (!anon) {
  console.error("VITE_SUPABASE_ANON_KEY ausente.");
  process.exit(1);
}

const { token, userId } = await login();
ok("Auth", `login OK (${userId})`);

const subs = await rest(token, `subscriptions?user_id=eq.${userId}&select=status,stripe_subscription_id`);
if (subs.status === 200) {
  const rows = JSON.parse(subs.body);
  if (rows.length > 0 && rows[0].status === "active") {
    ok("Assinatura", `active (${rows[0].stripe_subscription_id})`);
  } else {
    fail("Assinatura", "sem registro active em subscriptions");
  }
} else {
  fail("Assinatura", `HTTP ${subs.status}`);
}

const entitlement = await rpc(token, "get_server_entitlement");
if (entitlement.status === 200) {
  const data = JSON.parse(entitlement.body);
  if (data?.is_pro === true) {
    ok("Entitlement RPC", "is_pro=true");
  } else {
    fail("Entitlement RPC", JSON.stringify(data));
  }
} else {
  fail("Entitlement RPC", `HTTP ${entitlement.status} — migration 008 não aplicada?`);
}

const economy = await rpc(token, "get_server_economy");
if (economy.status === 200) {
  const data = JSON.parse(economy.body);
  if (data?.is_pro === true) {
    ok("Economia RPC", `is_pro=true, cargas=${data?.daily_charges ?? "?"}/${data?.max_daily_charges ?? "?"}`);
  } else {
    fail("Economia RPC", `is_pro=false — ${economy.body.slice(0, 200)}`);
  }
} else {
  fail("Economia RPC", `HTTP ${economy.status} — migration 006 não aplicada?`);
}

const progress = await rest(token, `user_progress?user_id=eq.${userId}&select=completed_lessons,xp_total,client_snapshot`);
if (progress.status === 200) {
  const rows = JSON.parse(progress.body);
  const row = rows[0];
  const lessonCount = row?.completed_lessons?.length ?? 0;
  if (lessonCount >= 100) {
    ok("Progresso", `${lessonCount} lições, ${row?.xp_total ?? 0} XP`);
  } else {
    fail("Progresso", `apenas ${lessonCount} lições`);
  }
} else {
  fail("Progresso", `HTTP ${progress.status}`);
}

console.log("");
for (const check of checks) {
  console.log(`${check.status === "OK" ? "✓" : "✗"} ${check.label}: ${check.detail}`);
}

if (errors.length > 0) {
  console.error("\nERRO: verify:test-account falhou.");
  process.exit(1);
}

console.log("\nOK: conta de teste verificada no servidor.");
