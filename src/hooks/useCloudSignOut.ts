import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { withTimeout } from "../lib/async/withTimeout";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { allowSeededLocalSession } from "../lib/auth/localAuthPolicy";
import { SIGN_OUT_AUTH_TIMEOUT_MS, SIGN_OUT_PUSH_TIMEOUT_MS } from "../lib/auth/loginSession";
import { forgetCloudReady } from "../lib/auth/sessionAudience";
import { useStore } from "../lib/store";
import { clearLocalAuthSession, logout as authLogout } from "../services/authService";
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
      // LGY-007 — a nuvem lenta ou fora do ar não pode prender o primeiro "Sair".
      // Destino continua `/`: a landing é a casa de quem saiu, e o gate de
      // logout exige as duas navegações para essa rota.
      try {
        await withTimeout(pushProgressToCloud(), SIGN_OUT_PUSH_TIMEOUT_MS);
      } catch {
        /* progresso fica no aparelho; o modal já avisou se estava pendente */
      }
      cancelScheduledCloudPush();
      try {
        await withTimeout(authLogout(), SIGN_OUT_AUTH_TIMEOUT_MS);
      } catch {
        await clearLocalAuthSession();
      }
      forgetCloudReady();
      endCloudSession();
      navigate("/", { replace: true });
      return "Sessão encerrada neste aparelho.";
    }
    logoutLocal();
    navigate("/", { replace: true });
    return null;
  }, [cloudSession, endCloudSession, logoutLocal, navigate]);

  return { signOut, canSignOut };
}
