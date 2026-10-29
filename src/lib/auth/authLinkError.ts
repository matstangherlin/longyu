/**
 * LGY-013 — erro de link de Auth que o Supabase coloca na query ou no hash
 * (`otp_expired`, `access_denied`). A descrição crua não vai para a tela.
 */

const CODE = /^[a-z0-9_]{1,48}$/i;

export type AuthLinkError = { code: string };

export function readAuthLinkError(search: string, hash: string): AuthLinkError | null {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const raw = fragment.get("error_code") ?? query.get("error_code") ?? fragment.get("error") ?? query.get("error") ?? "";
  const code = raw.trim().slice(0, 48).replace(/[^a-z0-9_]/gi, "");
  if (!CODE.test(code)) return null;
  return { code };
}

export function readAuthLinkEmail(search: string): string {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const email = (query.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return "";
  return email;
}
