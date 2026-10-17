import { useStore } from "../../lib/store";
import { DISCRETE_SYNC_GLYPH, discreteSyncState } from "../../lib/syncUx";
import { useTranslation } from "../../i18n/useTranslation";
import { useOnline } from "../../hooks/useOnline";

/**
 * RC2.2.8 · C4 — estado de sync discreto: ✓ Sincronizado · • Salvando… ·
 * ! Problema de sincronização. Um rótulo que troca de estado no lugar, nunca
 * um toast a cada ciclo. Só aparece para conta na nuvem.
 */
export function SyncStatusChip({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const status = useStore((s) => s.cloudSyncState.status);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode);
  const online = useOnline();
  if (authMode !== "cloud") return null;
  const state = discreteSyncState(status);
  if (state === "idle") return null;
  // RC2.3.13R.3.2.5 — offline, "Salvando…" claimed work that was not
  // happening (the push exits early). Say where the progress is instead.
  if (!online && state !== "synced") {
    return (
      <span
        data-testid="sync-status-chip"
        data-sync-state="offline"
        className={["inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft", className].join(" ")}
      >
        <span aria-hidden>•</span>
        {t("shell.syncStatusOffline")}
      </span>
    );
  }
  const label =
    state === "synced"
      ? t("shell.syncStatusSynced")
      : state === "saving"
        ? t("shell.syncStatusSaving")
        : t("shell.syncStatusProblem");
  return (
    <span
      data-testid="sync-status-chip"
      data-sync-state={state}
      title={state === "problem" ? t("shell.syncStatusLocalSafe") : undefined}
      className={[
        "inline-flex items-center gap-1 text-[11px] font-medium",
        // A retrying sync is not a failure of the learner's work: calm gold, not error red.
        state === "problem" ? "text-gold" : state === "saving" ? "text-ink-soft" : "text-good",
        className,
      ].join(" ")}
    >
      <span aria-hidden>{DISCRETE_SYNC_GLYPH[state]}</span>
      {label}
      {state === "problem" ? <span className="sr-only"> — {t("shell.syncStatusLocalSafe")}</span> : null}
    </span>
  );
}
