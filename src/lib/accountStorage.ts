/**
 * RC2.3.8 — account-scoped local storage (no store import; safe for gates).
 *
 * Pedagogical evidence (Learner Evidence Record, speech, Hànzì form, mastery
 * moments) belongs to ONE account. Keys are suffixed with a namespace:
 *   local          → anonymous / device-only learner (LOCAL_ANONYMOUS)
 *   cloud:<uid>    → a signed-in account (Supabase user id — never e-mail)
 * Switching account switches namespace; A's evidence is never loaded for B.
 * Legacy unscoped keys belong to whoever was on this device first: they are
 * moved (not deleted) into the first namespace that reads them.
 */

export const ANONYMOUS_NAMESPACE = "local";

/** Keys that are per account (ACCOUNT_SCOPED or ANONYMOUS_PROGRESS). */
export const ACCOUNT_SCOPED_BASE_KEYS = [
  "longyu:learner-evidence-v1",
  "longyu:learner-evidence-legacy-v1",
  "longyu:mastery-celebrated-v1",
  "longyu:speech-evidence-v1",
  "longyu:hanzi-form-evidence-v1",
  "longyu:hanzi-writing-telemetry-v1",
] as const;

let namespace = ANONYMOUS_NAMESPACE;
const listeners = new Set<(ns: string) => void>();

export function namespaceForAccount(accountId: string | null | undefined): string {
  const id = String(accountId ?? "");
  if (id.startsWith("cloud:") && id.length > 6) return id;
  return ANONYMOUS_NAMESPACE;
}

export function currentStorageNamespace(): string {
  return namespace;
}

export function setStorageNamespace(next: string): void {
  if (next === namespace) return;
  namespace = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      /* listeners never break the switch */
    }
  }
}

export function onStorageNamespaceChange(fn: (ns: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function scopedKey(base: string, ns: string = namespace): string {
  return `${base}::${ns}`;
}

const LEGACY_DONE = "longyu:account-storage-legacy-moved-v1";

/**
 * Read a scoped key; on the very first read on this device, move the legacy
 * unscoped value into the current namespace (never deleted, never duplicated).
 */
export function readScoped(base: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const key = scopedKey(base);
    const value = localStorage.getItem(key);
    if (value !== null) return value;
    const legacy = localStorage.getItem(base);
    const moved = JSON.parse(localStorage.getItem(LEGACY_DONE) ?? "{}") as Record<string, string>;
    if (legacy !== null && !moved[base]) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(base);
      moved[base] = namespace;
      localStorage.setItem(LEGACY_DONE, JSON.stringify(moved));
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeScoped(base: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(scopedKey(base), value);
  } catch {
    /* quota — evidence is optional */
  }
}

/** Read another namespace explicitly (claim / QA). */
export function readNamespace(base: string, ns: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(scopedKey(base, ns));
  } catch {
    return null;
  }
}

export function removeNamespace(base: string, ns: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(scopedKey(base, ns));
  } catch {
    /* ignore */
  }
}

/**
 * Local storage inventory (RC2.3.8 audit): every key the app writes outside the
 * store, classified. ACCOUNT_SCOPED/ANONYMOUS_PROGRESS keys must be namespaced
 * or live inside the per-account store slots.
 */
export const LOCAL_STORAGE_INVENTORY: Record<string, "GLOBAL_DEVICE_PREFERENCE" | "ACCOUNT_SCOPED" | "ANONYMOUS_PROGRESS" | "SESSION_TRANSIENT" | "DEV_QA"> = {
  "longyu-v1": "ACCOUNT_SCOPED", // zustand store: accounts[] keyed by local / cloud:<uid>
  "longyu:learner-evidence-v1": "ACCOUNT_SCOPED",
  "longyu:learner-evidence-legacy-v1": "ACCOUNT_SCOPED",
  "longyu:mastery-celebrated-v1": "ACCOUNT_SCOPED",
  "longyu:speech-evidence-v1": "ACCOUNT_SCOPED",
  "longyu:hanzi-form-evidence-v1": "ACCOUNT_SCOPED",
  "longyu:hanzi-writing-telemetry-v1": "ACCOUNT_SCOPED",
  "longyu:user-cache:<uid>": "ACCOUNT_SCOPED",
  "longyu:league-xp-pending:<accountId>": "ACCOUNT_SCOPED",
  "longyu:culture-guide-seen:<accountId>": "ACCOUNT_SCOPED",
  "longyu:economy-intents": "ACCOUNT_SCOPED",
  "longyu:progress-claims:v1": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:parked-local-progress:v1": "ANONYMOUS_PROGRESS",
  "longyu:taught-concepts-v6": "ANONYMOUS_PROGRESS",
  "longyu:pedagogical-inline-seen-v1": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:journey-node-completions:v1": "ANONYMOUS_PROGRESS",
  "longyu:interface-locale": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:instruction-locale": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:telemetry-consent": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:device-perf-baseline:v1": "GLOBAL_DEVICE_PREFERENCE",
  "longyu:oauth-pkce": "SESSION_TRANSIENT",
  "longyu:oauth-pending:v1": "SESSION_TRANSIENT",
  "longyu:oauth-processed:v1": "SESSION_TRANSIENT",
  "longyu:pending-confirm-email": "SESSION_TRANSIENT",
  "longyu:e2e-guidance": "DEV_QA",
  "longyu:device-qa:v1": "DEV_QA",
};
