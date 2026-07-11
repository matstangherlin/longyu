import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRole || !supabaseUrl) {
    return json({ error: "Servidor não configurado." }, 501);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const fingerprint = clean(payload.fingerprint, 128);
  const message = clean(payload.message, 2000);
  if (!fingerprint) return json({ error: "Fingerprint obrigatório." }, 400);
  if (!message) return json({ error: "Mensagem obrigatória." }, 400);

  const admin = createClient(supabaseUrl, serviceRole);

  const occurrenceDelta = Number(payload.occurrence_delta);
  const delta = Number.isFinite(occurrenceDelta) && occurrenceDelta > 0 ? Math.floor(occurrenceDelta) : 1;

  const { data, error } = await admin.rpc("report_app_error", {
    p_error_name: clean(payload.error_name, 200, "Error"),
    p_message: message,
    p_stack: clean(payload.stack, 8000) || null,
    p_route: clean(payload.route, 512, "/"),
    p_app_version: clean(payload.app_version, 64),
    p_build_sha: clean(payload.build_sha, 64),
    p_browser: clean(payload.browser, 512),
    p_viewport: clean(payload.viewport, 64),
    p_last_safe_action: clean(payload.last_safe_action, 256) || null,
    p_fingerprint: fingerprint,
    p_occurrence_delta: delta,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, id: data });
});
