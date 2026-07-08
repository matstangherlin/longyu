import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function mapSubscriptionStatus(status: string): string {
  if (status === "trialing" || status === "active") return status;
  if (status === "canceled") return "canceled";
  if (status === "past_due" || status === "unpaid") return status;
  return status;
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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura inválida.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? null;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    if (userId && subscriptionId) {
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );
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

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId =
      (await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle()).data?.user_id ?? null;

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
        stripe_subscription_id: subscription.id,
        status: mapSubscriptionStatus(subscription.status),
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
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
      kind: event.type === "invoice.paid" ? "subscription_payment" : "subscription_payment",
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
