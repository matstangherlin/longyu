import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  BillingContractError,
  buildServerPriceMatrix,
  resolveAllowedPrice,
} from "../../../src/commercial/billing.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_BETA_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

function allowedOrigins(): Set<string> {
  return new Set(
    [
      CANONICAL_ORIGIN,
      ...DEFAULT_BETA_ORIGINS,
      ...(Deno.env.get("STRIPE_ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ].map((value) => value.replace(/\/$/, ""))
  );
}

function requestOrigin(req: Request): string {
  const incoming = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return allowedOrigins().has(incoming) ? incoming : CANONICAL_ORIGIN;
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": requestOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({
          error: "Stripe ainda não configurado no servidor. Defina STRIPE_SECRET_KEY no Supabase.",
        }),
        { status: 501, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    if (stripeSecret.startsWith("sk_live_")) {
      return new Response(JSON.stringify({ error: "Stripe Live is disabled for this release candidate." }), {
        status: 503,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const checkoutRequest = await req.json();
    const matrix = buildServerPriceMatrix((name) => Deno.env.get(name));
    const resolved = resolveAllowedPrice(checkoutRequest, matrix);
    if (resolved.status !== "CONFIGURED" || !resolved.providerPriceId) {
      return new Response(JSON.stringify({ error: "PRICE_PENDING" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const returnPath = typeof checkoutRequest.returnPath === "string" && /^\/[A-Za-z0-9\-/_?=&%]*$/.test(checkoutRequest.returnPath)
      ? checkoutRequest.returnPath
      : "/pro";

    // Allowlist de URLs de retorno: o header Origin é controlado pelo cliente,
    // então nunca redirecionamos para um domínio arbitrário. Origins permitidos
    // vêm do env (STRIPE_ALLOWED_ORIGINS, separados por vírgula) + canônicos.
    const origin = requestOrigin(req);
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": resolved.providerPriceId,
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "30",
      success_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}checkout=success`,
      cancel_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}checkout=cancel`,
      client_reference_id: user.id,
      customer_email: user.email ?? "",
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return new Response(JSON.stringify({ error: session.error?.message ?? "Erro no Stripe." }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      checkoutUrl: session.url,
      resolvedPlan: resolved.plan,
      resolvedMarket: resolved.market,
      resolvedCurrency: resolved.currency,
    }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof BillingContractError) {
      return new Response(JSON.stringify({ error: error.code }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
