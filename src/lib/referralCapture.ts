const STORAGE_KEY = "longyu:referral-code";
const STORAGE_AT_KEY = "longyu:referral-at";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return null;
  if (!/^[A-Z0-9]{6,16}$/.test(code)) return null;
  return code;
}

export function storeReferralCode(raw: string | null | undefined): boolean {
  const code = normalizeCode(raw);
  if (!code) return false;
  try {
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem(STORAGE_AT_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function peekReferralCode(): string | null {
  try {
    const code = normalizeCode(localStorage.getItem(STORAGE_KEY));
    const at = Number(localStorage.getItem(STORAGE_AT_KEY) ?? "0");
    if (!code || !at) return null;
    if (Date.now() - at > TTL_MS) {
      clearReferralCode();
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_AT_KEY);
  } catch {
    // ignore
  }
}

export function referralInvitePath(code: string): string {
  return `/convite/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function referralPublicUrl(code: string, origin = typeof window !== "undefined" ? window.location.origin : "https://longyu.app"): string {
  return `${origin.replace(/\/$/, "")}${referralInvitePath(code)}`;
}

export function captureReferralFromSearch(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return storeReferralCode(params.get("ref") ?? params.get("convite"));
}
