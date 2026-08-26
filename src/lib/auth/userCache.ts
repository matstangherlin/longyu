import type { LocalProgressSnapshot } from "../progressSnapshot";
import { cloudCacheKey } from "./cloudSession";

export function writeUserCache(userId: string, snapshot: LocalProgressSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(cloudCacheKey(userId), JSON.stringify(snapshot));
  } catch {
    // quota / private mode
  }
}

export function readUserCache(userId: string): LocalProgressSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(cloudCacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalProgressSnapshot;
  } catch {
    return null;
  }
}
