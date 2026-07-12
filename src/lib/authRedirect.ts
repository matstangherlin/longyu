/** Origem do app para redirects do Supabase Auth (recuperação de senha). */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv = import.meta.env.VITE_APP_URL ?? import.meta.env.URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");
  return "http://localhost:5173";
}

export function passwordRecoveryRedirectUrl(): string {
  return `${getAppOrigin()}/redefinir-senha`;
}
