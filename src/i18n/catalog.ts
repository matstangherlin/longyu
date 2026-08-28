import { ptBR, type MessageCatalog, type MessageKey } from "../locales/pt-BR";
import { en } from "../locales/en";
import { DEFAULT_LOCALE, type SupportedLocale } from "./config";
import { getInterfaceLocale } from "./locale";

export const CATALOGS: Record<SupportedLocale, MessageCatalog> = {
  "pt-BR": ptBR as unknown as MessageCatalog,
  en,
};

const missingKeys = new Set<string>();

export type TranslateVars = Record<string, string | number>;

function isDevEnv(): boolean {
  try {
    const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;
    if (env?.NODE_ENV === "production") return false;
  } catch {
    // ignore
  }
  return true;
}

function lookup(tree: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = tree;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node === "string") return node;
  if (node != null && typeof node === "object") return undefined;
  return undefined;
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, name: string) => {
    const value = vars[name];
    return value == null ? match : String(value);
  });
}

function recordMissing(locale: SupportedLocale, key: string): void {
  const id = `${locale}:${key}`;
  if (missingKeys.has(id)) return;
  missingKeys.add(id);
  if (isDevEnv()) {
    console.warn(`[i18n] Missing translation: ${key} (${locale})`);
  }
}

export function consumeMissingTranslationKeys(): string[] {
  const keys = [...missingKeys];
  missingKeys.clear();
  return keys;
}

export function peekMissingTranslationKeys(): string[] {
  return [...missingKeys];
}

/**
 * Translate a catalog key.
 * Missing EN keys fall back to pt-BR. Missing everywhere returns the key
 * (visible in DEV; production still renders something).
 */
export function t(key: MessageKey | string, vars?: TranslateVars, locale: SupportedLocale = getInterfaceLocale()): string {
  const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
  let value = lookup(catalog, key);
  if (value == null || value.length === 0) {
    recordMissing(locale, key);
    if (locale !== DEFAULT_LOCALE) {
      value = lookup(CATALOGS[DEFAULT_LOCALE], key);
    }
  }
  if (value == null || value.length === 0) {
    return key;
  }
  if (value.includes("[object Object]")) {
    recordMissing(locale, key);
    if (isDevEnv()) {
      console.warn(`[i18n] Accidental object string for ${key}`);
    }
  }
  return interpolate(value, vars);
}

export function flattenCatalog(tree: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (tree == null || typeof tree !== "object") return out;
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
      continue;
    }
    if (value && typeof value === "object") {
      Object.assign(out, flattenCatalog(value, path));
    }
  }
  return out;
}

export type { MessageCatalog, MessageKey };
