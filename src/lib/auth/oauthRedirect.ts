/**
 * RC2.3.8 — OAuth redirect contract: ONE callback path, an explicit allowlist,
 * no redirect taken from a query string, return routes internal only.
 *
 *   Web/PWA:  https://<approved origin>/auth/callback
 *   Android:  longyu.noba.com://auth/callback   (intent-filter, custom scheme)
 *
 * Supabase "Redirect URLs" must list exactly these (owner action).
 */
import { LONGYU_APP_SCHEME, LONGYU_WEB_HOSTS } from "../platform/deepLinks";

export const OAUTH_CALLBACK_PATH = "/auth/callback";
export const ANDROID_OAUTH_CALLBACK = `${LONGYU_APP_SCHEME}://auth/callback`;

/** Approved web origins, by environment. */
export const OAUTH_WEB_ORIGINS = {
  production: LONGYU_WEB_HOSTS.map((host) => `https://${host}`),
  dev: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"],
} as const;

export function allowedWebOrigins(): string[] {
  return [...OAUTH_WEB_ORIGINS.production, ...OAUTH_WEB_ORIGINS.dev];
}

/** The redirect URL to give Supabase, or null when this origin is not approved. */
export function oauthRedirectUrl(platform: "web" | "android", origin: string): string | null {
  if (platform === "android") return ANDROID_OAUTH_CALLBACK;
  const clean = origin.replace(/\/+$/, "");
  return allowedWebOrigins().includes(clean) ? `${clean}${OAUTH_CALLBACK_PATH}` : null;
}

export interface ParsedCallback {
  ok: boolean;
  /** Why it was rejected (safe, no secrets). */
  reason?: "UNKNOWN_ORIGIN" | "WRONG_PATH" | "MALFORMED" | "PROVIDER_ERROR" | "CANCELLED" | "NO_CODE";
  code?: string;
  /** Provider/Supabase error code (safe), never the description text. */
  errorCode?: string;
}

/** Validate a callback URL (web or native). Never trusts anything but the allowlist. */
export function parseOAuthCallback(rawUrl: string): ParsedCallback {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }
  const isNative = url.protocol === `${LONGYU_APP_SCHEME}:`;
  if (isNative) {
    // longyu.noba.com://auth/callback → host "auth", path "/callback"
    if (`${url.host}${url.pathname}` !== "auth/callback") return { ok: false, reason: "WRONG_PATH" };
  } else {
    if (!allowedWebOrigins().includes(url.origin)) return { ok: false, reason: "UNKNOWN_ORIGIN" };
    if (url.pathname !== OAUTH_CALLBACK_PATH) return { ok: false, reason: "WRONG_PATH" };
  }
  const params = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const error = params.get("error") ?? hash.get("error");
  if (error) {
    const errorCode = (params.get("error_code") ?? hash.get("error_code") ?? error).slice(0, 48).replace(/[^a-z0-9_]/gi, "");
    return { ok: false, reason: error === "access_denied" ? "CANCELLED" : "PROVIDER_ERROR", errorCode };
  }
  const code = params.get("code");
  if (!code || !/^[A-Za-z0-9._~-]{8,512}$/.test(code)) return { ok: false, reason: "NO_CODE" };
  return { ok: true, code };
}

const SAFE_INTERNAL = /^\/(?!\/)[A-Za-z0-9\-._~/%?=&]*$/;

/**
 * Return route after login: only an internal app path, chosen by the app and
 * stored internally — never a URL from the callback or a query string.
 */
export function safeReturnTo(candidate: string | null | undefined, fallback = "/jornada"): string {
  const value = String(candidate ?? "");
  if (!value || !SAFE_INTERNAL.test(value) || value.includes("//") || /^\/(auth|login|comecar)\b/.test(value)) return fallback;
  return value;
}
