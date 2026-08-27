import { canonicalCountryCode, launchLocaleFields } from "../lib/i18n/identity";

/** Dados de perfil coletados no cadastro e salvos em public.profiles. */
export interface ProfileDetails {
  name: string;
  birthDate?: string | null;
  country?: string | null;
  signupSource?: string | null;
  marketingOptIn?: boolean;
  onboardingCompleted?: boolean;
}

export function profileDetailsPayload(profile: ProfileDetails) {
  const locales = launchLocaleFields();
  return {
    name: profile.name.trim() || "Aluno Longyu",
    birth_date: profile.birthDate?.trim() || null,
    country: profile.country?.trim() || null,
    country_code: canonicalCountryCode(profile.country),
    signup_source: profile.signupSource?.trim() || null,
    marketing_opt_in: profile.marketingOptIn === true,
    native_language: locales.native_language,
    target_language: locales.target_language,
    interface_locale: locales.interface_locale,
    instruction_locale: locales.instruction_locale,
    updated_at: new Date().toISOString(),
  };
}
