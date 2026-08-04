import { useSearchParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { isSubscribeIntent } from "../../lib/subscribeAuthRedirect";
import { AccountPage } from "../account/AccountPage";
import { ContaPage } from "./ContaPage";

// /conta: durante o onboarding (sem conta configurada) mantém o fluxo completo
// da AccountPage; depois que a conta existe, mostra a página de conta enxuta
// (login, email, sessão) — sem progresso, dados locais ou Pro.
// `?relevel=1` reabre a AccountPage para o re-nivelamento leve de quem já tem conta.
// `?intent=subscribe` (sem sessão cloud) abre a AccountPage para criar/entrar
// antes do checkout Stripe.
export function ContaRoute() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const [searchParams] = useSearchParams();
  const relevelRequested = searchParams.get("relevel") === "1";
  const needsAccountForSubscribe = isSubscribeIntent(searchParams) && authMode !== "cloud";
  return !accountSetupComplete || relevelRequested || needsAccountForSubscribe ? (
    <AccountPage />
  ) : (
    <ContaPage />
  );
}
