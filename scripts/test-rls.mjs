/**
 * Testes automatizados de RLS — usuário A não acessa dados de B.
 * Requer: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import {
  adminClient,
  assertCondition,
  createTempUser,
  deleteTempUser,
  signInUser,
  userClient,
} from "./lib/test-supabase.mjs";

const results = [];
const cleanup = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name, error) {
  const message = error instanceof Error ? error.message : String(error);
  results.push({ name, ok: false, message });
  console.error(`  ✗ ${name}: ${message}`);
}

async function runTest(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

async function main() {
  console.log("== test:rls ==\n");

  const admin = adminClient();

  const { data: guardTable, error: guardError } = await admin
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .limit(1);

  if (guardError?.message?.includes("does not exist")) {
    console.error("ERRO: migration 007 não aplicada. Rode: npm run deploy:backend -- --db");
    process.exit(1);
  }

  const userA = await createTempUser("a");
  const userB = await createTempUser("b");
  cleanup.push(userA.id, userB.id);

  await admin.from("profiles").upsert([
    { id: userA.id, name: "Aluno A" },
    { id: userB.id, name: "Aluno B" },
  ]);

  await admin.from("user_progress").upsert([
    {
      user_id: userA.id,
      completed_lessons: ["l1"],
      client_snapshot: { progress: "A" },
      client_snapshot_version: 1,
    },
    {
      user_id: userB.id,
      completed_lessons: ["l2"],
      client_snapshot: { progress: "B" },
      client_snapshot_version: 1,
    },
  ]);

  await admin.from("subscriptions").upsert([
    {
      user_id: userA.id,
      stripe_subscription_id: `sub_gate_a_${userA.id.slice(0, 8)}`,
      stripe_customer_id: `cus_gate_a_${userA.id.slice(0, 8)}`,
      status: "active",
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      user_id: userB.id,
      stripe_subscription_id: `sub_gate_b_${userB.id.slice(0, 8)}`,
      stripe_customer_id: `cus_gate_b_${userB.id.slice(0, 8)}`,
      status: "active",
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    },
  ]);

  await admin.from("transactions").insert([
    {
      user_id: userA.id,
      stripe_event_id: `evt_gate_a_${userA.id.slice(0, 8)}`,
      kind: "subscription_payment",
      amount: 0,
      currency: "brl",
      status: "paid",
    },
    {
      user_id: userB.id,
      stripe_event_id: `evt_gate_b_${userB.id.slice(0, 8)}`,
      kind: "subscription_payment",
      amount: 0,
      currency: "brl",
      status: "paid",
    },
  ]);

  const tokenA = await signInUser(userA.email);
  const tokenB = await signInUser(userB.email);
  const clientA = userClient(tokenA);
  const clientB = userClient(tokenB);

  await runTest("A lê o próprio profile", async () => {
    const { data, error } = await clientA.from("profiles").select("id,name").eq("id", userA.id).single();
    assertCondition(!error && data?.id === userA.id, `esperado profile de A, recebeu: ${error?.message}`);
  });

  await runTest("A lê o próprio progresso", async () => {
    const { data, error } = await clientA
      .from("user_progress")
      .select("user_id,completed_lessons")
      .eq("user_id", userA.id)
      .single();
    assertCondition(!error && data?.completed_lessons?.includes("l1"), error?.message ?? "progresso A ausente");
  });

  await runTest("A não lê progresso de B", async () => {
    const { data, error } = await clientA
      .from("user_progress")
      .select("user_id,completed_lessons")
      .eq("user_id", userB.id);
    assertCondition(!error, error?.message ?? "erro inesperado");
    assertCondition((data ?? []).length === 0, `A viu ${data?.length ?? 0} linha(s) de B`);
  });

  await runTest("A não altera progresso de B", async () => {
    const { data, error } = await clientA
      .from("user_progress")
      .update({ completed_lessons: ["hacked"] })
      .eq("user_id", userB.id)
      .select("user_id");
    assertCondition(!error, error?.message ?? "update retornou erro");
    assertCondition((data ?? []).length === 0, "update cruzado não deveria afetar linhas");

    const { data: check } = await admin
      .from("user_progress")
      .select("completed_lessons")
      .eq("user_id", userB.id)
      .single();
    assertCondition(check?.completed_lessons?.includes("l2"), "progresso de B foi alterado");
  });

  await runTest("A não altera assinatura", async () => {
    const { error: insertError } = await clientA.from("subscriptions").insert({
      user_id: userA.id,
      stripe_subscription_id: `sub_hack_${Date.now()}`,
      status: "active",
    });
    assertCondition(Boolean(insertError), "insert em subscriptions deveria falhar");

    const { data, error } = await clientA
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userB.id)
      .select("user_id");
    assertCondition(!error, error?.message ?? "erro inesperado");
    assertCondition((data ?? []).length === 0, "update de assinatura cruzada não deveria afetar linhas");
  });

  await runTest("A não lê assinatura de B", async () => {
    const { data, error } = await clientA.from("subscriptions").select("user_id,status").eq("user_id", userB.id);
    assertCondition(!error, error?.message ?? "erro inesperado");
    assertCondition((data ?? []).length === 0, "A não deveria ver assinatura de B");
  });

  await runTest("A não altera transações", async () => {
    const { error: insertError } = await clientA.from("transactions").insert({
      user_id: userA.id,
      stripe_event_id: `evt_hack_${Date.now()}`,
      kind: "subscription_payment",
      amount: 1,
      currency: "brl",
      status: "paid",
    });
    assertCondition(Boolean(insertError), "insert em transactions deveria falhar");
  });

  await runTest("A não lê transações de B", async () => {
    const { data, error } = await clientA.from("transactions").select("user_id").eq("user_id", userB.id);
    assertCondition(!error, error?.message ?? "erro inesperado");
    assertCondition((data ?? []).length === 0, "A não deveria ver transações de B");
  });

  await runTest("ranking expõe somente dados públicos permitidos", async () => {
    const { data, error } = await clientA.rpc("get_league_standings");
    assertCondition(!error && data, error?.message ?? "RPC falhou");
    const payload = data;
    assertCondition(typeof payload === "object", "payload inválido");
    assertCondition(Array.isArray(payload.standings), "standings ausente");
    for (const row of payload.standings ?? []) {
      assertCondition("display_name" in row, "display_name ausente no ranking");
      assertCondition(!("email" in row), "email não deveria aparecer no ranking");
      assertCondition(!String(row.display_name ?? "").includes("@"), "display_name parece email");
    }
  });

  await runTest("email nunca aparece no ranking", async () => {
    const { data: authB } = await admin.auth.admin.getUserById(userB.id);
    const email = authB?.user?.email ?? "";
    assertCondition(email.includes("@"), "email de teste inválido");

    const { data, error } = await clientB.rpc("get_league_standings");
    assertCondition(!error, error?.message ?? "RPC falhou");
    const serialized = JSON.stringify(data ?? {});
    assertCondition(!serialized.includes(email), "email de B vazou no ranking");
    assertCondition(!serialized.includes("@longyu-gate.test"), "domínio de email vazou no ranking");
  });

  const failed = results.filter((r) => !r.ok);
  for (const userId of cleanup) {
    try {
      await deleteTempUser(userId);
    } catch (error) {
      console.warn(`Aviso: cleanup ${userId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("");
  if (failed.length > 0) {
    console.error(`ERRO: test:rls falhou (${failed.length}/${results.length})`);
    process.exit(1);
  }

  console.log(`OK: test:rls passou (${results.length} verificações).`);
}

main().catch((error) => {
  console.error("ERRO fatal test:rls:", error instanceof Error ? error.message : error);
  process.exit(1);
});
