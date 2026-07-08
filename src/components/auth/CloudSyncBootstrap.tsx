import { useEffect } from "react";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { flushCloudProgressPush, scheduleCloudProgressPush } from "../../services/cloudSyncCoordinator";

const AUTO_SYNC_INTERVAL_MS = 30_000;

/** Envia progresso para a nuvem automaticamente (debounce, intervalo e ao sair da aba). */
export function CloudSyncBootstrap() {
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const accountId = useStore((s) => s.currentAccountId);

  useEffect(() => {
    if (!isSupabaseBackendEnabled() || authMode !== "cloud") return;

    let lastUpdated = useStore.getState().accounts[accountId]?.updatedAt ?? 0;

    const unsub = useStore.subscribe((state) => {
      const account = state.accounts[state.currentAccountId];
      if (account?.authMode !== "cloud") return;
      if (account.updatedAt !== lastUpdated) {
        lastUpdated = account.updatedAt;
        scheduleCloudProgressPush(1200);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushCloudProgressPush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => void flushCloudProgressPush(), AUTO_SYNC_INTERVAL_MS);
    void flushCloudProgressPush();

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [authMode, accountId]);

  return null;
}
