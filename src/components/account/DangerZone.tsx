import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";
import { useStore } from "../../lib/store";
import { forgetCloudReady } from "../../lib/auth/sessionAudience";
import { requestAccountDeletion } from "../../services/privacyService";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../../../supabase/functions/_shared/accountDeletion";

/**
 * RC2.3.13R.3.2.5 — the one delete-account confirmation (Ajustes › Conta and
 * /conta; /conta used a native window.prompt with PT-only copy). It explains
 * what is lost, asks for the exact phrase, shows the request in flight, gives
 * success and failure different tones, and on success ends the session.
 * Not a dialog: it is page content, so Android back is not swallowed by it;
 * Escape (keyboard) cancels. The backend call is unchanged.
 */
export function DeleteAccountConfirm({
  onCancel,
  testIdPrefix = "settings",
}: {
  onCancel: () => void;
  testIdPrefix?: "settings" | "conta";
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const endCloudSession = useStore((s) => s.endCloudSession);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = phrase.trim() === ACCOUNT_DELETION_CONFIRMATION_TEXT;
  const titleId = `${testIdPrefix}-delete-confirm-title`;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const result = await requestAccountDeletion(phrase.trim());
      setNotice({ ok: result.ok, text: localizeUserMessage(result.message) });
      if (result.ok) {
        forgetCloudReady();
        endCloudSession();
        navigate("/", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setPhrase("");
    setNotice(null);
    onCancel();
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid={`${testIdPrefix}-delete-confirm`}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || busy) return;
        event.stopPropagation();
        cancel();
      }}
    >
      <h3 id={titleId} className="font-semibold text-ink">{t("settings.deleteConfirmTitle")}</h3>
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
          enterKeyHint="done"
          data-testid={`${testIdPrefix}-delete-phrase`}
          className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:ring-2 focus:ring-wrong/30"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy} onClick={cancel}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="danger"
          disabled={!ready || busy}
          loading={busy}
          onClick={() => void submit()}
          data-testid={`${testIdPrefix}-delete-final`}
        >
          {t("settings.deleteFinal")}
        </Button>
      </div>
      {notice && (
        <p
          className={notice.ok ? "mt-3 text-sm font-medium text-good" : "mt-3 text-sm text-wrong"}
          role={notice.ok ? "status" : "alert"}
          data-testid={`${testIdPrefix}-delete-notice`}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}

/**
 * RC2.2.17 · CR–CT — "Zona de perigo" no FIM de Configurações › Conta.
 *
 * Mais visível ≠ mais fácil de apagar por acidente: o botão abre uma
 * confirmação que explica o que se perde (progresso, conta, dados) e exige a
 * frase exata antes do botão final. O backend é o de sempre
 * (`requestAccountDeletion`); nada novo do lado do servidor.
 */
export function DangerZone() {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  // RC2.3.13R.3.2.6 — deleting an account only applies to a cloud account. A
  // guest / device-only profile has no account to delete (the backend call
  // would fail), so the destructive cloud action is not offered at all;
  // erasing this device's data lives in Dados locais.
  const ownsCloudAccount = useStore((s) => s.accounts[s.currentAccountId]?.authMode === "cloud");
  if (!ownsCloudAccount) return null;

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
          <DeleteAccountConfirm onCancel={() => setConfirming(false)} />
        )}
      </Card>
    </section>
  );
}
