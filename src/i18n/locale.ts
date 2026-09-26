import {
  DEFAULT_LOCALE,
  INTERFACE_LOCALE_SOURCE_STORAGE_KEY,
  INTERFACE_LOCALE_STORAGE_KEY,
  LOCALE_HTML_LANG,
  LONGYU_I18N_VERSION,
  SYSTEM_FALLBACK_INTERFACE_LOCALE,
  isSupportedLocale,
  type InterfaceLocaleSource,
  type SupportedLocale,
} from "./config";

/**
 * RC2.2.14B — quem lê o idioma do sistema é a camada de plataforma
 * (src/lib/platform/systemLocale.ts), registrada em main.tsx antes do
 * primeiro render. Sem registro (testes Node, pré-render) → lista vazia.
 */
let systemLanguageProvider: () => readonly string[] = () => [];
export function setSystemLanguageProvider(provider: () => readonly string[]): void {
  systemLanguageProvider = provider;
}

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

function readSource(): InterfaceLocaleSource | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(INTERFACE_LOCALE_SOURCE_STORAGE_KEY);
    return value === "system" || value === "user" ? value : null;
  } catch {
    return null;
  }
}

function writeSource(source: InterfaceLocaleSource): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(INTERFACE_LOCALE_SOURCE_STORAGE_KEY, source);
  } catch {
    // ignore
  }
}

/**
 * RC2.2.14B · C/D — idioma do sistema → interface suportada.
 * pt, pt-BR, pt-PT → pt-BR · en, en-US, en-GB → en · o primeiro idioma
 * suportado da lista de preferência vence · nenhum suportado → EN.
 * `null` quando não há como saber (fora do navegador).
 */
export function resolveSystemInterfaceLocale(tags: readonly string[] = systemLanguageProvider()): SupportedLocale | null {
  if (tags.length === 0) return null;
  for (const tag of tags) {
    const primary = String(tag).replace(/_/g, "-").split("-")[0]?.toLowerCase() ?? "";
    if (primary === "pt") return "pt-BR";
    if (primary === "en") return "en";
  }
  return SYSTEM_FALLBACK_INTERFACE_LOCALE;
}

/** Como a interface foi decidida: escolha manual ou idioma do sistema. */
export function getInterfaceLocaleSource(): InterfaceLocaleSource {
  const source = readSource();
  if (source) return source;
  // Valor salvo antes da RC2.2.14B só existia por escolha manual no seletor.
  return readPersistedInterfaceLocale() ? "user" : "system";
}

/**
 * RC2.2.14B · AQ — resolvedor canônico da interface:
 *   1. escolha manual (conta ou aparelho) — nunca sobrescrita pelo sistema;
 *   2. idioma do sistema (acompanha mudanças do aparelho a cada abertura);
 *   3. padrão do produto quando não há sistema para ler.
 */
export function resolvePreferredInterfaceLocale(): SupportedLocale {
  const persisted = readPersistedInterfaceLocale();
  if (getInterfaceLocaleSource() === "user" && persisted) return persisted;
  return resolveSystemInterfaceLocale() ?? persisted ?? DEFAULT_LOCALE;
}

function resolveInterfaceLocale(): SupportedLocale {
  return resolvePreferredInterfaceLocale();
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
  writeSource("user");
  currentLocale = locale;
  bootstrapped = true;
  applyDocumentLocale(locale);
  notify(locale);
  return locale;
}

/** RC2.2.14B · AI — "Usar idioma do sistema": volta a acompanhar o aparelho. */
export function followSystemInterfaceLocale(): SupportedLocale {
  writeSource("system");
  const locale = resolveSystemInterfaceLocale() ?? DEFAULT_LOCALE;
  writeStorage(locale);
  currentLocale = locale;
  bootstrapped = true;
  applyDocumentLocale(locale);
  notify(locale);
  return locale;
}

/**
 * RC2.2.14B — o sistema mudou de idioma com o app aberto. Só acompanha quando
 * a interface está em "idioma do sistema"; escolha manual nunca é tocada.
 */
export function refreshSystemInterfaceLocale(): SupportedLocale {
  if (getInterfaceLocaleSource() === "user") return resolvePreferredInterfaceLocale();
  return followSystemInterfaceLocale();
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
      localStorage.removeItem(INTERFACE_LOCALE_SOURCE_STORAGE_KEY);
      localStorage.removeItem(INTERFACE_LOCALE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  applyDocumentLocale(DEFAULT_LOCALE);
}
