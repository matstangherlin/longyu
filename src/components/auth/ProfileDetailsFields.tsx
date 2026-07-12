import { SIGNUP_SOURCE_OPTIONS } from "../../data/profileSignup";

export interface ProfileDetailsFormState {
  birthDate: string;
  country: string;
  marketingOptIn: boolean;
  signupSource: string;
}

export const DEFAULT_PROFILE_DETAILS: ProfileDetailsFormState = {
  birthDate: "",
  country: "Brasil",
  marketingOptIn: false,
  signupSource: "",
};

export function ProfileDetailsFields({
  birthDate,
  country,
  marketingOptIn,
  signupSource,
  onBirthDate,
  onCountry,
  onMarketingOptIn,
  onSignupSource,
  showSignupSource = true,
}: {
  birthDate: string;
  country: string;
  marketingOptIn: boolean;
  signupSource: string;
  onBirthDate: (value: string) => void;
  onCountry: (value: string) => void;
  onMarketingOptIn: (value: boolean) => void;
  onSignupSource: (value: string) => void;
  showSignupSource?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Data de nascimento</span>
          <input
            type="date"
            value={birthDate}
            onChange={(event) => onBirthDate(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">País</span>
          <input
            type="text"
            value={country}
            onChange={(event) => onCountry(event.target.value)}
            placeholder="Brasil"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>
      </div>

      {showSignupSource && (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Como conheceu o Longyu?</span>
          <select
            value={signupSource}
            onChange={(event) => onSignupSource(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="">Selecione (opcional)</option>
            {SIGNUP_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(event) => onMarketingOptIn(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-line text-accent"
        />
        <span className="text-sm leading-5 text-ink-soft">
          Quero receber novidades, dicas de estudo e ofertas do Longyu por email.
        </span>
      </label>
    </div>
  );
}
