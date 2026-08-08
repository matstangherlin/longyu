import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://longyu.com.br",
  "https://www.longyu.com.br",
  "https://longyu.netlify.app",
  "https://singular-meringue-7838cd.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://singular-meringue-7838cd.netlify.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function requestOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

async function hasValidProjectApiKey(req: Request, supabaseUrl: string): Promise<boolean> {
  const supplied = req.headers.get("apikey")?.trim();
  if (!supplied) return false;

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: supplied },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function trustedClientIp(req: Request): string | null {
  // Ignore forgeable client IP headers on direct Edge URLs.
  // Prefer the rightmost X-Forwarded-For hop appended by the platform proxy.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1] ?? null;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    if (!requestOriginAllowed(req)) return json(req, { error: "origin_not_allowed" }, 403);
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!requestOriginAllowed(req)) return json(req, { error: "origin_not_allowed" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "backend_unavailable" }, 503);
  }
  if (!(await hasValidProjectApiKey(req, supabaseUrl))) {
    return json(req, { error: "invalid_api_key" }, 401);
  }

  const ip = trustedClientIp(req);
  if (!ip) return json(req, { error: "network_identity_unavailable" }, 503);

  try {
    // The HMAC is stable only for one UTC day. Raw network addresses and the
    // secret never enter Postgres or the response.
    const day = new Date().toISOString().slice(0, 10);
    const hmacSecret =
      Deno.env.get("ANON_INGESTION_HASH_SECRET")?.trim() || serviceRoleKey;
    const rateBucketKey = await hmacSha256Hex(
      hmacSecret,
      `longyu-anon-ingestion|${day}|${ip}`,
    );

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.rpc("issue_beta_anon_ingestion_session", {
      p_rate_bucket_key: rateBucketKey,
    });

    if (error) {
      const rateLimited = /rate_limited/i.test(error.message ?? "");
      return json(
        req,
        { error: rateLimited ? "rate_limited" : "backend_unavailable" },
        rateLimited ? 429 : 503,
      );
    }

    if (typeof data !== "string" || data.length !== 64) {
      return json(req, { error: "backend_unavailable" }, 503);
    }

    return json(req, { token: data, expiresIn: 86400 });
  } catch {
    return json(req, { error: "backend_unavailable" }, 503);
  }
});
