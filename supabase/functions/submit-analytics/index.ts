import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EVENTS = new Set([
  "landing_viewed",
  "get_started_clicked",
  "login_clicked",
  "onboarding_started",
  "onboarding_completed",
  "placement_completed",
  "first_lesson_started",
  "first_lesson_completed",
  "lesson_started",
  "lesson_completed",
  "lesson_abandoned",
  "lesson_recovery_started",
  "lesson_recovery_completed",
  "step_mistake",
  "hanzi_builder_completed",
  "story_started",
  "story_completed",
  "review_completed",
  "charge_consumed",
  "charge_exhausted",
  "story_energy_granted",
  "mission_claimed",
  "pro_offer_shown",
  "pro_offer_clicked",
  "checkout_started",
  "trial_started",
  "subscription_activated",
  "subscription_canceled",
  "sync_failed",
  "sync_recovered",
  "app_error",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max) || fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!serviceRole || !supabaseUrl) return json({ error: "Servidor não configurado." }, 501);

  let body: { events?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return json({ error: "events obrigatório." }, 400);
  }
  if (body.events.length > 25) return json({ error: "Lote muito grande." }, 400);

  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && supabaseAnon) {
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    userId = user?.id ?? null;
  }

  const rows = [];
  for (const raw of body.events) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as Record<string, unknown>;
    const eventName = clean(event.event_name, 64);
    if (!ALLOWED_EVENTS.has(eventName)) continue;
    rows.push({
      anonymous_id: clean(event.anonymous_id, 64, "anon"),
      user_id: userId,
      session_id: clean(event.session_id, 64, "session"),
      event_name: eventName,
      route: clean(event.route, 512, "/"),
      lesson_id: clean(event.lesson_id, 128) || null,
      step_type: clean(event.step_type, 64) || null,
      metadata: typeof event.metadata === "object" && event.metadata !== null ? event.metadata : {},
      app_version: clean(event.app_version, 32),
    });
  }

  if (rows.length === 0) return json({ error: "Nenhum evento válido." }, 400);

  const admin = createClient(supabaseUrl, serviceRole);
  const { error } = await admin.from("analytics_events").insert(rows);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, ingested: rows.length });
});
