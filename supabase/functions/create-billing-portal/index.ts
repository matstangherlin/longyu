import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: "Stripe não configurado." }), {
        status: 501,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

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

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: "Nenhuma assinatura Stripe vinculada a esta conta." }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    const origin = requestOrigin(req);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/conta`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
