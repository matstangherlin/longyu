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

/** Após clicar no link do email, o usuário volta para esta rota. */
export function emailConfirmationRedirectUrl(): string {
  return `${getAppOrigin()}/confirmar-email`;
}

const PENDING_EMAIL_KEY = "longyu:pending-confirm-email";

export function storePendingConfirmEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function peekPendingConfirmEmail(): string | null {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function clearPendingConfirmEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function confirmEmailPath(email?: string | null): string {
  const clean = (email ?? "").trim();
  if (!clean) return "/confirmar-email";
  return `/confirmar-email?email=${encodeURIComponent(clean)}`;
}
