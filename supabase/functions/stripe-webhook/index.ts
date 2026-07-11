import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

function webhookResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mapSubscriptionStatus(status: string): string {
  if (status === "trialing" || status === "active") return status;
  if (status === "canceled") return "canceled";
  if (status === "past_due" || status === "unpaid") return status;
  return status;
}

function subscriptionIsPro(row: {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null): boolean {
  if (!row) return false;
  const periodEnd = row.current_period_end ? Date.parse(row.current_period_end) : undefined;
  const stillValid = !periodEnd || periodEnd > Date.now();
  if (ACTIVE_STATUSES.has(row.status) && stillValid) return true;
  if ((row.status === "canceled" || row.cancel_at_period_end) && stillValid) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!stripeSecret || !webhookSecret || !serviceRole || !supabaseUrl) {
    return webhookResponse({ error: "Webhook não configurado no servidor." }, 501);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return webhookResponse({ error: "Assinatura Stripe ausente." }, 400);
  }

  const body = await req.text();
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
  const admin = createClient(supabaseUrl, serviceRole);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura inválida.";
    return webhookResponse({ error: message }, 400);
  }

  const { data: processed } = await admin
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (processed) {
    return webhookResponse({ received: true, duplicate: true });
  }

  const markProcessed = async () => {
    await admin.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
    });
  };

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

  const shouldApplySubscriptionEvent = async (
    subscriptionId: string,
    incomingStatus: string,
    eventCreated: number
  ): Promise<boolean> => {
    const { data: current } = await admin
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, last_stripe_event_created")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (!current) return true;
    if (eventCreated < (current.last_stripe_event_created ?? 0)) return false;

    const currentlyPro = subscriptionIsPro(current);
    const incomingPro = ACTIVE_STATUSES.has(incomingStatus);
    if (currentlyPro && !incomingPro && current.cancel_at_period_end) {
      const periodEnd = current.current_period_end ? Date.parse(current.current_period_end) : 0;
      if (periodEnd > Date.now()) return true;
    }

    return true;
  };

  const upsertSubscription = async (
    subscriptionId: string,
    row: {
      user_id: string | null;
      stripe_customer_id: string | null;
      status: string;
      price_id?: string | null;
      current_period_start?: string | null;
      current_period_end?: string | null;
      cancel_at_period_end?: boolean;
    }
  ) => {
    const canApply = await shouldApplySubscriptionEvent(subscriptionId, row.status, event.created);
    if (!canApply) return;

    await admin.from("subscriptions").upsert(
      {
        user_id: row.user_id,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: subscriptionId,
        status: mapSubscriptionStatus(row.status),
        price_id: row.price_id ?? null,
        current_period_start: row.current_period_start ?? null,
        current_period_end: row.current_period_end ?? null,
        cancel_at_period_end: row.cancel_at_period_end ?? false,
        last_stripe_event_created: event.created,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? null;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    if (userId && subscriptionId) {
      let status = "trialing";
      let priceId: string | null = null;
      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      let cancelAtPeriodEnd = false;

      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        status = stripeSubscription.status;
        priceId = stripeSubscription.items.data[0]?.price?.id ?? null;
        periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
        periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      } catch {
        const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        periodStart = new Date().toISOString();
        periodEnd = new Date(trialEnd * 1000).toISOString();
      }

      await upsertSubscription(subscriptionId, {
        user_id: userId,
        stripe_customer_id: customerId,
        status,
        price_id: priceId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    }

    await persistTransaction(userId, {
      kind: "subscription_payment",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "brl",
      status: "paid",
      metadata: { session_id: session.id, mode: session.mode },
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
    const userId =
      (await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle()).data?.user_id ??
      (typeof subscription.metadata?.user_id === "string" ? subscription.metadata.user_id : null);

    const priceId = subscription.items.data[0]?.price?.id ?? null;

    await upsertSubscription(subscription.id, {
      user_id: userId,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
      status: subscription.status,
      price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    const userId =
      subscriptionId
        ? (await admin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle()).data?.user_id ?? null
        : null;

    await persistTransaction(userId, {
      kind: "subscription_payment",
      amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: invoice.currency ?? "brl",
      status: event.type === "invoice.paid" ? "paid" : "failed",
      metadata: { invoice_id: invoice.id, billing_reason: invoice.billing_reason },
      invoiceId: invoice.id,
      subscriptionId: subscriptionId ?? undefined,
    });
  }

  await markProcessed();

  return webhookResponse({ received: true });
});
