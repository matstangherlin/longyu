import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];
const DELETE_CONFIRM_TEXT = "EXCLUIR CONTA";

function allowedOrigins(): Set<string> {
  return new Set(
    [
      CANONICAL_ORIGIN,
      ...DEFAULT_ALLOWED_ORIGINS,
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

type JwtPayload = { iat?: number };

function parseJwtPayload(authHeader: string | null): JwtPayload | null {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
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

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");

  if (!serviceRole || !supabaseUrl || !supabaseAnon) {
    return new Response(JSON.stringify({ error: "Servidor não configurado." }), {
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

  // Step-up de segurança: exige confirmação explícita e token recente.
  const maxTokenAgeSec = Number(Deno.env.get("DELETE_ACCOUNT_MAX_TOKEN_AGE_SECONDS") ?? "900");
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const confirmation = String(body?.confirmationText ?? "").trim();
  if (confirmation !== DELETE_CONFIRM_TEXT) {
    return new Response(
      JSON.stringify({ error: `Confirmação inválida. Envie confirmationText="${DELETE_CONFIRM_TEXT}".` }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
  const payload = parseJwtPayload(authHeader);
  if (!payload?.iat) {
    return new Response(JSON.stringify({ error: "Token sem validade temporal (iat)." }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  const tokenAgeSec = Math.floor(Date.now() / 1000) - payload.iat;
  if (!Number.isFinite(tokenAgeSec) || tokenAgeSec < 0 || tokenAgeSec > maxTokenAgeSec) {
    return new Response(
      JSON.stringify({
        error: "Reautenticação necessária para excluir conta (token antigo). Faça login novamente.",
      }),
      { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
    );
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
  const userId = user.id;

  await admin.from("league_xp_events").delete().eq("user_id", userId);
  await admin.from("league_weekly_results").delete().eq("user_id", userId);
  await admin.from("league_memberships").delete().eq("user_id", userId);
  await admin.from("user_progress").delete().eq("user_id", userId);
  await admin.from("user_economy").delete().eq("user_id", userId);
  await admin.from("user_srs").delete().eq("user_id", userId);
  await admin.from("user_missions").delete().eq("user_id", userId);
  await admin.from("user_chests").delete().eq("user_id", userId);
  await admin.from("user_achievements").delete().eq("user_id", userId);
  await admin.from("subscriptions").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
