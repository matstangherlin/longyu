/**
 * Interface / instruction locales vs the Mandarin target.
 *
 * SupportedLocale is the language of the product chrome (buttons, nav, errors).
 * TARGET_LANGUAGE is what the student is learning. They are never derived
 * from country, IP, or `navigator.language`.
 */

export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Explicit product-domain name; never reuse this type as a billing market. */
export type InterfaceLocale = SupportedLocale;

/** Default interface + instruction language until the learner picks another. */
export const DEFAULT_LOCALE: SupportedLocale = "pt-BR";

/** Mandarin taught by Longyu. Canonical Chinese is not duplicated per UI locale. */
export const TARGET_LANGUAGE = "zh-CN";
export type TargetLanguage = typeof TARGET_LANGUAGE;

export const I18N_NAMESPACES = [
  "common",
  "navigation",
  "auth",
  "onboarding",
  "placement",
  "journey",
  "player",
  "review",
  "missions",
  "pro",
  "settings",
  "errors",
  "marketing",
  "shell",
  "hub",
  "feedback",
  "achievements",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

/** localStorage key. Must stay outside the pedagogical Zustand persist blob. */
export const INTERFACE_LOCALE_STORAGE_KEY = "longyu:interface-locale";

/** Product i18n wave. Independent of LONGYU_RC_VERSION. */
export const LONGYU_I18N_VERSION = "v4.8.6";

export const LOCALE_HTML_LANG: Record<SupportedLocale, string> = {
  "pt-BR": "pt-BR",
  en: "en",
};

export const LOCALE_OG: Record<SupportedLocale, string> = {
  "pt-BR": "pt_BR",
  en: "en_US",
};

export const LOCALE_DISPLAY_NAME: Record<SupportedLocale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "pt-BR" || value === "en";
}
