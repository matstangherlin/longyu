import { LOCALE_DISPLAY_NAME, SUPPORTED_LOCALES, type InstructionLocale } from "../../i18n/config";
import { parseInterfaceLocale } from "../../i18n/locale";
import { useTranslation } from "../../i18n/useTranslation";

export function CourseLanguageSwitcher({ id = "instruction-locale", compact = false }: { id?: string; compact?: boolean }) {
  const { instructionLocale, setInstructionLocale, t } = useTranslation();
  return (
    <label className={compact ? "grid gap-1" : "grid gap-1.5"} htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {t("settings.learnMandarinFrom")}
      </span>
      <select
        id={id}
        data-testid="instruction-locale-select"
        value={instructionLocale}
        onChange={(event) => setInstructionLocale(parseInterfaceLocale(event.target.value) as InstructionLocale)}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>{LOCALE_DISPLAY_NAME[code]}</option>
        ))}
      </select>
    </label>
  );
}
