import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { allowSeededLocalSession } from "../lib/auth/localAuthPolicy";
import { useStore } from "../lib/store";
import { logout as authLogout } from "../services/authService";
import { cancelScheduledCloudPush, pushProgressToCloud } from "../services/cloudSyncCoordinator";

export function useCloudSignOut() {
  const navigate = useNavigate();
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const endCloudSession = useStore((s) => s.endCloudSession);
  const logoutLocal = useStore((s) => s.logout);
  const cloudSession = authMode === "cloud" && isSupabaseBackendEnabled();
  const canSignOut = cloudSession || allowSeededLocalSession();

  const signOut = useCallback(async (): Promise<string | null> => {
    if (cloudSession) {
      await pushProgressToCloud();
      cancelScheduledCloudPush();
      const result = await authLogout();
      endCloudSession();
      navigate("/", { replace: true });
      return result.status === "ok" ? "Sessão encerrada. Seu progresso permanece salvo na nuvem." : result.message;
    }
    logoutLocal();
    navigate("/", { replace: true });
    return null;
  }, [cloudSession, endCloudSession, logoutLocal, navigate]);

  return { signOut, canSignOut };
}
