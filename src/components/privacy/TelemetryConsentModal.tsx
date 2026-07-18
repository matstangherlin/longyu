import { useState } from "react";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import { TELEMETRY_CONSENT_BODY, TELEMETRY_CONSENT_TITLE } from "../../lib/privacyCopy";
import { setTelemetryConsent } from "../../services/telemetryConsent";
import { TelemetryDataDetails } from "./TelemetryDataDetails";

interface TelemetryConsentModalProps {
  onClose: () => void;
}

export function TelemetryConsentModal({ onClose }: TelemetryConsentModalProps) {
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);

  async function decide(allowed: boolean) {
    setBusy(true);
    await setTelemetryConsent(allowed);
    setBusy(false);
    onClose();
  }

  if (details) {
    return (
      <ModalOverlay label="Dados coletados" onBackdropClick={() => setDetails(false)}>
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <TelemetryDataDetails />
          <Button type="button" className="mt-5 w-full" variant="outline" onClick={() => setDetails(false)}>
            Voltar
          </Button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay label={TELEMETRY_CONSENT_TITLE}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="font-serif text-xl font-semibold text-ink">{TELEMETRY_CONSENT_TITLE}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{TELEMETRY_CONSENT_BODY}</p>

        <div className="mt-5 grid gap-2">
          <Button type="button" className="w-full" disabled={busy} onClick={() => void decide(true)}>
            Permitir dados de melhoria
          </Button>
          <Button type="button" className="w-full" variant="outline" disabled={busy} onClick={() => void decide(false)}>
            Agora não
          </Button>
          <Button type="button" className="w-full" variant="ghost" disabled={busy} onClick={() => setDetails(true)}>
            Ver detalhes
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-4 text-ink-faint">
          Você pode mudar isso a qualquer momento em Ajustes → Privacidade e dados. O app continua
          funcionando normalmente.
        </p>
      </div>
    </ModalOverlay>
  );
}
