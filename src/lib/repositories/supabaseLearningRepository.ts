import { getSupabaseClient } from "../supabaseClient";
import {
  buildProgressSnapshot,
  getProgressScore,
  isMeaningfulProgress,
  validateProgressSnapshot,
  type LocalProgressSnapshot,
} from "../progressSnapshot";
import { useStore } from "../store";
import type { LearningRepository } from "./learningRepository";
import { localLearningRepository } from "./learningRepository";

const SYNC_LOGIN_REQUIRED = "Faça login na sua conta para sincronizar o progresso.";
const SYNC_SUCCESS = "Progresso enviado para sua conta na nuvem.";

async function fetchRemoteSnapshotForUser(userId: string): Promise<{
  ok: boolean;
  message: string;
  snapshot?: LocalProgressSnapshot;
}> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

  const { data, error } = await client
    .from("user_progress")
    .select("client_snapshot, client_snapshot_version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data?.client_snapshot) {
    return { ok: true, message: "Nenhum progresso encontrado na nuvem para esta conta." };
  }

  const snapshot: LocalProgressSnapshot = {
    schemaVersion: data.client_snapshot_version ?? 1,
    exportedAt: data.updated_at ? Date.parse(data.updated_at) : Date.now(),
    snapshot: data.client_snapshot as LocalProgressSnapshot["snapshot"],
  };

  const validation = validateProgressSnapshot(snapshot);
  if (!validation.ok) {
    return { ok: false, message: `Snapshot na nuvem inválido: ${validation.errors.join("; ")}` };
  }

  return { ok: true, message: "Progresso carregado da nuvem.", snapshot };
}

export const supabaseLearningRepository: LearningRepository = {
  mode: "supabase",
  exportSnapshot() {
    return localLearningRepository.exportSnapshot();
  },
  async importSnapshot(snapshot: LocalProgressSnapshot) {
    const validation = validateProgressSnapshot(snapshot);
    if (!validation.ok) {
      return { ok: false, message: `Snapshot inválido: ${validation.errors.join("; ")}` };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, message: "Cliente Supabase indisponível." };
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError) return { ok: false, message: userError.message };
    if (!user) return { ok: false, message: SYNC_LOGIN_REQUIRED };

    const remote = await fetchRemoteSnapshotForUser(user.id);
    if (!remote.ok) return { ok: false, message: remote.message };

    const nextScore = getProgressScore(snapshot);
    const remoteScore = getProgressScore(remote.snapshot);
    if (remote.snapshot && isMeaningfulProgress(remote.snapshot) && nextScore < remoteScore) {
      return {
        ok: false,
        message: "Sincronização bloqueada para evitar regressão: a nuvem tem progresso mais avançado.",
      };
    }

    const { error } = await client.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: {
          ...snapshot.snapshot,
          account: {
            ...snapshot.snapshot.account,
            id: `cloud:${user.id}`,
            email: user.email ?? snapshot.snapshot.account.email,
            authMode: "cloud",
          },
        },
        client_snapshot_version: snapshot.schemaVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: SYNC_SUCCESS };
  },
  async fetchSnapshot() {
    const client = getSupabaseClient();
    if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError) return { ok: false, message: userError.message };
    if (!user) return { ok: false, message: SYNC_LOGIN_REQUIRED };
    return fetchRemoteSnapshotForUser(user.id);
  },
};

export function exportActiveAccountSnapshot(): LocalProgressSnapshot {
  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId];
  if (!account) return localLearningRepository.exportSnapshot();
  return buildProgressSnapshot(account);
}
