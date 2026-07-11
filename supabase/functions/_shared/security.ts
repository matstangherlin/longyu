const DEFAULT_ALLOWED_ORIGINS = [
  "https://longyu.app",
  "https://www.longyu.app",
  "https://singular-meringue-7838cd.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const ALLOWED_PLAN_KEYS = new Set(["pro_monthly", "pro_annual"]);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function parseAllowedOrigins(): string[] {
  const extra = Deno.env.get("LONGYU_ALLOWED_ORIGINS");
  if (!extra) return DEFAULT_ALLOWED_ORIGINS;
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra.split(",").map((v) => v.trim()).filter(Boolean)];
}

export function isAllowedPlanKey(planKey: string): boolean {
  return ALLOWED_PLAN_KEYS.has(planKey);
}

export function resolveAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return DEFAULT_ALLOWED_ORIGINS[0];
  const allowed = parseAllowedOrigins();
  return allowed.includes(origin) ? origin : null;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = resolveAllowedOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Vary": "Origin",
  };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const origin = resolveAllowedOrigin(req);
  if (status !== 204 && origin === null && req.method !== "OPTIONS") {
    return new Response(JSON.stringify({ error: "Origem não autorizada." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      ...(status === 204 ? {} : { "Content-Type": "application/json" }),
      ...extraHeaders,
    },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const origin = resolveAllowedOrigin(req);
  if (!origin) {
    return new Response(null, { status: 403 });
  }
  return new Response("ok", { headers: corsHeadersFor(req) });
}

export function buildReturnUrl(req: Request, path: string): string | null {
  const origin = resolveAllowedOrigin(req);
  if (!origin) return null;
  if (!path.startsWith("/")) return null;
  const allowedPaths = new Set(["/pro", "/conta", "/jornada", "/login"]);
  const basePath = path.split("?")[0];
  if (!allowedPaths.has(basePath)) return null;
  return `${origin}${path}`;
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function getWhitelistedPriceId(planKey: string): string | null {
  if (!isAllowedPlanKey(planKey)) return null;
  const envKey = `STRIPE_PRICE_${planKey.toUpperCase()}`;
  const priceId = Deno.env.get(envKey);
  return priceId?.trim() || null;
}
