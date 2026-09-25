/**
 * Future cloud persistence for interface locale.
 *
 * Planned profile columns (V4.7.8B / PR #208 — not required in this wave):
 *   interface_locale, instruction_locale, native_language, target_language
 *
 * This remessa must work without those hosted columns. Implementations here
 * never write to MandarimProject / Supabase. When #208 lands, swap
 * `activeInterfaceLocaleAdapter` to a cloud-backed adapter.
 */

import { type SupportedLocale } from "./config";
import {
  getInterfaceLocale,
  getInterfaceLocaleSource,
  parseInterfaceLocale,
  resolvePreferredInterfaceLocale,
  readPersistedInterfaceLocale,
  setInterfaceLocale as setLocalInterfaceLocale,
} from "./locale";

export interface InterfaceLocaleAdapter {
  /** Stored preference if any; `null` means "fall through to local / default". */
  getInterfaceLocale(): Promise<SupportedLocale | null>;
  setInterfaceLocale(locale: SupportedLocale): Promise<void>;
}

/** Device-only adapter. Safe to call from the UI. */
export const localInterfaceLocaleAdapter: InterfaceLocaleAdapter = {
  async getInterfaceLocale() {
    return readPersistedInterfaceLocale();
  },
  async setInterfaceLocale(locale) {
    setLocalInterfaceLocale(locale);
  },
};

/**
 * Placeholder for the post-#208 cloud adapter.
 * Today it is identical to local (no DB write, no fetch).
 */
export const cloudInterfaceLocaleAdapter: InterfaceLocaleAdapter = {
  async getInterfaceLocale() {
    return localInterfaceLocaleAdapter.getInterfaceLocale();
  },
  async setInterfaceLocale(locale) {
    await localInterfaceLocaleAdapter.setInterfaceLocale(locale);
  },
};

export const activeInterfaceLocaleAdapter: InterfaceLocaleAdapter = localInterfaceLocaleAdapter;

/**
 * RC2.2.14B — a ordem canônica mora em `resolvePreferredInterfaceLocale()`
 * (src/i18n/locale.ts): escolha manual → sistema → padrão. O adapter só
 * existe para quando a interface também for preferência da conta.
 */
export async function resolveStoredInterfaceLocale(): Promise<SupportedLocale> {
  const stored = await activeInterfaceLocaleAdapter.getInterfaceLocale();
  if (stored && getInterfaceLocaleSource() === "user") return parseInterfaceLocale(stored);
  return resolvePreferredInterfaceLocale();
}

export { getInterfaceLocale };
