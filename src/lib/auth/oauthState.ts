/**
 * RC2.3.8 — OAuth flow memory (device-local, no secrets).
 * Pending: which provider/intent/return route the learner started.
 * Processed: short hashes of authorization codes already handled, so a
 * duplicate callback (Android lifecycle, refresh, double tap) is ignored.
 */
import type { SocialProviderId } from "./providers";

export const OAUTH_PENDING_KEY = "longyu:oauth-pending:v1";
export const OAUTH_PROCESSED_KEY = "longyu:oauth-processed:v1";
/** A started flow older than this is abandoned (the screen never stays stuck). */
export const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingOAuth {
  provider: SocialProviderId;
  intent: "signin" | "link";
  returnTo: string;
  startedAt: number;
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Store only a hash of the code — the code itself is never persisted or logged. */
export function codeFingerprint(code: string): string {
  return `c_${fnv(code)}${fnv(code.split("").reverse().join(""))}`;
}

export function savePending(p: PendingOAuth): void {
  try {
    localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: callback falls back to defaults */
  }
}

export function readPending(now = Date.now()): PendingOAuth | null {
  try {
    const p = JSON.parse(localStorage.getItem(OAUTH_PENDING_KEY) ?? "null") as PendingOAuth | null;
    if (!p || now - p.startedAt > OAUTH_PENDING_TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    localStorage.removeItem(OAUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function processedCodes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(OAUTH_PROCESSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Returns false when the code was already handled (duplicate callback). */
export function markCodeProcessed(code: string): boolean {
  const fp = codeFingerprint(code);
  const list = processedCodes();
  if (list.includes(fp)) return false;
  try {
    localStorage.setItem(OAUTH_PROCESSED_KEY, JSON.stringify([...list, fp].slice(-50)));
  } catch {
    /* ignore */
  }
  return true;
}
