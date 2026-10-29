import { useEffect } from "react";
import { useStore } from "../../lib/store";
import { SYNC_SAVING_LIMIT_MS } from "../../lib/displayName";
import { DISCRETE_SYNC_GLYPH, discreteSyncState } from "../../lib/syncUx";
import { useTranslation } from "../../i18n/useTranslation";
import { useOnline } from "../../hooks/useOnline";
import { flushCloudProgressPush } from "../../services/cloudSyncCoordinator";

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
  const state = discreteSyncState(status);
  useEffect(() => {
    if (authMode !== "cloud" || state !== "saving") return undefined;
    const timer = window.setTimeout(() => {
      const current = useStore.getState().cloudSyncState.status;
      if (current === "pending" || current === "loading") {
        useStore.getState().setCloudSyncState("error", "Não foi possível salvar — tente de novo.");
      }
    }, SYNC_SAVING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [authMode, state, status]);
  if (authMode !== "cloud") return null;
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
  const classNameForState = [
    "inline-flex items-center gap-1 text-[11px] font-medium",
    // A retrying sync is not a failure of the learner's work: calm gold, not error red.
    state === "problem" ? "text-gold" : state === "saving" ? "text-ink-soft" : "text-good",
    className,
  ].join(" ");
  if (state === "problem") {
    return (
      <button
        type="button"
        data-testid="sync-status-chip"
        data-sync-state={state}
        aria-live="polite"
        title={t("shell.syncStatusLocalSafe")}
        className={classNameForState}
        onClick={() => void flushCloudProgressPush()}
      >
        <span aria-hidden>{DISCRETE_SYNC_GLYPH[state]}</span>
        {label}
        <span className="underline">{t("shell.syncStatusRetry")}</span>
        {state === "problem" ? <span className="sr-only"> — {t("shell.syncStatusLocalSafe")}</span> : null}
      </button>
    );
  }
  return (
    <span
      data-testid="sync-status-chip"
      data-sync-state={state}
      aria-live="polite"
      className={classNameForState}
    >
      <span aria-hidden>{DISCRETE_SYNC_GLYPH[state]}</span>
      {label}
    </span>
  );
}
