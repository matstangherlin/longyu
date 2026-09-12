/**
 * After a Netlify deploy, an old service worker can keep an index.html that
 * points at hashed chunks that no longer exist. React.lazy then throws and the
 * page ErrorBoundary shows "Algo saiu do prumo" even though the shell loaded.
 *
 * Reload once. A second failure is a real render error and must stay visible.
 */

export const STALE_BUNDLE_RELOAD_KEY = "longyu:stale-bundle-reload";

export function isStaleBundleError(error: unknown): boolean {
  const name =
    error instanceof Error
      ? error.name
      : error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name ?? "")
        : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    `${name} ${message}`
  );
}

function sessionStore(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function clearStaleBundleReloadFlag(): void {
  sessionStore()?.removeItem(STALE_BUNDLE_RELOAD_KEY);
}

/** @returns true when a reload was scheduled. */
export function reloadOnceForStaleBundle(): boolean {
  if (typeof window === "undefined") return false;
  const storage = sessionStore();
  if (!storage) return false;
  if (storage.getItem(STALE_BUNDLE_RELOAD_KEY) === "1") return false;
  storage.setItem(STALE_BUNDLE_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

export async function importWithStaleBundleRetry<T>(importer: () => Promise<T>): Promise<T> {
  try {
    const loaded = await importer();
    clearStaleBundleReloadFlag();
    return loaded;
  } catch (error) {
    if (isStaleBundleError(error) && reloadOnceForStaleBundle()) {
      return new Promise<T>(() => undefined);
    }
    throw error;
  }
}
