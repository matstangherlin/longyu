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
  return {
    name: profile.name.trim() || "Aluno Longyu",
    birth_date: profile.birthDate?.trim() || null,
    country: profile.country?.trim() || null,
    signup_source: profile.signupSource?.trim() || null,
    marketing_opt_in: profile.marketingOptIn === true,
    onboarding_completed: profile.onboardingCompleted !== false,
    native_language: "pt-BR",
    target_language: "zh-CN",
    updated_at: new Date().toISOString(),
  };
}
