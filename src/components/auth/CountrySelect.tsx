import { COUNTRY_OPTIONS } from "../../data/countries";
import { canonicalCountryCode, countryLabelForCode, LAUNCH_COUNTRY_CODE } from "../../lib/i18n/identity";

const SORTED_OPTIONS = [
  ...COUNTRY_OPTIONS.filter((item) => item.code === LAUNCH_COUNTRY_CODE),
  ...COUNTRY_OPTIONS.filter((item) => item.code !== LAUNCH_COUNTRY_CODE).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
  ),
];

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
  const selected = canonicalCountryCode(value);
  const listed = SORTED_OPTIONS.some((item) => item.code === selected);

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
      {!listed ? <option value={selected}>{countryLabelForCode(selected)}</option> : null}
      {SORTED_OPTIONS.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
