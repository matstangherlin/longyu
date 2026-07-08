/**
 * Camada de repositório para migração local → backend (Fase C).
 * O MVP beta usa apenas `localLearningRepository`; Supabase entra depois.
 */

import { isSupabaseBackendEnabled } from "../backendConfig";
import { buildProgressSnapshot, type LocalProgressSnapshot } from "../progressSnapshot";
import { useStore } from "../store";
import { supabaseLearningRepository } from "./supabaseLearningRepository";

export type BackendMode = "local" | "supabase";

export interface LearningRepository {
  mode: BackendMode;
  exportSnapshot(): LocalProgressSnapshot;
  importSnapshot(snapshot: LocalProgressSnapshot): Promise<{ ok: boolean; message: string }>;
  fetchSnapshot(): Promise<{ ok: boolean; message: string; snapshot?: LocalProgressSnapshot }>;
}

const LOCAL_NOT_SYNCED_MESSAGE =
  "Sincronização em nuvem ainda não está ativa nesta versão beta. O progresso continua salvo neste dispositivo.";

export const localLearningRepository: LearningRepository = {
  mode: "local",
  exportSnapshot() {
    const state = useStore.getState();
    const account = state.accounts[state.currentAccountId];
    if (!account) {
      return {
        schemaVersion: 1,
        exportedAt: Date.now(),
        snapshot: {
          schemaVersion: 1,
          exportedAt: Date.now(),
          account: {
            id: state.currentAccountId,
            name: "Aluno Longyu",
            authMode: "local",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          progress: {} as ReturnType<typeof buildProgressSnapshot>["snapshot"]["progress"],
        },
      };
    }
    return buildProgressSnapshot(account);
  },
  async importSnapshot() {
    return { ok: false, message: LOCAL_NOT_SYNCED_MESSAGE };
  },
  async fetchSnapshot() {
    return { ok: false, message: LOCAL_NOT_SYNCED_MESSAGE };
  },
};

export function activeLearningRepository(): LearningRepository {
  if (isSupabaseBackendEnabled()) return supabaseLearningRepository;
  return localLearningRepository;
}
