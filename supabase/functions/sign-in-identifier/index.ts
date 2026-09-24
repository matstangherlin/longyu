// RC2.2.11 · AU–AX — login por nome de usuário.
//
// STATUS: CODE_READY_AWAITING_CLOUD_APPLY. Não está em LONGYU_EDGE_FUNCTIONS
// (scripts/lib/edge-functions.mjs), então nenhum deploy automático a publica.
// Depende de supabase/pending/rc2-2-11-username-identifier.sql aplicado.
//
// Contrato:
//   POST { identifier: "<username>", password }
//   200  { ok: true, session: { access_token, refresh_token, expires_in, token_type } }
//   401  { ok: false, code: "invalid_credentials" }   ← usuário inexistente OU senha errada
//   403  { ok: false, code: "email_not_confirmed" }   ← só depois de a senha conferir
//   429  { ok: false, code: "rate_limited" }
//
// Nunca: devolver email, devolver o objeto `user`, logar identificador ou
// email em claro, ou responder diferente para "não existe" e "senha errada".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logOpsEdge } from "../_shared/opsCorrelation.ts";
import { normalizeLoginUsername } from "./usernameRules.ts";

const ALLOWED_ORIGINS = new Set([
  "https://longyu.com.br",
  "https://www.longyu.com.br",
  "https://longyu.netlify.app",
  "https://singular-meringue-7838cd.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

/** Tempo mínimo de resposta: "não existe" e "senha errada" levam o mesmo tempo. */
const MIN_RESPONSE_MS = 700;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://singular-meringue-7838cd.netlify.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-longyu-correlation-id, x-longyu-session-id, x-longyu-op",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function padTo(startedAt: number): Promise<void> {
  const wait = MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, code: "method_not_allowed" }, 405);

  const startedAt = Date.now();
  logOpsEdge(req, "start");
  const invalid = async () => {
    logOpsEdge(req, "error", { code: "invalid_credentials" });
    await padTo(startedAt);
    return json(req, { ok: false, code: "invalid_credentials" }, 401);
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(req, { ok: false, code: "unavailable" }, 503);
    }

    const body = (await req.json().catch(() => ({}))) as { identifier?: unknown; password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    const username = normalizeLoginUsername(body.identifier);
    // Formato inválido responde igual a credencial errada (sem oráculo).
    if (!username || password.length < 6 || password.length > 256) return await invalid();

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: rate, error: rateError } = await admin.rpc("check_and_record_login_rate", {
      p_ip_hash: await sha256Hex(clientIp(req)),
      p_identifier_hash: await sha256Hex(`username:${username}`),
    });
    if (rateError) return json(req, { ok: false, code: "unavailable" }, 503);
    if (!(rate as { allowed?: boolean } | null)?.allowed) {
      await padTo(startedAt);
      return json(req, { ok: false, code: "rate_limited" }, 429);
    }

    const { data: userId } = await admin.rpc("resolve_login_identity", { p_username: username });
    if (typeof userId !== "string" || !userId) return await invalid();

    // O email só existe DENTRO desta função, para o signInWithPassword.
    const { data: found } = await admin.auth.admin.getUserById(userId);
    const email = found?.user?.email;
    if (!email) return await invalid();

    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: signed, error: signError } = await anon.auth.signInWithPassword({ email, password });
    if (signError || !signed.session) {
      if (signError && /email not confirmed|email_not_confirmed/i.test(signError.message)) {
        await padTo(startedAt);
        return json(req, { ok: false, code: "email_not_confirmed" }, 403);
      }
      return await invalid();
    }

    logOpsEdge(req, "ok");
    await padTo(startedAt);
    return json(req, {
      ok: true,
      session: {
        access_token: signed.session.access_token,
        refresh_token: signed.session.refresh_token,
        expires_in: signed.session.expires_in,
        token_type: signed.session.token_type,
      },
    });
  } catch {
    return json(req, { ok: false, code: "unavailable" }, 503);
  }
});
