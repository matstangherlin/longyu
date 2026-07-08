import type { LocalProgressSnapshot } from "../lib/progressSnapshot";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { fetchRemoteEntitlements, type SyncServiceResult } from "./syncService";

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

export async function requestAccountDeletion(): Promise<{ ok: boolean; message: string }> {
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

  const { error } = await client.functions.invoke("delete-account", { body: { confirm: true } });
  if (error) {
    return { ok: false, message: error.message };
  }

  await client.auth.signOut();
  return {
    ok: true,
    message: "Conta excluída na nuvem. Sua sessão foi encerrada neste dispositivo.",
  };
}
