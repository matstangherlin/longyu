import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({
          error: "Stripe ainda não configurado no servidor. Defina STRIPE_SECRET_KEY no Supabase.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allowlist de planos: só chaves conhecidas viram lookup de price ID (o price
    // vem SEMPRE do env do servidor — o cliente nunca injeta um price arbitrário).
    const ALLOWED_PLAN_KEYS = new Set(["pro_monthly", "pro_annual"]);
    const { planKey = "pro_monthly" } = await req.json();
    if (!ALLOWED_PLAN_KEYS.has(planKey)) {
      return new Response(JSON.stringify({ error: `Plano desconhecido: ${planKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const priceId = Deno.env.get(`STRIPE_PRICE_${planKey.toUpperCase()}`);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Plano indisponível: ${planKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allowlist de URLs de retorno: o header Origin é controlado pelo cliente,
    // então nunca redirecionamos para um domínio arbitrário. Origins permitidos
    // vêm do env (STRIPE_ALLOWED_ORIGINS, separados por vírgula) + o canônico.
    const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
    const allowedOrigins = new Set(
      [
        CANONICAL_ORIGIN,
        ...(Deno.env.get("STRIPE_ALLOWED_ORIGINS") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ].map((value) => value.replace(/\/$/, ""))
    );
    const requestOrigin = (req.headers.get("origin") ?? "").replace(/\/$/, "");
    const origin = allowedOrigins.has(requestOrigin) ? requestOrigin : CANONICAL_ORIGIN;
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "30",
      success_url: `${origin}/pro?checkout=success`,
      cancel_url: `${origin}/pro?checkout=cancel`,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
