import { useCallback } from "react";
import { canSignInWithCredentials } from "../lib/authForm";
import { isInternalTestProEmail } from "../lib/entitlements";
import { useStore } from "../lib/store";
import { login as authLogin } from "../services/authService";
import { syncAuthSessionProgress } from "../services/cloudSyncCoordinator";

export function useCloudSignIn() {
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);
  const setServerEntitlement = useStore((s) => s.setServerEntitlement);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; message: string }> => {
      if (!canSignInWithCredentials(email, password)) {
        return { ok: false, message: "Informe um email válido e senha com pelo menos 6 caracteres." };
      }
      const authResult = await authLogin(email, password);
      if (authResult.status === "error") {
        return { ok: false, message: authResult.message };
      }
      if (isInternalTestProEmail(email)) {
        setServerEntitlement(true);
      }
      if (authResult.status === "ok") {
        setAccountSetupComplete(true);
        const syncResult = await syncAuthSessionProgress();
        return {
          ok: true,
          message: syncResult.ok
            ? "Conta ativa. Seu progresso sincroniza automaticamente na nuvem."
            : authResult.message,
        };
      }
      setAccountSetupComplete(true);
      return { ok: true, message: authResult.message };
    },
    [setAccountSetupComplete, setServerEntitlement]
  );

  return { signIn };
}
