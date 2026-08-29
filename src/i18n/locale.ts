import {
  DEFAULT_LOCALE,
  INTERFACE_LOCALE_STORAGE_KEY,
  LOCALE_HTML_LANG,
  LONGYU_I18N_VERSION,
  isSupportedLocale,
  type SupportedLocale,
} from "./config";

type LocaleListener = (locale: SupportedLocale) => void;

let currentLocale: SupportedLocale = DEFAULT_LOCALE;
const listeners = new Set<LocaleListener>();
let bootstrapped = false;

function readStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(INTERFACE_LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(locale: SupportedLocale): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(INTERFACE_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Quota / private mode — locale still applies in-memory.
  }
}

/**
 * Canonicalize a user/storage value into a supported interface locale.
 *
 * - `en`, `en-US`, `en-GB` → `en` (language, not country)
 * - `pt`, `pt-BR`, `pt-PT` → `pt-BR` (only pt-BR is shipped)
 * - Country codes (`BR`, `US`) are NOT locales → default
 * - Unknown / empty → `pt-BR`
 *
 * Never infers language from a country code.
 */
export function parseInterfaceLocale(raw: unknown): SupportedLocale {
  if (raw == null) return DEFAULT_LOCALE;
  const value = String(raw).trim();
  if (!value) return DEFAULT_LOCALE;
  if (isSupportedLocale(value)) return value;

  const normalized = value.replace(/_/g, "-");
  const primary = normalized.split("-")[0]?.toLowerCase() ?? "";

  if (primary === "en") return "en";
  if (primary === "pt") return "pt-BR";

  return DEFAULT_LOCALE;
}

export function readPersistedInterfaceLocale(): SupportedLocale | null {
  const stored = readStorage();
  if (stored == null) return null;
  const parsed = parseInterfaceLocale(stored);
  if (isSupportedLocale(stored) || stored.toLowerCase() === "en" || stored.toLowerCase().startsWith("en-") || stored.toLowerCase() === "pt" || stored.toLowerCase().startsWith("pt-")) {
    return parsed;
  }
  return null;
}

function resolveInterfaceLocale(): SupportedLocale {
  const persisted = readPersistedInterfaceLocale();
  if (persisted) return persisted;
  return DEFAULT_LOCALE;
}

export function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.lang = LOCALE_HTML_LANG[locale];
  html.dataset.interfaceLocale = locale;
  html.dataset.i18nVersion = LONGYU_I18N_VERSION;
}

export function getInterfaceLocale(): SupportedLocale {
  if (!bootstrapped) bootstrapInterfaceLocale();
  return currentLocale;
}

export function subscribeInterfaceLocale(listener: LocaleListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(locale: SupportedLocale): void {
  for (const listener of listeners) listener(locale);
}

/**
 * Persist + apply an interface locale. Does not touch mastery, SRS, XP, or lesson ids.
 * Reload is not required; React subscribers re-render.
 */
export function setInterfaceLocale(next: unknown): SupportedLocale {
  const locale = parseInterfaceLocale(next);
  writeStorage(locale);
  currentLocale = locale;
  bootstrapped = true;
  applyDocumentLocale(locale);
  notify(locale);
  return locale;
}

/** Sync bootstrap before first paint. Safe to call more than once. */
export function bootstrapInterfaceLocale(): SupportedLocale {
  const locale = resolveInterfaceLocale();
  currentLocale = locale;
  bootstrapped = true;
  applyDocumentLocale(locale);
  return locale;
}

/** Test helper — does not wipe pedagogical storage. */
export function resetInterfaceLocaleForTests(): void {
  currentLocale = DEFAULT_LOCALE;
  bootstrapped = false;
  listeners.clear();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(INTERFACE_LOCALE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  applyDocumentLocale(DEFAULT_LOCALE);
}
