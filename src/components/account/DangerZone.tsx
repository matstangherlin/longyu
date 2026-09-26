import { useState } from "react";
import { Button, Card } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";
import { requestAccountDeletion } from "../../services/privacyService";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../../../supabase/functions/_shared/accountDeletion";

/**
 * RC2.2.17 · CR–CT — "Zona de perigo" no FIM de Configurações › Conta.
 *
 * Mais visível ≠ mais fácil de apagar por acidente: o botão abre uma tela de
 * confirmação que explica o que se perde (progresso, conta, dados) e exige a
 * frase exata antes do botão final. O backend é o de sempre
 * (`requestAccountDeletion`); nada novo do lado do servidor.
 */
export function DangerZone() {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ready = phrase.trim() === ACCOUNT_DELETION_CONFIRMATION_TEXT;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    const result = await requestAccountDeletion(phrase.trim());
    setBusy(false);
    setNotice(localizeUserMessage(result.message));
  }

  return (
    <section id="zona-de-perigo" className="scroll-mt-6" data-testid="settings-danger-zone" aria-labelledby="danger-zone-title">
      <h2 id="danger-zone-title" className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-wrong">
        {t("settings.dangerZone")}
      </h2>
      <Card className="mt-2 rounded-xl border-wrong/30 p-3.5 shadow-none">
        {!confirming ? (
          <>
            <p className="text-sm text-ink-soft">{t("settings.dangerZoneLead")}</p>
            <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirming(true)} data-testid="settings-delete-account">
              {t("settings.deleteMyAccount")}
            </Button>
          </>
        ) : (
          <div role="dialog" aria-modal="false" aria-labelledby="delete-confirm-title" data-testid="settings-delete-confirm">
            <h3 id="delete-confirm-title" className="font-semibold text-ink">{t("settings.deleteConfirmTitle")}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              <li>{t("settings.deleteConfirmProgress")}</li>
              <li>{t("settings.deleteConfirmAccount")}</li>
              <li>{t("settings.deleteConfirmData")}</li>
            </ul>
            <label className="mt-3 block text-sm font-medium text-ink">
              {t("settings.deleteConfirmType", { phrase: ACCOUNT_DELETION_CONFIRMATION_TEXT })}
              <input
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                data-testid="settings-delete-phrase"
                className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-wrong/30"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setConfirming(false); setPhrase(""); }}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" disabled={!ready || busy} onClick={() => void submit()} data-testid="settings-delete-final">
                {t("settings.deleteFinal")}
              </Button>
            </div>
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-ink-soft" role="status">{notice}</p>}
      </Card>
    </section>
  );
}
