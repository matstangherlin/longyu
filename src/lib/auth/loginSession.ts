/** Deadline for the password grant only. Sync and profile run after navigation. */
export const AUTH_SIGN_IN_TIMEOUT_MS = 15_000;

/** Cloud push must not hold the sign-out button. */
export const SIGN_OUT_PUSH_TIMEOUT_MS = 4_000;

/** Server revoke. Local session is cleared even when this expires. */
export const SIGN_OUT_AUTH_TIMEOUT_MS = 4_000;

export function isAuthTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "timeout";
}

export function isExpiredSessionFailure(error: { status?: number; message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 403) return true;
  const code = String(error.code ?? "");
  if (code === "session_expired" || code === "bad_jwt") return true;
  return /session expired|invalid claim|jwt expired|user from sub claim in jwt does not exist/i.test(error.message ?? "");
}
