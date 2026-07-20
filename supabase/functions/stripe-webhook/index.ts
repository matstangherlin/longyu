import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!stripeSecret || !webhookSecret || !serviceRole || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Webhook não configurado no servidor." }), {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Assinatura Stripe ausente." }), { status: 400 });
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // event.created (segundos) ordena eventos do MESMO objeto: um evento antigo
  // entregue fora de ordem não pode reverter um estado mais novo (ver o RPC
  // apply_subscription_event, que aplica a escrita só se for >= ao persistido).
  const eventCreated = event.created;

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
    await admin.from("transactions").upsert(
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
        // user↔assinatura (client_reference_id). Se o retrieve falhar, ainda
        // gravamos o vínculo e concedemos Pro (como antes) para não deixar um
        // pagante sem Pro; um customer.subscription.updated corrige status/período.
        await admin.rpc("apply_subscription_event", {
          p_user_id: userId,
          p_customer_id: typeof session.customer === "string" ? session.customer : null,
          p_subscription_id: subscriptionId,
          p_status: "active",
          p_price_id: null,
          p_current_period_start: null,
          p_current_period_end: null,
          p_cancel_at_period_end: false,
          p_event_created: eventCreated,
        });
      }
    }

    await persistTransaction(userId, {
      kind: "subscription_payment",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "brl",
      status: "paid",
      metadata: session as unknown as Record<string, unknown>,
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
      metadata: invoice as unknown as Record<string, unknown>,
      invoiceId: invoice.id,
      subscriptionId: subscriptionId ?? undefined,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
