import { useStore } from "../../lib/store";
import { DISCRETE_SYNC_GLYPH, discreteSyncState } from "../../lib/syncUx";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.8 · C4 — estado de sync discreto: ✓ Sincronizado · • Salvando… ·
 * ! Problema de sincronização. Um rótulo que troca de estado no lugar, nunca
 * um toast a cada ciclo. Só aparece para conta na nuvem.
 */
export function SyncStatusChip({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const status = useStore((s) => s.cloudSyncState.status);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode);
  if (authMode !== "cloud") return null;
  const state = discreteSyncState(status);
  if (state === "idle") return null;
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
        state === "problem" ? "text-wrong" : state === "saving" ? "text-ink-faint" : "text-good",
        className,
      ].join(" ")}
    >
      <span aria-hidden>{DISCRETE_SYNC_GLYPH[state]}</span>
      {label}
    </span>
  );
}
