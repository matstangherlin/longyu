import { useCallback } from "react";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { useStore } from "../lib/store";
import { logout as authLogout } from "../services/authService";
import { cancelScheduledCloudPush, pushProgressToCloud } from "../services/cloudSyncCoordinator";

export function useCloudSignOut() {
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const endCloudSession = useStore((s) => s.endCloudSession);
  const logoutLocal = useStore((s) => s.logout);
  const canSignOut = authMode === "cloud" && isSupabaseBackendEnabled();

  const signOut = useCallback(async (): Promise<string | null> => {
    if (canSignOut) {
      await pushProgressToCloud();
      cancelScheduledCloudPush();
      const result = await authLogout();
      endCloudSession();
      return result.status === "ok" ? "Sessão encerrada. Seu progresso permanece salvo na nuvem." : result.message;
    }
    logoutLocal();
    return null;
  }, [canSignOut, endCloudSession, logoutLocal]);

  return { signOut, canSignOut };
}
