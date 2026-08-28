import { COUNTRY_OPTIONS } from "../../data/countries";
import { canonicalCountryCode, countryLabelForCode, LAUNCH_COUNTRY_CODE } from "../../lib/i18n/identity";
import { useTranslation } from "../../i18n/useTranslation";
import type { SupportedLocale } from "../../i18n/config";

function localizedCountryName(code: string, locale: SupportedLocale, fallback: string): string {
  try {
    const names = new Intl.DisplayNames([locale === "en" ? "en" : "pt-BR"], { type: "region" });
    return names.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

export function CountrySelect({
  id,
  name = "country",
  value,
  onChange,
  required,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  className: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const { locale } = useTranslation();
  const selected = canonicalCountryCode(value);
  const sorted = [
    ...COUNTRY_OPTIONS.filter((item) => item.code === LAUNCH_COUNTRY_CODE),
    ...COUNTRY_OPTIONS.filter((item) => item.code !== LAUNCH_COUNTRY_CODE).sort((a, b) =>
      localizedCountryName(a.code, locale, a.label).localeCompare(localizedCountryName(b.code, locale, b.label), locale)
    ),
  ];
  const listed = sorted.some((item) => item.code === selected);

  return (
    <select
      id={id}
      name={name}
      autoComplete="country"
      required={required}
      data-country-select
      value={selected}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={className}
    >
      {!listed ? (
        <option value={selected}>{localizedCountryName(selected, locale, countryLabelForCode(selected))}</option>
      ) : null}
      {sorted.map((item) => (
        <option key={item.code} value={item.code}>
          {localizedCountryName(item.code, locale, item.label)}
        </option>
      ))}
    </select>
  );
}
