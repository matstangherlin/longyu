import type { LocalProgressSnapshot } from "../lib/progressSnapshot";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { edgeOpsInit, noteOps } from "../lib/opsCorrelation";
import { fetchRemoteEntitlements, type SyncServiceResult } from "./syncService";
import {
  accountDeletionRequestBody,
  ACCOUNT_DELETION_CONFIRMATION_TEXT,
} from "../../supabase/functions/_shared/accountDeletion";

export interface PrivacyExportBundle {
  exportedAt: string;
  schemaVersion: number;
  progress: LocalProgressSnapshot;
  entitlements: SyncServiceResult<{ isPro: boolean; source: "local_preview" | "server" }>;
}

export async function buildPrivacyExportBundle(): Promise<PrivacyExportBundle> {
  const progress = activeLearningRepository().exportSnapshot();
  const entitlements = await fetchRemoteEntitlements();
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: progress.schemaVersion,
    progress,
    entitlements,
  };
}

interface AccountDeletionResponse {
  ok?: boolean;
  error?: string;
}

async function accountDeletionErrorMessage(error: unknown): Promise<string> {
  try {
    const context = (error as { context?: Response })?.context;
    if (context && typeof context.json === "function") {
      const body = (await context.json()) as AccountDeletionResponse;
      if (body?.error) return body.error;
    }
  } catch {
    // O corpo pode já ter sido consumido; nesse caso usamos a mensagem genérica.
  }

  return (error as { message?: string })?.message || "Não foi possível excluir a conta.";
}

export async function requestAccountDeletion(
  confirmationText: string
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseBackendEnabled()) {
    return {
      ok: false,
      message: "Exclusão de conta na nuvem ainda não está ativa. Você pode apagar os dados locais neste dispositivo.",
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Cliente Supabase indisponível." };
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { ok: false, message: "Faça login para solicitar exclusão da conta na nuvem." };
  }

  const body = accountDeletionRequestBody(confirmationText);
  if (!body) {
    return {
      ok: false,
      message: `Confirmação inválida. Digite exatamente ${ACCOUNT_DELETION_CONFIRMATION_TEXT}.`,
    };
  }

  const ops = edgeOpsInit("delete_account");
  const { data, error } = await client.functions.invoke<AccountDeletionResponse>("delete-account", {
    headers: ops.headers,
    body,
  });
  if (error) {
    noteOps("delete_account", ops.correlationId, "error", { code: "invoke_error" });
    return { ok: false, message: await accountDeletionErrorMessage(error) };
  }
  if (!data?.ok) {
    noteOps("delete_account", ops.correlationId, "error", { code: "not_confirmed" });
    return { ok: false, message: data?.error || "O servidor não confirmou a exclusão da conta." };
  }

  noteOps("delete_account", ops.correlationId, "ok");

  await client.auth.signOut();
  return {
    ok: true,
    message: "Conta excluída na nuvem. Sua sessão foi encerrada neste dispositivo.",
  };
}
