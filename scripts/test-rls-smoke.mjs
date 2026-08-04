/**
 * Smoke de RLS com dois usuários (A ≠ B).
 *
 * Requer em .env.local:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   # só para criar/limpar usuários de teste
 *
 * Uso:
 *   npm run test:rls
 *
 * Sem service_role: falha com instrução clara (não é skip silencioso no gate).
 */
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { mergedEnv, readEnvFile } from "./lib/env-local.mjs";

const env = {
  ...readEnvFile(".env.production"),
  ...mergedEnv(),
};

const url = (env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const stamp = Date.now();
const PASSWORD = "LongyuRlsTest999!";
const emailA = `rls-a-${stamp}@longyu.test`;
const emailB = `rls-b-${stamp}@longyu.test`;

let failures = 0;
function assert(cond, message) {
  if (cond) {
    console.log(`ok: ${message}`);
  } else {
    failures += 1;
    console.error(`FALHOU: ${message}`);
  }
}

if (!url || !anon) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes.");
  process.exit(1);
}

if (!serviceRole) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY ausente — necessário para criar usuários A/B sem poluir o signup público."
  );
  console.error("Defina em .env.local e rode: npm run test:rls");
  process.exit(2);
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function userClient(accessToken) {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: email.startsWith("rls-a") ? "RLS A" : "RLS B" },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user;
}

async function signIn(email) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.session;
}

async function cleanup(userIds) {
  for (const id of userIds) {
    if (!id) continue;
    await admin.from("user_progress").delete().eq("user_id", id);
    await admin.from("user_economy").delete().eq("user_id", id);
    await admin.from("subscriptions").delete().eq("user_id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

const createdIds = [];

try {
  console.log("== test:rls ==");
  console.log("URL:", url);

  const userA = await createUser(emailA);
  const userB = await createUser(emailB);
  createdIds.push(userA.id, userB.id);

  // Seed progresso/economia/assinatura via service_role (bypass RLS).
  const { error: progErr } = await admin.from("user_progress").upsert({
    user_id: userB.id,
    xp_total: 1234,
    streak: 7,
    completed_lessons: ["secret-lesson-b"],
    updated_at: new Date().toISOString(),
  });
  assert(!progErr, `seed user_progress B (${progErr?.message ?? "ok"})`);

  const { error: ecoErr } = await admin.from("user_economy").upsert({
    user_id: userB.id,
    qi: 99,
    updated_at: new Date().toISOString(),
  });
  assert(!ecoErr, `seed user_economy B (${ecoErr?.message ?? "ok"})`);

  const { error: subErr } = await admin.from("subscriptions").upsert({
    user_id: userB.id,
    stripe_subscription_id: `rls_test_${stamp}`,
    status: "active",
    current_period_end: new Date(Date.now() + 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
  assert(!subErr, `seed subscriptions B (${subErr?.message ?? "ok"})`);

  const sessionA = await signIn(emailA);
  const clientA = userClient(sessionA.access_token);

  // A lê o próprio perfil (ou vazio se trigger não criou — sem erro).
  const { error: ownProfileErr } = await clientA.from("profiles").select("id").eq("id", userA.id);
  assert(!ownProfileErr, `A lê próprio perfil (${ownProfileErr?.message ?? "ok"})`);

  // A NÃO lê progresso de B.
  const { data: foreignProgress, error: foreignProgressErr } = await clientA
    .from("user_progress")
    .select("user_id, xp_total, completed_lessons")
    .eq("user_id", userB.id);
  assert(!foreignProgressErr, `select progresso B sem erro RLS (${foreignProgressErr?.message ?? "ok"})`);
  assert((foreignProgress ?? []).length === 0, "A não lê progresso de B");

  // A NÃO lê economia de B.
  const { data: foreignEco } = await clientA
    .from("user_economy")
    .select("user_id, qi")
    .eq("user_id", userB.id);
  assert((foreignEco ?? []).length === 0, "A não lê economia de B");

  // A NÃO lê assinatura de B.
  const { data: foreignSub } = await clientA
    .from("subscriptions")
    .select("user_id, status, stripe_subscription_id")
    .eq("user_id", userB.id);
  assert((foreignSub ?? []).length === 0, "A não lê assinatura de B");

  // A NÃO atualiza perfil de B.
  const { data: updatedProfile, error: updateProfileErr } = await clientA
    .from("profiles")
    .update({ name: "hacked-by-a" })
    .eq("id", userB.id)
    .select("id");
  assert((updatedProfile ?? []).length === 0, "A não altera perfil de B");
  // Alguns projetos retornam erro; outros retornam 0 rows — ambos ok.
  if (updateProfileErr) {
    console.log(`· update perfil B rejeitado: ${updateProfileErr.message.slice(0, 80)}`);
  }

  // A NÃO atualiza progresso de B.
  const { data: updatedProgress } = await clientA
    .from("user_progress")
    .update({ xp_total: 1 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert((updatedProgress ?? []).length === 0, "A não altera progresso de B");

  // A NÃO atualiza economia de B.
  const { data: updatedEco } = await clientA
    .from("user_economy")
    .update({ qi: 1 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert((updatedEco ?? []).length === 0, "A não altera economia de B");

  // Endpoint admin: is_beta_admin deve ser false para usuário comum.
  const { data: isAdmin, error: adminErr } = await clientA.rpc("is_beta_admin");
  assert(!adminErr, `is_beta_admin responde (${adminErr?.message ?? "ok"})`);
  assert(isAdmin === false, "usuário comum não é beta admin");

  // apply_subscription_event não é executável por authenticated.
  const { error: applyErr } = await clientA.rpc("apply_subscription_event", {
    p_user_id: userB.id,
    p_customer_id: "cus_hack",
    p_subscription_id: `rls_test_${stamp}`,
    p_status: "canceled",
    p_price_id: null,
    p_current_period_start: null,
    p_current_period_end: null,
    p_cancel_at_period_end: true,
    p_event_created: 1,
  });
  assert(Boolean(applyErr), "authenticated não executa apply_subscription_event");

  // Confirma que B ainda tem os dados intactos (via service_role).
  const { data: stillB } = await admin
    .from("user_progress")
    .select("xp_total")
    .eq("user_id", userB.id)
    .maybeSingle();
  assert(stillB?.xp_total === 1234, "progresso de B intacto após tentativas de A");
} catch (error) {
  failures += 1;
  console.error("ERRO:", error instanceof Error ? error.message : error);
} finally {
  await cleanup(createdIds);
  console.log("limpeza: usuários A/B removidos");
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nOK: test:rls passou — A não lê/altera dados de B.");
