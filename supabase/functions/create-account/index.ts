import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validatePlacementEvidence } from "../_shared/placement/engine.ts";
import {
  canonicalCountryCode,
  parsePlacementEvidence,
} from "../_shared/placement/evidence.ts";

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

const ALLOWED_EMAIL_REDIRECTS = new Set([
  "https://longyu.com.br/confirmar-email",
  "https://www.longyu.com.br/confirmar-email",
  "https://longyu.netlify.app/confirmar-email",
  "https://singular-meringue-7838cd.netlify.app/confirmar-email",
  "http://localhost:5173/confirmar-email",
  "http://127.0.0.1:5173/confirmar-email",
  "http://127.0.0.1:4173/confirmar-email",
  "http://localhost:4173/confirmar-email",
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
  // Não confiar em headers de IP forjáveis em chamada direta ao Edge.
  // Só o hop direito do XFF / x-real-ip anexado pelo proxy da plataforma.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Canonicaliza e-mail para rate-limit / anti-farming (plus-address + Gmail dots). */
function canonicalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
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

async function resolveTurnstileSecret(
  admin: ReturnType<typeof createClient>,
): Promise<string | null> {
  const fromEnv = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (fromEnv) return fromEnv;
  // Fallback: Vault via RPC (quando supabase secrets set ainda não rodou).
  const { data, error } = await admin.rpc("_edge_get_turnstile_secret");
  if (error) {
    console.error("turnstile vault rpc:", error.message);
    return null;
  }
  const secret = typeof data === "string" ? data.trim() : "";
  return secret || null;
}

async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  secret: string | null,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  if (!secret) {
    // Fail-closed em produção. Dev local: TURNSTILE_ALLOW_SKIP=1.
    const allowSkip = Deno.env.get("TURNSTILE_ALLOW_SKIP")?.trim() === "1";
    if (allowSkip) return { ok: true, skipped: true };
    return { ok: false, skipped: false, error: "captcha_unavailable" };
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
      country?: string;
      countryCode?: string;
      birthDate?: string;
      signupSource?: string;
      marketingOptIn?: boolean;
      placement?: unknown;
    };

    // emailRaw: o que o usuário digitou (normalizado só trim/lowercase) — vai para Auth.
    // emailKey: forma canônica só para rate-limit / anti-farming (plus + Gmail dots).
    // O SQL (_user_email_hash) canonicaliza na leitura a partir de auth.users.email cru.
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const emailKey = canonicalizeEmail(emailRaw);
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim() || "Aluno Longyu";
    const emailRedirectTo = sanitizeEmailRedirect(body.emailRedirectTo);
    const captchaToken = String(body.captchaToken ?? "").trim() || undefined;

    if (!emailRaw || !emailRaw.includes("@") || !password) {
      return json(req, { error: "Dados inválidos." }, 400);
    }
    if (password.length < 6) {
      return json(req, { error: "Senha deve ter ao menos 6 caracteres." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = clientIp(req);
    const turnstileSecret = await resolveTurnstileSecret(admin);
    const captcha = await verifyTurnstile(captchaToken, ip, turnstileSecret);
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
    const emailHash = await sha256Hex(emailKey);
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
        email: emailRaw,
        message: GENERIC_PENDING_MESSAGE,
      });

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: emailRaw,
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
          email: emailRaw,
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
    const countryLabel = String(body.country ?? "").trim() || "Brasil";
    const countryCode = canonicalCountryCode(body.countryCode || countryLabel);
    const birthDate = String(body.birthDate ?? "").trim() || null;
    const signupSource = String(body.signupSource ?? "").trim() || null;
    const marketingOptIn = body.marketingOptIn === true;

    // Novo usuario nasce com onboarding pendente. So o commit de placement marca true.
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        name: displayName,
        onboarding_completed: false,
        onboarding_version: 2,
        native_language: "pt-BR",
        target_language: "zh-CN",
        interface_locale: "pt-BR",
        instruction_locale: "pt-BR",
        country: countryLabel,
        country_code: countryCode,
        birth_date: birthDate,
        signup_source: signupSource,
        marketing_opt_in: marketingOptIn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileError) {
      console.error("create-account profile:", profileError.message);
    }

    const evidence = parsePlacementEvidence(body.placement);
    if (evidence) {
      const validated = validatePlacementEvidence({
        placementVersion: evidence.placementVersion,
        declaredExperience: evidence.declaredExperience,
        answers: evidence.answers,
      });
      if (validated.ok) {
        const { error: draftError } = await admin.rpc("save_placement_onboarding_draft", {
          p_user_id: userId,
          p_placement_version: evidence.placementVersion,
          p_declared_experience: evidence.declaredExperience,
          p_goal: evidence.goal,
          p_answers: evidence.answers,
          p_ttl_hours: 168,
        });
        if (draftError) {
          console.error("create-account draft:", draftError.message);
        }
      } else {
        console.info("create-account placement rejected:", validated.error);
      }
    }

    const { error: resendError } = await admin.auth.resend({
      type: "signup",
      email: emailRaw,
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
