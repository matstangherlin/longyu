import { Navigate, useSearchParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { AccountPage } from "../account/AccountPage";
import { ContaPage } from "./ContaPage";

// /conta: página de conta para sessão autenticada.
// Onboarding anônimo vive em /comecar. ?relevel=1 reabre o nivelamento para
// quem já tem conta.
export function ContaRoute() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const [searchParams] = useSearchParams();
  const relevelRequested = searchParams.get("relevel") === "1";
  if (!accountSetupComplete) {
    return <Navigate to="/comecar" replace />;
  }
  return relevelRequested ? <AccountPage /> : <ContaPage />;
}
