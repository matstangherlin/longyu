import { useState, type FormEvent } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { displayNameForAccount, isPlaceholderDisplayName } from "../../lib/displayName";
import { useStore } from "../../lib/store";
import { updateDisplayName } from "../../services/authService";
import { Button } from "../../components/ui/primitives";

/** LGY-008 — one name field. The store changes only after the server accepts it. */
export function DisplayNameField() {
  const { t } = useTranslation();
  const account = useStore((s) => s.accounts[s.currentAccountId]);
  const shown = displayNameForAccount(account);
  const ask = isPlaceholderDisplayName(account?.name);
  const [draft, setDraft] = useState(ask ? "" : shown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    const result = await updateDisplayName(draft);
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.message);
      return;
    }
    setDraft(draft.trim());
    setSaved(result.message);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-3 space-y-2" data-testid="display-name-form">
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint" htmlFor="display-name">
        {ask ? t("settings.askName") : t("settings.displayName")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="display-name"
          data-testid="display-name-input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
            setSaved(null);
          }}
          className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
        />
        <Button type="submit" size="sm" loading={busy} disabled={busy || draft.trim().length < 2}>
          {t("common.save")}
        </Button>
      </div>
      {error ? (
        <p role="alert" data-testid="display-name-error" className="text-sm font-medium text-wrong">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" data-testid="display-name-saved" className="text-sm font-medium text-good">
          {saved}
        </p>
      ) : null}
    </form>
  );
}
