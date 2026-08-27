import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logOpsEdge } from "../_shared/opsCorrelation.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";

function corsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return {
    // Webhook é server-to-server; para requests de browser, só ecoamos origem canônica.
    "Access-Control-Allow-Origin": origin === CANONICAL_ORIGIN ? origin : CANONICAL_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Vary": "Origin",
  };
}

// Status que refletimos direto do Stripe. Mantemos o valor cru (trialing,
// active, past_due, unpaid, canceled, incomplete...) — o RPC get_server_entitlement
// e o entitlementService decidem o que concede Pro. NUNCA forçamos "active".
function subscriptionStatus(status: string): string {
  return status;
}

function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

function priceIdOf(subscription: Stripe.Subscription): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!stripeSecret || !webhookSecret || !serviceRole || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Webhook não configurado no servidor." }), {
      status: 501,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Assinatura Stripe ausente." }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
  const admin = createClient(supabaseUrl, serviceRole);

  // Verificação de assinatura Stripe: sem isto, qualquer um forjaria eventos.
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura inválida.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Ordenação composta: event.created (segundos) + event.id. O RPC rejeita
  // eventos mais antigos e trata cancelamento no mesmo segundo como terminal.
  const eventCreated = event.created;
  const eventId = event.id;
  logOpsEdge(req, "start", { stripeEventId: eventId, stripeEventType: event.type });

  const persistTransaction = async (
    userId: string | null,
    payload: {
      kind: string;
      amount: number;
      currency: string;
      status: string;
      metadata: Record<string, unknown>;
      checkoutSessionId?: string;
      invoiceId?: string;
      subscriptionId?: string;
    }
  ) => {
    // Idempotente por stripe_event_id: o mesmo evento entregue duas vezes não
    // duplica a transação (upsert no índice único stripe_event_id).
    const { error } = await admin.from("transactions").upsert(
      {
        stripe_event_id: event.id,
        user_id: userId,
        stripe_checkout_session_id: payload.checkoutSessionId ?? null,
        stripe_invoice_id: payload.invoiceId ?? null,
        stripe_subscription_id: payload.subscriptionId ?? null,
        kind: payload.kind,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        metadata: payload.metadata,
      },
      { onConflict: "stripe_event_id" }
    );
    if (error) throw new Error("transaction_persist_failed");
  };

  const lookupUserId = async (subscriptionId: string | null): Promise<string | null> => {
    if (!subscriptionId) return null;
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    return data?.user_id ?? null;
  };

  // Escreve o estado da assinatura respeitando a ordem por event.created. Todo
  // caminho (created/updated/deleted/checkout) passa por aqui.
  const applySubscription = async (subscription: Stripe.Subscription, userIdHint: string | null) => {
    const userId = userIdHint ?? (await lookupUserId(subscription.id));
    await admin.rpc("apply_subscription_event", {
      p_user_id: userId,
      p_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
      p_subscription_id: subscription.id,
      p_status: subscriptionStatus(subscription.status),
      p_price_id: priceIdOf(subscription),
      p_current_period_start: toIso(subscription.current_period_start),
      p_current_period_end: toIso(subscription.current_period_end),
      p_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      p_event_created: eventCreated,
      p_event_id: eventId,
    });
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? null;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

    // Busca o estado REAL da assinatura (trialing/active/período) em vez de
    // assumir "active" — um checkout com trial de 30 dias nasce "trialing".
    if (subscriptionId) {
      let subscription: Stripe.Subscription | null = null;
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (_error) {
        subscription = null;
      }
      if (subscription) {
        await applySubscription(subscription, userId);
      } else if (userId) {
        // Fallback resiliente: o checkout é o ÚNICO evento com o vínculo
        // user↔assinatura (client_reference_id). Se o retrieve falhar, gravamos
        // vínculo em estado conservador; updated/created posterior corrige.
        await admin.rpc("apply_subscription_event", {
          p_user_id: userId,
          p_customer_id: typeof session.customer === "string" ? session.customer : null,
          p_subscription_id: subscriptionId,
          p_status: "incomplete",
          p_price_id: null,
          p_current_period_start: null,
          p_current_period_end: null,
          p_cancel_at_period_end: false,
          p_event_created: eventCreated,
          p_event_id: eventId,
        });
      }
    }

    await persistTransaction(userId, {
      kind: "subscription_payment",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "brl",
      status: "paid",
      metadata: {
        mode: session.mode,
        payment_status: session.payment_status,
      },
      checkoutSessionId: session.id,
      subscriptionId: subscriptionId ?? undefined,
    });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await applySubscription(subscription, null);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    const userId = await lookupUserId(subscriptionId);

    await persistTransaction(userId, {
      kind: "subscription_payment",
      amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: invoice.currency ?? "brl",
      status: event.type === "invoice.paid" ? "paid" : "failed",
      metadata: {
        billing_reason: invoice.billing_reason,
        collection_method: invoice.collection_method,
        attempt_count: invoice.attempt_count,
        paid: invoice.paid,
      },
      invoiceId: invoice.id,
      subscriptionId: subscriptionId ?? undefined,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
