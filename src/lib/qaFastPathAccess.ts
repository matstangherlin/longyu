import { isQaFastPathAllowed } from "./appEnvironment";

export const QA_FAST_PATH_MARKER = "longyu:qa-fast-path";
export const QA_STORE_KEY = "longyu-v1";
export const QA_REAL_STATE_BACKUP_KEY = "longyu:qa-real-state-backup";

const QA_OWNED_KEYS = [
  QA_FAST_PATH_MARKER,
  "longyu:e2e-session-audience",
  "longyu:e2e-allow-local",
  "longyu:e2e-finalize-code",
] as const;

export function isQaFastPathSessionMarked(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(QA_FAST_PATH_MARKER) === "1";
  } catch {
    return false;
  }
}

/** TEST STATE ativo: ambiente preview/dev **e** marker. Nunca em Production Beta. */
export function isQaTestStateActive(): boolean {
  return isQaFastPathAllowed() && isQaFastPathSessionMarked();
}

export function canUseQaFastPathSession(): boolean {
  return isQaTestStateActive();
}

export function snapshotRealStateForQa(): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (localStorage.getItem(QA_REAL_STATE_BACKUP_KEY) != null) return;
    localStorage.setItem(QA_REAL_STATE_BACKUP_KEY, localStorage.getItem(QA_STORE_KEY) ?? "");
  } catch {
    /* private mode */
  }
}

export function restoreRealStateFromQaBackup(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const backup = localStorage.getItem(QA_REAL_STATE_BACKUP_KEY);
    if (backup == null) {
      localStorage.removeItem(QA_STORE_KEY);
    } else if (backup === "") {
      localStorage.removeItem(QA_STORE_KEY);
    } else {
      localStorage.setItem(QA_STORE_KEY, backup);
    }
    localStorage.removeItem(QA_REAL_STATE_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

export function clearQaOwnedKeys(): void {
  if (typeof localStorage === "undefined") return;
  try {
    for (const key of QA_OWNED_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Sai do TEST STATE: restaura progresso real, limpa markers/overrides E2E. */
export function exitQaFastPathSession(): void {
  restoreRealStateFromQaBackup();
  clearQaOwnedKeys();
}

/** @deprecated use exitQaFastPathSession — mantido para o hub antigo. */
export function clearQaFastPathSession(): void {
  exitQaFastPathSession();
}
