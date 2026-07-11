type RefreshHandler = () => void;

let pendingRefresh: RefreshHandler | null = null;
let updateAvailable = false;

export function markPwaUpdateAvailable(refresh: RefreshHandler): void {
  pendingRefresh = refresh;
  updateAvailable = true;
}

export function clearPwaUpdateAvailable(): void {
  pendingRefresh = null;
  updateAvailable = false;
}

export function isPwaUpdateAvailable(): boolean {
  return updateAvailable;
}

export async function applyPwaUpdateNow(): Promise<boolean> {
  if (!pendingRefresh) return false;
  const refresh = pendingRefresh;
  pendingRefresh = null;
  updateAvailable = false;
  refresh();
  return true;
}
