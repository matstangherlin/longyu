/** Valida email + senha para login (sem confirmação de senha). */
export function isValidEmail(email: string): boolean {
  const cleanEmail = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
}

export function canSignInWithCredentials(email: string, password: string): boolean {
  return isValidEmail(email) && password.length >= 6;
}

/** Valida email + senha + confirmação para registro. */
export function canRegisterWithCredentials(email: string, password: string, passwordConfirm: string): boolean {
  return canSignInWithCredentials(email, password) && password === passwordConfirm;
}
