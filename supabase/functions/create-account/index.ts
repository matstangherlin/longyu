import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://longyu.com.br",
  "https://www.longyu.com.br",
  "https://longyu.netlify.app",
  "https://singular-meringue-7838cd.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const ALLOWED_EMAIL_REDIRECTS = new Set([
  "https://longyu.com.br/confirmar-email",
  "https://www.longyu.com.br/confirmar-email",
  "https://longyu.netlify.app/confirmar-email",
  "https://singular-meringue-7838cd.netlify.app/confirmar-email",
  "http://localhost:5173/confirmar-email",
  "http://127.0.0.1:5173/confirmar-email",
]);

// Produção atual é Netlify (domínio próprio ainda não comprado).
// longyu.com.br permanece na allowlist para quando o DNS for apontado.
const CANONICAL_CONFIRM_REDIRECT =
  "https://singular-meringue-7838cd.netlify.app/confirmar-email";
const GENERIC_PENDING_MESSAGE =
  "Se o endereço puder ser utilizado, enviaremos as próximas instruções por e-mail.";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://singular-meringue-7838cd.netlify.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  // Prefer the rightmost hop (adicionado pelo proxy confiável); o cliente pode forjar o primeiro.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function sanitizeEmailRedirect(raw: string | undefined): string {
  if (!raw) return CANONICAL_CONFIRM_REDIRECT;
  const cleaned = raw.trim().replace(/\/$/, "");
  if (ALLOWED_EMAIL_REDIRECTS.has(cleaned)) return cleaned;
  // Aceita só path /confirmar-email em origins allowlisted.
  try {
    const url = new URL(cleaned);
    const origin = url.origin;
    if (ALLOWED_ORIGINS.has(origin) && url.pathname === "/confirmar-email") {
      return `${origin}/confirmar-email`;
    }
  } catch {
    // ignore
  }
  return CANONICAL_CONFIRM_REDIRECT;
}

async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (!secret) {
    // Sem secret configurado: não bloqueia (dev / pré-marketing).
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, skipped: false, error: "captcha_required" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const result = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  if (!result.success) {
    return {
      ok: false,
      skipped: false,
      error: (result["error-codes"] ?? ["captcha_failed"]).join(","),
    };
  }
  return { ok: true, skipped: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: "Missing Supabase env" }, 500);
    }

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      emailRedirectTo?: string;
      captchaToken?: string;
    };

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim() || "Aluno Longyu";
    const emailRedirectTo = sanitizeEmailRedirect(body.emailRedirectTo);
    const captchaToken = String(body.captchaToken ?? "").trim() || undefined;

    if (!email || !email.includes("@") || !password) {
      return json(req, { error: "Dados inválidos." }, 400);
    }
    if (password.length < 6) {
      return json(req, { error: "Senha deve ter ao menos 6 caracteres." }, 400);
    }

    const ip = clientIp(req);
    const captcha = await verifyTurnstile(captchaToken, ip);
    if (!captcha.ok) {
      return json(
        req,
        {
          ok: false,
          code: "captcha_failed",
          error: "Não foi possível validar o desafio de segurança. Tente de novo.",
        },
        400,
      );
    }

    const ipHash = await sha256Hex(ip);
    const emailHash = await sha256Hex(email);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: rateData, error: rateError } = await admin.rpc(
      "check_and_record_signup_rate",
      { p_ip_hash: ipHash, p_email_hash: emailHash },
    );

    if (rateError) {
      console.error("signup rate rpc error", rateError.message);
      return json(req, { error: "Falha temporária. Tente novamente." }, 503);
    }

    const allowed = Boolean((rateData as { allowed?: boolean } | null)?.allowed);
    if (!allowed) {
      return json(
        req,
        {
          ok: false,
          code: "rate_limited",
          error: "Muitas tentativas. Aguarde e tente novamente mais tarde.",
        },
        429,
      );
    }

    // Resposta pública sempre genérica (anti-enumeração).
    const genericOk = () =>
      json(req, {
        ok: true,
        pendingConfirmation: true,
        email,
        message: GENERIC_PENDING_MESSAGE,
      });

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { name: displayName, display_name: displayName },
      });

    if (createError || !created.user) {
      const msg = createError?.message ?? "Falha ao criar conta";
      const already = /already|registered|exists/i.test(msg);
      if (already) {
        // Conta existente: tenta reenviar confirmação se ainda pendente; não revela.
        const { error: resendError } = await admin.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo },
        });
        if (resendError) {
          console.info("create-account existing email resend:", resendError.message);
        }
        return genericOk();
      }
      console.error("create-account createUser:", msg);
      return json(req, { error: "Não foi possível criar a conta agora." }, 400);
    }

    const userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        name: displayName,
        onboarding_completed: true,
        native_language: "pt-BR",
        target_language: "zh-CN",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileError) {
      console.error("create-account profile:", profileError.message);
    }

    const { error: resendError } = await admin.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    if (resendError) {
      console.error("create-account resend:", resendError.message);
    }

    return genericOk();
  } catch (error) {
    console.error("create-account fatal:", error);
    return json(
      req,
      { error: error instanceof Error ? error.message : "Erro interno" },
      500,
    );
  }
});
