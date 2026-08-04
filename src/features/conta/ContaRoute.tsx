import { useSearchParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { AccountPage } from "../account/AccountPage";
import { ContaPage } from "./ContaPage";

// /conta: durante o onboarding (sem conta configurada) mantém o fluxo completo
// da AccountPage; depois que a conta existe, mostra a página de conta enxuta
// (login, email, sessão) — sem progresso, dados locais ou Pro.
// `?relevel=1` reabre a AccountPage para o re-nivelamento leve de quem já tem conta.
export function ContaRoute() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const [searchParams] = useSearchParams();
  const relevelRequested = searchParams.get("relevel") === "1";
  return !accountSetupComplete || relevelRequested ? <AccountPage /> : <ContaPage />;
}
