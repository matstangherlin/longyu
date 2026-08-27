import { isQaFastPathAllowed } from "./appEnvironment";

export const QA_FAST_PATH_MARKER = "longyu:qa-fast-path";

export function isQaFastPathSessionMarked(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(QA_FAST_PATH_MARKER) === "1";
  } catch {
    return false;
  }
}

export function clearQaFastPathSession(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(QA_FAST_PATH_MARKER);
    localStorage.removeItem("longyu:e2e-session-audience");
    localStorage.removeItem("longyu:e2e-allow-local");
    localStorage.removeItem("longyu:e2e-finalize-code");
  } catch {
    /* ignore */
  }
}

export function canUseQaFastPathSession(): boolean {
  return isQaFastPathAllowed() && isQaFastPathSessionMarked();
}
