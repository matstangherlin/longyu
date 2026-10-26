import { useCallback } from "react";
import { canSignInWithIdentifier } from "../lib/authForm";
import { storePendingConfirmEmail } from "../lib/authRedirect";
import { AUTH_SIGN_IN_TIMEOUT_MS, isAuthTimeoutError } from "../lib/auth/loginSession";
import { withTimeout } from "../lib/async/withTimeout";
import { useStore } from "../lib/store";
import { claimOwnUsername, login as authLogin } from "../services/authService";
import { takePendingUsername } from "../lib/username";
import { syncAuthSessionProgress } from "../services/cloudSyncCoordinator";

export type CloudSignInResult = {
  ok: boolean;
  message: string;
  pendingConfirmation?: boolean;
  email?: string;
  timedOut?: boolean;
};

async function finishSignInInBackground(): Promise<void> {
  try {
    await syncAuthSessionProgress();
  } catch {
    /* sync failure never traps the sign-in button */
  }
  const state = useStore.getState();
  const pending = takePendingUsername();
  if (pending && !state.accounts[state.currentAccountId]?.username) {
    state.setAccountUsername(state.currentAccountId, pending, { pendingClaim: true });
  }
  const account = useStore.getState().accounts[useStore.getState().currentAccountId];
  if (account?.username && account.usernamePendingClaim) {
    const claim = await claimOwnUsername(account.username).catch(() => null);
    if (claim?.status === "ok" && claim.data) {
      state.setAccountUsername(account.id, claim.data.username, { pendingClaim: false });
    }
  }
}

export function useCloudSignIn() {
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);

  const signIn = useCallback(
    async (identifier: string, password: string): Promise<CloudSignInResult> => {
      // RC2.2.11 — um campo só: email OU nome de usuário.
      if (!canSignInWithIdentifier(identifier, password)) {
        return { ok: false, message: "Informe seu email ou nome de usuário e uma senha com pelo menos 6 caracteres." };
      }
      let authResult;
      try {
        authResult = await withTimeout(authLogin(identifier, password), AUTH_SIGN_IN_TIMEOUT_MS);
      } catch (error) {
        if (isAuthTimeoutError(error)) return { ok: false, timedOut: true, message: "timeout" };
        const message = error instanceof Error ? error.message : "";
        return { ok: false, message: message || "Não foi possível entrar agora. Tente de novo." };
      }
      if (authResult.status === "error") {
        return { ok: false, message: authResult.message };
      }
      if (authResult.status === "pending_confirmation") {
        const email = authResult.data?.email || undefined;
        if (email) storePendingConfirmEmail(email);
        return { ok: false, message: authResult.message, pendingConfirmation: true, email };
      }
      if (authResult.status === "ok") {
        setAccountSetupComplete(true);
        void finishSignInInBackground();
        return { ok: true, message: authResult.message };
      }
      setAccountSetupComplete(true);
      return { ok: true, message: authResult.message };
    },
    [setAccountSetupComplete]
  );

  return { signIn };
}
