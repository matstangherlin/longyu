const LAST_SEEN_KEY = "longyu:lastSeenReleaseVersion";

export function getLastSeenReleaseVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function setLastSeenReleaseVersion(version: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, version);
}

export function shouldShowReleaseNotes(currentVersion: string): boolean {
  const lastSeen = getLastSeenReleaseVersion();
  if (!lastSeen) return true;
  return lastSeen !== currentVersion;
}
