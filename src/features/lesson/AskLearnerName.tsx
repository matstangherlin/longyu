import { useState, type FormEvent } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { updateDisplayName } from "../../services/authService";
import { Button } from "../../components/ui/primitives";

/** LGY-022 — antes da cena de apresentação, pede o nome. Lucas fica como saída. */
export function AskLearnerName({ onDefer }: { onDefer: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updateDisplayName(draft);
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.message);
      return;
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-3 space-y-3" data-testid="lesson-ask-name">
      <p className="font-serif text-xl font-semibold text-ink">{t("settings.askName")}</p>
      <p className="text-sm leading-6 text-ink-soft">{t("settings.askNameLead")}</p>
      <input
        data-testid="lesson-ask-name-input"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
      />
      <Button type="submit" loading={busy} disabled={busy || draft.trim().length < 2}>
        {t("common.save")}
      </Button>
      <button
        type="button"
        className="block min-h-11 text-sm font-semibold text-ink-soft underline"
        data-testid="lesson-ask-name-later"
        onClick={onDefer}
      >
        {t("settings.useModelName")}
      </button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-wrong">
          {error}
        </p>
      ) : null}
    </form>
  );
}
