import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildReturnUrl,
  checkRateLimit,
  handleOptions,
  jsonResponse,
} from "../_shared/security.ts";

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecret) {
      return jsonResponse(req, { error: "Stripe não configurado." }, 501);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { error: "Não autenticado." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return jsonResponse(req, { error: "Sessão inválida." }, 401);
    }

    if (!checkRateLimit(`portal:${user.id}`, 20, 60 * 60 * 1000)) {
      return jsonResponse(req, { error: "Muitas tentativas. Tente novamente mais tarde." }, 429);
    }

    const returnUrl = buildReturnUrl(req, "/conta");
    if (!returnUrl) {
      return jsonResponse(req, { error: "Origem não autorizada para portal." }, 403);
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
      return jsonResponse(req, { error: "Nenhuma assinatura Stripe vinculada a esta conta." }, 404);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse(req, { url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse(req, { error: message }, 500);
  }
});
