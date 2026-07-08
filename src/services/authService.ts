import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";

export type AuthServiceStatus = "ok" | "error" | "not_implemented";

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

async function ensureProfile(userId: string, name?: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return "Cliente Supabase indisponível.";
  const { error } = await client.from("profiles").upsert(
    {
      id: userId,
      name: name?.trim() || "Aluno Longyu",
      native_language: "pt-BR",
      target_language: "zh-CN",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  return error?.message ?? null;
}

export async function createAccount(
  email: string,
  password: string,
  name?: string
): Promise<AuthServiceResult<FutureAuthUser>> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const cleanEmail = email.trim();
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { name: name?.trim() || "Aluno Longyu" } },
  });

  if (error) {
    const alreadyExists =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");
    if (alreadyExists) return login(cleanEmail, password);
    return { status: "error", message: error.message };
  }

  const user = data.user;
  if (!user) {
    if (data.session?.user) {
      const sessionUser = data.session.user;
      const profileError = await ensureProfile(sessionUser.id, name);
      if (profileError) return { status: "error", message: profileError };
      return {
        status: "ok",
        message: "Conta criada com sucesso.",
        data: {
          id: sessionUser.id,
          email: sessionUser.email ?? cleanEmail,
          name,
        },
      };
    }
    return {
      status: "ok",
      message: "Verifique seu email para confirmar a conta, se solicitado pelo provedor.",
    };
  }

  const profileError = await ensureProfile(user.id, name);
  if (profileError) return { status: "error", message: profileError };

  return {
    status: "ok",
    message: "Conta criada com sucesso.",
    data: { id: user.id, email: user.email ?? cleanEmail, name },
  };
}

export async function login(email: string, password: string): Promise<AuthServiceResult<FutureAuthUser>> {
  if (!isSupabaseBackendEnabled()) return notImplemented();
  const client = getSupabaseClient();
  if (!client) return notImplemented();

  const cleanEmail = email.trim();
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) return { status: "error", message: error.message };

  const user = data.user;
  if (!user) return { status: "error", message: "Sessão não iniciada." };

  const profileError = await ensureProfile(user.id, user.user_metadata?.name as string | undefined);
  if (profileError) return { status: "error", message: profileError };

  return {
    status: "ok",
    message: "Login realizado com sucesso.",
    data: { id: user.id, email: user.email ?? cleanEmail, name: user.user_metadata?.name as string | undefined },
  };
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
