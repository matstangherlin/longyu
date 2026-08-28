import { getInterfaceLocale } from "./locale";
import type { SupportedLocale } from "./config";

function localeTag(locale: SupportedLocale = getInterfaceLocale()): string {
  return locale;
}

/** Format a calendar date in the active interface locale. Not for Chinese date lessons. */
export function formatDate(
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
  locale: SupportedLocale = getInterfaceLocale()
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(localeTag(locale), options);
}

/** Format date+time in the active interface locale. */
export function formatDateTime(
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
  locale: SupportedLocale = getInterfaceLocale()
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(localeTag(locale), options);
}

/** Format a UI number in the active interface locale. Not for Mandarin number drills. */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: SupportedLocale = getInterfaceLocale()
): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString(localeTag(locale), options);
}
