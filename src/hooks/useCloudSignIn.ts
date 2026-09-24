import { useCallback } from "react";
import { canSignInWithIdentifier } from "../lib/authForm";
import { storePendingConfirmEmail } from "../lib/authRedirect";
import { useStore } from "../lib/store";
import { claimOwnUsername, login as authLogin } from "../services/authService";
import { takePendingUsername } from "../lib/username";
import { syncAuthSessionProgress } from "../services/cloudSyncCoordinator";

export function useCloudSignIn() {
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);

  const signIn = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ ok: boolean; message: string; pendingConfirmation?: boolean; email?: string }> => {
      // RC2.2.11 — um campo só: email OU nome de usuário.
      if (!canSignInWithIdentifier(identifier, password)) {
        return { ok: false, message: "Informe seu email ou nome de usuário e uma senha com pelo menos 6 caracteres." };
      }
      const authResult = await authLogin(identifier, password);
      if (authResult.status === "error") {
        return { ok: false, message: authResult.message };
      }
      if (authResult.status === "pending_confirmation") {
        // Só guardamos o email quando o próprio aluno o digitou; o login por
        // nome de usuário nunca recebe o email do servidor.
        const email = authResult.data?.email || undefined;
        if (email) storePendingConfirmEmail(email);
        return { ok: false, message: authResult.message, pendingConfirmation: true, email };
      }
      if (authResult.status === "ok") {
        setAccountSetupComplete(true);
        const syncResult = await syncAuthSessionProgress();
        // RC2.2.11 — nome escolhido no cadastro: confirma no servidor quando o
        // backend estiver aplicado. Falha aqui nunca bloqueia o login.
        const state = useStore.getState();
        const pending = takePendingUsername();
        if (pending && !state.accounts[state.currentAccountId]?.username) {
          state.setAccountUsername(state.currentAccountId, pending, { pendingClaim: true });
        }
        const account = useStore.getState().accounts[state.currentAccountId];
        if (account?.username && account.usernamePendingClaim) {
          const claim = await claimOwnUsername(account.username).catch(() => null);
          if (claim?.status === "ok" && claim.data) {
            state.setAccountUsername(account.id, claim.data.username, { pendingClaim: false });
          }
        }
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
    [setAccountSetupComplete]
  );

  return { signIn };
}
