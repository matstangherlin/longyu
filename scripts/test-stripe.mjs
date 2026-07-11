/**
 * Testes de integração Stripe + entitlement (serverIsPro).
 * Requer: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_WEBHOOK_SECRET
 * Opcional para checkout live: STRIPE_SECRET_KEY + STRIPE_PRICE_PRO_MONTHLY
 */

import Stripe from "stripe";
import {
  adminClient,
  assertCondition,
  createTempUser,
  deleteTempUser,
  isServerPro,
  requireGateEnv,
  signInUser,
  userClient,
} from "./lib/test-supabase.mjs";
import { mergedEnv } from "./lib/env-local.mjs";

const results = [];
const cleanup = [];
const eventIds = [];
const env = mergedEnv();

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

function makeStripeEvent(type, dataObject, eventId) {
  return {
    id: eventId,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: dataObject },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };
}

async function postWebhook(event, webhookSecret) {
  const { url } = requireGateEnv();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "sk_test_gate_placeholder", {
    apiVersion: "2023-10-16",
  });
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const response = await fetch(`${url}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function getSubscription(admin, userId) {
  const { data } = await admin
    .from("subscriptions")
    .select("status,current_period_end,cancel_at_period_end,price_id,last_stripe_event_created")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function main() {
  console.log("== test:stripe ==\n");

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("ERRO: STRIPE_WEBHOOK_SECRET ausente em .env.local");
    process.exit(1);
  }

  const admin = adminClient();
  const { data: guardProbe, error: guardError } = await admin
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .limit(1);

  if (guardError?.message?.includes("does not exist")) {
    console.error("ERRO: migration 007 não aplicada. Rode: npm run deploy:backend -- --db");
    process.exit(1);
  }

  const user = await createTempUser("stripe");
  cleanup.push(user.id);

  await admin.from("profiles").upsert({ id: user.id, name: "Gate Stripe" });
  await admin.from("user_progress").upsert({
    user_id: user.id,
    completed_lessons: ["l1", "p1-o-que-e-mandarim"],
    client_snapshot: { gate: true },
    client_snapshot_version: 3,
  });

  const subId = `sub_gate_${user.id.replace(/-/g, "").slice(0, 16)}`;
  const customerId = `cus_gate_${user.id.replace(/-/g, "").slice(0, 16)}`;
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + 30 * 24 * 60 * 60;

  const token = await signInUser(user.email);
  const authed = userClient(token);

  await runTest("A) usuário grátis inicia checkout exige JWT", async () => {
    const { url } = requireGateEnv();
    const response = await fetch(`${url}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
      body: JSON.stringify({ planKey: "pro_monthly" }),
    });
    assertCondition(response.status === 401, `esperado 401, recebeu ${response.status}`);
  });

  await runTest("checkout autenticado respeita whitelist de plano", async () => {
    const { url } = requireGateEnv();
    const response = await fetch(`${url}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ planKey: "pro_hacker" }),
    });
    assertCondition(response.status === 400, `esperado 400, recebeu ${response.status}`);
  });

  if (env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PRO_MONTHLY) {
    await runTest("A) usuário autenticado obtém URL de checkout", async () => {
      const { url } = requireGateEnv();
      const response = await fetch(`${url}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ planKey: "pro_monthly" }),
      });
      const body = await response.json();
      assertCondition(response.status === 200 && typeof body.url === "string", JSON.stringify(body));
    });
  } else {
    console.log("  · checkout live ignorado (STRIPE_SECRET_KEY/STRIPE_PRICE_PRO_MONTHLY ausentes)");
  }

  const checkoutEventId = `evt_checkout_${user.id.slice(0, 8)}`;
  eventIds.push(checkoutEventId);
  await runTest("B) webhook cria assinatura trialing", async () => {
    const event = makeStripeEvent(
      "checkout.session.completed",
      {
        id: `cs_gate_${user.id.slice(0, 8)}`,
        object: "checkout.session",
        amount_total: 0,
        currency: "brl",
        mode: "subscription",
        client_reference_id: user.id,
        customer: customerId,
        subscription: subId,
      },
      checkoutEventId
    );

    const { status, body } = await postWebhook(event, webhookSecret);
    assertCondition(status === 200 && body.received, JSON.stringify(body));

    const sub = await getSubscription(admin, user.id);
    assertCondition(sub?.status === "trialing", `status=${sub?.status}`);
  });

  await runTest("C/D/E) entitlement retorna Pro após webhook", async () => {
    const sub = await getSubscription(admin, user.id);
    assertCondition(isServerPro(sub), "serverIsPro deveria ser true em trialing");

    const { data, error } = await authed
      .from("subscriptions")
      .select("status,current_period_end,cancel_at_period_end")
      .eq("user_id", user.id)
      .single();
    assertCondition(!error && isServerPro(data), error?.message ?? "cliente não vê Pro");
  });

  await runTest("idempotência: mesmo evento não duplica processamento", async () => {
    const event = makeStripeEvent(
      "checkout.session.completed",
      {
        id: `cs_gate_${user.id.slice(0, 8)}`,
        object: "checkout.session",
        amount_total: 0,
        currency: "brl",
        mode: "subscription",
        client_reference_id: user.id,
        customer: customerId,
        subscription: subId,
      },
      checkoutEventId
    );

    const second = await postWebhook(event, webhookSecret);
    assertCondition(second.status === 200 && second.body.duplicate === true, JSON.stringify(second.body));

    const { count } = await admin
      .from("stripe_webhook_events")
      .select("stripe_event_id", { count: "exact", head: true })
      .eq("stripe_event_id", checkoutEventId);
    assertCondition(count === 1, `eventos processados=${count}`);
  });

  await runTest("G) novo login mantém Pro", async () => {
    const freshToken = await signInUser(user.email);
    const freshClient = userClient(freshToken);
    const { data, error } = await freshClient
      .from("subscriptions")
      .select("status,current_period_end,cancel_at_period_end")
      .eq("user_id", user.id)
      .single();
    assertCondition(!error && isServerPro(data), "Pro perdido após relogin");
  });

  const activeEventId = `evt_active_${user.id.slice(0, 8)}`;
  eventIds.push(activeEventId);
  await runTest("webhook active confirma assinatura", async () => {
    const event = makeStripeEvent(
      "customer.subscription.updated",
      {
        id: subId,
        object: "subscription",
        customer: customerId,
        status: "active",
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: periodEnd,
        items: { data: [{ price: { id: env.STRIPE_PRICE_PRO_MONTHLY ?? "price_gate_test" } }] },
      },
      activeEventId
    );
    event.created = now + 10;

    const { status, body } = await postWebhook(event, webhookSecret);
    assertCondition(status === 200, JSON.stringify(body));

    const sub = await getSubscription(admin, user.id);
    assertCondition(sub?.status === "active" && isServerPro(sub), "deveria continuar Pro ativo");
  });

  const cancelPendingEventId = `evt_cancel_pending_${user.id.slice(0, 8)}`;
  eventIds.push(cancelPendingEventId);
  await runTest("H/I) cancel_at_period_end mantém Pro até expirar", async () => {
    const event = makeStripeEvent(
      "customer.subscription.updated",
      {
        id: subId,
        object: "subscription",
        customer: customerId,
        status: "active",
        cancel_at_period_end: true,
        current_period_start: now,
        current_period_end: periodEnd,
        items: { data: [{ price: { id: "price_gate_test" } }] },
      },
      cancelPendingEventId
    );
    event.created = now + 20;

    const { status } = await postWebhook(event, webhookSecret);
    assertCondition(status === 200, `HTTP ${status}`);

    const sub = await getSubscription(admin, user.id);
    assertCondition(sub?.cancel_at_period_end === true, "cancel_at_period_end deveria ser true");
    assertCondition(isServerPro(sub), "Pro deveria continuar até fim do período");
  });

  const staleCancelEventId = `evt_stale_cancel_${user.id.slice(0, 8)}`;
  eventIds.push(staleCancelEventId);
  await runTest("evento fora de ordem não rebaixa assinatura ativa", async () => {
    const event = makeStripeEvent(
      "customer.subscription.updated",
      {
        id: subId,
        object: "subscription",
        customer: customerId,
        status: "canceled",
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: periodEnd,
        items: { data: [{ price: { id: "price_gate_test" } }] },
      },
      staleCancelEventId
    );
    event.created = now - 100;

    const { status } = await postWebhook(event, webhookSecret);
    assertCondition(status === 200, `HTTP ${status}`);

    const sub = await getSubscription(admin, user.id);
    assertCondition(sub?.status === "active", `status rebaixado incorretamente para ${sub?.status}`);
    assertCondition(isServerPro(sub), "Pro não deveria cair com evento antigo");
  });

  const expireEventId = `evt_expire_${user.id.slice(0, 8)}`;
  eventIds.push(expireEventId);
  await runTest("J) expiração remove Pro sem apagar progresso", async () => {
    const past = now - 3600;
    const event = makeStripeEvent(
      "customer.subscription.updated",
      {
        id: subId,
        object: "subscription",
        customer: customerId,
        status: "canceled",
        cancel_at_period_end: false,
        current_period_start: past - 86400 * 30,
        current_period_end: past,
        items: { data: [{ price: { id: "price_gate_test" } }] },
      },
      expireEventId
    );
    event.created = now + 40;

    const { status } = await postWebhook(event, webhookSecret);
    assertCondition(status === 200, `HTTP ${status}`);

    const sub = await getSubscription(admin, user.id);
    assertCondition(!isServerPro(sub), "Pro deveria estar inativo após expiração");

    const { data: progress } = await admin
      .from("user_progress")
      .select("completed_lessons")
      .eq("user_id", user.id)
      .single();
    assertCondition(progress?.completed_lessons?.includes("l1"), "progresso local foi apagado");
  });

  await runTest("assinatura cancelada não continua Pro após período final", async () => {
    const sub = await getSubscription(admin, user.id);
    assertCondition(sub?.status === "canceled", `status=${sub?.status}`);
    assertCondition(!isServerPro(sub), "cancelada ainda aparece como Pro");
  });

  await runTest("webhook rejeita assinatura inválida", async () => {
    const { url } = requireGateEnv();
    const response = await fetch(`${url}/functions/v1/stripe-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "evt_bad" }),
    });
    assertCondition(response.status === 400, `esperado 400, recebeu ${response.status}`);
  });

  const failed = results.filter((r) => !r.ok);
  for (const eventId of eventIds) {
    await admin.from("transactions").delete().eq("stripe_event_id", eventId);
    await admin.from("stripe_webhook_events").delete().eq("stripe_event_id", eventId);
  }
  for (const userId of cleanup) {
    try {
      await deleteTempUser(userId);
    } catch (error) {
      console.warn(`Aviso cleanup: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("");
  if (failed.length > 0) {
    console.error(`ERRO: test:stripe falhou (${failed.length}/${results.length})`);
    process.exit(1);
  }

  console.log(`OK: test:stripe passou (${results.length} verificações).`);
}

main().catch((error) => {
  console.error("ERRO fatal test:stripe:", error instanceof Error ? error.message : error);
  process.exit(1);
});
