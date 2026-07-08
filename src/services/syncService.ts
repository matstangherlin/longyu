import { activeLearningRepository } from "../lib/repositories/learningRepository";
import type { LocalProgressSnapshot } from "../lib/progressSnapshot";
import { validateProgressSnapshot } from "../lib/progressSnapshot";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { fetchServerIsPro } from "./entitlementService";

export type SyncServiceStatus = "not_implemented" | "synced" | "pending" | "invalid";

export interface SyncServiceResult<T = undefined> {
  status: SyncServiceStatus;
  message: string;
  data?: T;
}

const SYNC_NOT_IMPLEMENTED_MESSAGE =
  "Sincronização em nuvem ainda não está ativa nesta versão beta. Seu progresso permanece neste dispositivo até você optar por migrar.";

export async function importLocalProgress(
  snapshot: LocalProgressSnapshot,
  _idempotencyKey: string
): Promise<SyncServiceResult<{ serverRevision?: number }>> {
  const validation = validateProgressSnapshot(snapshot);
  if (!validation.ok) {
    return {
      status: "invalid",
      message: `Snapshot inválido: ${validation.errors.join("; ")}`,
    };
  }
  if (!isSupabaseBackendEnabled()) {
    return {
      status: "not_implemented",
      message: SYNC_NOT_IMPLEMENTED_MESSAGE,
    };
  }

  const repo = activeLearningRepository();
  const result = await repo.importSnapshot(snapshot);
  if (result.ok) {
    return {
      status: "synced",
      message: result.message,
      data: { serverRevision: snapshot.schemaVersion },
    };
  }
  return {
    status: "invalid",
    message: result.message,
  };
}

export async function requestCloudMigration(
  snapshot?: LocalProgressSnapshot
): Promise<SyncServiceResult<{ serverRevision?: number }>> {
  const payload = snapshot ?? activeLearningRepository().exportSnapshot();
  const idempotencyKey = `migrate-${payload.exportedAt}`;
  return importLocalProgress(payload, idempotencyKey);
}

export async function restoreProgressFromCloud(): Promise<SyncServiceResult<{ snapshot: LocalProgressSnapshot }>> {
  if (!isSupabaseBackendEnabled()) {
    return { status: "not_implemented", message: SYNC_NOT_IMPLEMENTED_MESSAGE };
  }

  const remote = await activeLearningRepository().fetchSnapshot();
  if (!remote.ok || !remote.snapshot) {
    return { status: "invalid", message: remote.message };
  }

  return {
    status: "synced",
    message: remote.message,
    data: { snapshot: remote.snapshot },
  };
}

export async function fetchRemoteEntitlements(): Promise<
  SyncServiceResult<{ isPro: boolean; source: "local_preview" | "server" }>
> {
  if (!isSupabaseBackendEnabled()) {
    return {
      status: "not_implemented",
      message: SYNC_NOT_IMPLEMENTED_MESSAGE,
      data: { isPro: false, source: "local_preview" },
    };
  }

  const isPro = await fetchServerIsPro();
  return {
    status: "synced",
    message: isPro ? "Longyu Pro ativo no servidor." : "Sem assinatura Pro ativa no servidor.",
    data: { isPro, source: isPro ? "server" : "local_preview" },
  };
}
