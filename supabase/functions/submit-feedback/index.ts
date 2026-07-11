import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = new Set([
  "bug",
  "conteúdo incorreto",
  "dificuldade pedagógica",
  "design",
  "sugestão",
  "conta/sync",
  "pagamento",
  "outro",
]);

const SEVERITIES = new Set(["baixa", "média", "alta", "bloqueadora"]);
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
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

  const category = cleanText(payload.category, 64);
  const severity = cleanText(payload.severity, 32);
  const message = cleanText(payload.message, 4000);
  const route = cleanText(payload.route, 512) ?? "/";

  if (!category || !CATEGORIES.has(category)) {
    return json({ error: "Categoria inválida." }, 400);
  }
  if (!severity || !SEVERITIES.has(severity)) {
    return json({ error: "Severidade inválida." }, 400);
  }
  if (!message || message.length < 10) {
    return json({ error: "Descreva o que aconteceu (mínimo 10 caracteres)." }, 400);
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const submitterHash = await hashIp(ip);

  const admin = createClient(supabaseUrl, serviceRole);
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count, error: countError } = await admin
    .from("feedback_reports")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .eq("submitter_hash", submitterHash)
    .gte("created_at", since);

  if (countError) {
    return json({ error: "Não foi possível validar o limite de envios." }, 500);
  }
  if ((count ?? 0) >= RATE_LIMIT) {
    return json({ error: "Muitos relatos anônimos nesta hora. Tente de novo mais tarde ou crie uma conta." }, 429);
  }

  const row = {
    user_id: null,
    category,
    severity,
    message,
    expected_behavior: cleanText(payload.expected_behavior, 2000),
    route,
    lesson_id: cleanText(payload.lesson_id, 128),
    step_id: cleanText(payload.step_id, 128),
    app_version: cleanText(payload.app_version, 64) ?? "",
    build_sha: cleanText(payload.build_sha, 64) ?? "",
    browser: cleanText(payload.browser, 512) ?? "",
    platform: cleanText(payload.platform, 128) ?? "",
    viewport: cleanText(payload.viewport, 64) ?? "",
    submitter_hash: submitterHash,
    status: "novo",
  };

  const { data, error } = await admin.from("feedback_reports").insert(row).select("id").single();
  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, id: data.id });
});
