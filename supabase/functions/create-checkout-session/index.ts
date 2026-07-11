import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildReturnUrl,
  checkRateLimit,
  getWhitelistedPriceId,
  handleOptions,
  jsonResponse,
} from "../_shared/security.ts";

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return jsonResponse(req, {
        error: "Stripe ainda não configurado no servidor. Defina STRIPE_SECRET_KEY no Supabase.",
      }, 501);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    if (!checkRateLimit(`checkout:${user.id}`, 12, 60 * 60 * 1000)) {
      return jsonResponse(req, { error: "Muitas tentativas. Tente novamente mais tarde." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const planKey = typeof body.planKey === "string" ? body.planKey : "pro_monthly";
    const priceId = getWhitelistedPriceId(planKey);
    if (!priceId) {
      return jsonResponse(req, { error: `Plano não permitido: ${planKey}` }, 400);
    }

    const successUrl = buildReturnUrl(req, "/pro?checkout=success");
    const cancelUrl = buildReturnUrl(req, "/pro?checkout=cancel");
    if (!successUrl || !cancelUrl) {
      return jsonResponse(req, { error: "Origem não autorizada para checkout." }, 403);
    }

    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "30",
      success_url: successUrl,
      cancel_url: cancelUrl,
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
      return jsonResponse(req, { error: session.error?.message ?? "Erro no Stripe." }, 502);
    }

    return jsonResponse(req, { url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse(req, { error: message }, 500);
  }
});
