import { useStore } from "../../lib/store";
import { AccountPage } from "../account/AccountPage";
import { ContaPage } from "./ContaPage";

// /conta: durante o onboarding (sem conta configurada) mantém o fluxo completo
// da AccountPage; depois que a conta existe, mostra a página de conta enxuta
// (login, email, sessão) — sem progresso, dados locais ou Pro.
export function ContaRoute() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  return accountSetupComplete ? <ContaPage /> : <AccountPage />;
}
