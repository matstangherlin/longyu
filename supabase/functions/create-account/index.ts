import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://longyu.com.br",
  "https://www.longyu.com.br",
  "https://longyu.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://longyu.com.br";
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
    };

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim() || "Aluno Longyu";
    const emailRedirectTo =
      String(body.emailRedirectTo ?? "").trim() || undefined;

    if (!email || !password) {
      return json(req, { error: "email e password são obrigatórios" }, 400);
    }
    if (password.length < 6) {
      return json(req, { error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin API: email_confirm=false deixa o usuário pendente mesmo com
    // mailer_autoconfirm=true no projeto (signUp público auto-confirma).
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
      return json(
        req,
        {
          ok: false,
          code: already ? "already_exists" : "create_failed",
          error: msg,
        },
        already ? 200 : 400,
      );
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

    // generateLink não envia email — só monta o link. Use resend para disparar.
    const { error: resendError } = await admin.auth.resend({
      type: "signup",
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    return json(req, {
      ok: true,
      userId,
      email,
      pendingConfirmation: true,
      emailed: !resendError,
      emailError: resendError?.message ?? null,
      profileError: profileError?.message ?? null,
    });
  } catch (error) {
    return json(
      req,
      { error: error instanceof Error ? error.message : "Erro interno" },
      500,
    );
  }
});
