import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../../lib/store";
import { hasTelemetryConsentChoice } from "../../services/telemetryConsent";
import { TelemetryConsentModal } from "./TelemetryConsentModal";

/**
 * Mostra o modal compacto após cadastro / primeiro acesso ao painel,
 * sem bloquear o uso do app (pode fechar com "Agora não").
 */
export function TelemetryConsentWatcher() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!accountSetupComplete) {
      setOpen(false);
      return;
    }
    // Evita o modal durante onboarding/auth e no player em foco.
    if (
      location.pathname === "/conta" ||
      location.pathname === "/login" ||
      location.pathname === "/esqueci-senha" ||
      location.pathname === "/redefinir-senha" ||
      /^\/licao\/[^/]+\/player$/.test(location.pathname) ||
      location.pathname.startsWith("/teste/")
    ) {
      return;
    }
    if (!hasTelemetryConsentChoice()) {
      setOpen(true);
    }
  }, [accountSetupComplete, location.pathname]);

  if (!open) return null;

  return (
    <TelemetryConsentModal
      onClose={() => {
        setOpen(false);
      }}
    />
  );
}
