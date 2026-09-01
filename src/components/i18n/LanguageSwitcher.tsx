import { LOCALE_DISPLAY_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n/config";
import { parseInterfaceLocale } from "../../i18n/locale";
import { useTranslation } from "../../i18n/useTranslation";

export function LanguageSwitcher({
  compact = false,
  id = "interface-locale",
}: {
  compact?: boolean;
  id?: string;
}) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <label className={compact ? "inline-flex items-center gap-2" : "grid gap-1.5"} htmlFor={id}>
      {!compact && (
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {t("settings.appLanguage")}
        </span>
      )}
      {compact && <span className="sr-only">{t("marketing.languageSwitcher")}</span>}
      <select
        id={id}
        data-testid="interface-locale-select"
        value={locale}
        onChange={(event) => setLocale(parseInterfaceLocale(event.target.value) as SupportedLocale)}
        className={[
          "rounded-xl border border-line bg-surface text-sm font-semibold text-ink outline-none transition focus:ring-2 focus:ring-accent/25",
          compact ? "h-11 min-w-[7.5rem] px-2.5" : "h-11 w-full px-3",
        ].join(" ")}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_DISPLAY_NAME[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
