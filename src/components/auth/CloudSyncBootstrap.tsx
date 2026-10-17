import { useEffect } from "react";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { isQaTestStateActive } from "../../lib/qaFastPathAccess";
import { subscribeAppLifecycle } from "../../lib/platform/appLifecycle";
import { readOnline, subscribeNetworkStatus } from "../../lib/platform/networkStatus";
import { useStore } from "../../lib/store";
import { flushCloudProgressPush, scheduleCloudProgressPush } from "../../services/cloudSyncCoordinator";

const AUTO_SYNC_INTERVAL_MS = 30_000;

/** Envia progresso para a nuvem automaticamente (debounce, intervalo e ao sair da aba). */
export function CloudSyncBootstrap() {
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const accountId = useStore((s) => s.currentAccountId);

  useEffect(() => {
    if (isQaTestStateActive()) return;
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

    // Aba escondida (web) ou app em background (Android): empurra antes de
    // o sistema poder encerrar o processo. Nada é resetado aqui.
    const unsubLifecycle = subscribeAppLifecycle((state) => {
      if (state === "background") void flushCloudProgressPush();
    });
    // RC2.3.13R.3.2.5 — offline the interval only spun; coming back online
    // pushes at once instead of waiting for the next tick (or the next mount).
    const interval = window.setInterval(() => {
      if (readOnline()) void flushCloudProgressPush();
    }, AUTO_SYNC_INTERVAL_MS);
    let wasOnline = readOnline();
    const unsubNetwork = subscribeNetworkStatus((online) => {
      if (online && !wasOnline) void flushCloudProgressPush();
      wasOnline = online;
    });
    void flushCloudProgressPush();

    return () => {
      unsub();
      unsubLifecycle();
      unsubNetwork();
      window.clearInterval(interval);
    };
  }, [authMode, accountId]);

  return null;
}
