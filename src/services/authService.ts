import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { emailConfirmationRedirectUrl, passwordRecoveryRedirectUrl } from "../lib/authRedirect";
import type { ProfileDetails } from "./profileTypes";
import { profileDetailsPayload } from "./profileTypes";

export type AuthServiceStatus = "ok" | "error" | "not_implemented" | "pending_confirmation";

export interface FutureAuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthServiceResult<T = undefined> {
  status: AuthServiceStatus;
  message: string;
  data?: T;
}

const AUTH_NOT_IMPLEMENTED_MESSAGE =
  "Contas reais ainda não estão ativas nesta versão. Quando o backend estiver conectado, autenticação e sincronização usarão um serviço seguro.";

function notImplemented<T = undefined>(): AuthServiceResult<T> {
  return { status: "not_implemented", message: AUTH_NOT_IMPLEMENTED_MESSAGE };
}

async function ensureProfile(userId: string, profile: ProfileDetails): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return "Cliente Supabase indisponível.";
  const { error } = await client.from("profiles").upsert(
    {
      id: userId,
      ...profileDetailsPayload(profile),
    },
    { onConflict: "id" }
  );
  return error?.message ?? null;
}

function profileFromName(name?: string): ProfileDetails {
  return { name: name?.trim() || "Aluno Longyu", onboardingCompleted: true };
}

function isUnconfirmedEmailError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("email not confirmed") || lower.includes("email_not_confirmed");
}

export async function createAccount(
  email: string,
  password: string,
  profile?: ProfileDetails
): Promise<AuthServiceResult<FutureAuthUser>> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const details = profile ?? profileFromName();
  const cleanEmail = email.trim().toLowerCase();

  // Edge Function com Admin API (email_confirm=false) — o signUp público
  // auto-confirma quando mailer_autoconfirm ainda está true no projeto.
  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    code?: string;
    userId?: string;
    email?: string;
    pendingConfirmation?: boolean;
    emailed?: boolean;
    emailError?: string | null;
    error?: string;
  }>("create-account", {
    body: {
      email: cleanEmail,
      password,
      displayName: details.name,
      emailRedirectTo: emailConfirmationRedirectUrl(),
    },
  });

  if (error && !data) {
    return { status: "error", message: error.message || "Falha ao criar conta." };
  }

  if (data?.code === "already_exists" || (data?.error && /already|registered|exists/i.test(data.error))) {
    return login(cleanEmail, password, details);
  }

  if (data?.error || data?.ok === false) {
    return { status: "error", message: data.error || "Falha ao criar conta." };
  }

  if (data?.ok && data.pendingConfirmation) {
    return {
      status: "pending_confirmation",
      message: data.emailed === false
        ? "Conta criada, mas o email de confirmação não foi enviado. Use Reenviar na próxima tela."
        : "Enviamos um link de confirmação para o seu email. Abra o link para ativar a conta.",
      data: {
        id: data.userId ?? "",
        email: data.email ?? cleanEmail,
        name: details.name,
      },
    };
  }

  // Fallback raro: se a function retornar sem pending, tente login.
  return login(cleanEmail, password, details);
}

export async function login(
  email: string,
  password: string,
  profile?: ProfileDetails
): Promise<AuthServiceResult<FutureAuthUser>> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const cleanEmail = email.trim();
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) {
    if (isUnconfirmedEmailError(error.message)) {
      return {
        status: "pending_confirmation",
        message: "Confirme seu email antes de entrar. Reenvie o link se precisar.",
        data: { id: "", email: cleanEmail, name: profile?.name },
      };
    }
    return { status: "error", message: error.message };
  }

  const user = data.user;
  if (!user) return { status: "error", message: "Sessão não iniciada." };

  const fallbackName = (user.user_metadata?.name as string | undefined) ?? profile?.name;
  const profileError = await ensureProfile(user.id, profile ?? profileFromName(fallbackName));
  if (profileError) return { status: "error", message: profileError };

  return {
    status: "ok",
    message: "Login realizado com sucesso.",
    data: {
      id: user.id,
      email: user.email ?? cleanEmail,
      name: fallbackName ?? profile?.name,
    },
  };
}

export async function resendConfirmationEmail(email: string): Promise<AuthServiceResult> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const cleanEmail = email.trim();
  if (!cleanEmail.includes("@")) {
    return { status: "error", message: "Informe um email válido para reenviar a confirmação." };
  }

  const { error } = await client.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: { emailRedirectTo: emailConfirmationRedirectUrl() },
  });
  if (error) return { status: "error", message: error.message };

  return {
    status: "ok",
    message: "Se este email estiver pendente, enviamos um novo link de confirmação.",
  };
}

export async function requestPasswordReset(email: string): Promise<AuthServiceResult> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const cleanEmail = email.trim();
  const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: passwordRecoveryRedirectUrl(),
  });
  if (error) return { status: "error", message: error.message };

  return {
    status: "ok",
    message: "Se este email estiver cadastrado, você receberá um link para redefinir a senha em instantes.",
  };
}

export async function updatePasswordAfterRecovery(password: string): Promise<AuthServiceResult> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  if (password.length < 6) {
    return { status: "error", message: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) {
    return {
      status: "error",
      message: "Link inválido ou expirado. Solicite um novo email em Esqueci minha senha.",
    };
  }

  const { error } = await client.auth.updateUser({ password });
  if (error) return { status: "error", message: error.message };

  return { status: "ok", message: "Senha atualizada com sucesso. Você já pode entrar com a nova senha." };
}

export async function logout(): Promise<AuthServiceResult> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();
  const { error } = await client.auth.signOut();
  if (error) return { status: "error", message: error.message };
  return { status: "ok", message: "Sessão encerrada." };
}

export async function getCurrentUser(): Promise<AuthServiceResult<FutureAuthUser | null>> {
  if (!isSupabaseBackendEnabled()) return { ...notImplemented(), data: null };
  const client = getSupabaseClient();
  if (!client) return { ...notImplemented(), data: null };

  const { data, error } = await client.auth.getUser();
  if (error) return { status: "error", message: error.message, data: null };
  const user = data.user;
  if (!user) return { status: "ok", message: "Sem sessão ativa.", data: null };

  return {
    status: "ok",
    message: "Sessão ativa.",
    data: {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name as string | undefined,
    },
  };
}

export async function deleteAccount(): Promise<AuthServiceResult> {
  if (!isSupabaseBackendEnabled()) return notImplemented();

  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const { error } = await client.functions.invoke("delete-account", { body: { confirm: true } });
  if (error) return { status: "error", message: error.message };

  await client.auth.signOut();
  return { status: "ok", message: "Conta excluída na nuvem. Os dados locais deste dispositivo permanecem até você apagá-los." };
}
