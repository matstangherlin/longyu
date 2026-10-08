/**
 * RC2.3.8 — social sign-in (Google · Apple · Microsoft) and identity linking.
 *
 * One architecture: the existing Supabase session + the SAME account bootstrap
 * as e-mail login (ensure profile → sync progress → entitlement from server).
 *
 * PKCE without touching e-mail flows: a dedicated client with `flowType: "pkce"`
 * only starts OAuth and exchanges the code (its own storage key holds the code
 * verifier). The resulting session is handed to the main client, which keeps
 * refreshing it. E-mail confirmation / recovery keep their current behaviour.
 *
 * Security: redirect only to the allowlisted callback, return route only from
 * internal state, duplicate callbacks ignored, no token/code ever logged.
 * Linking uses Supabase's official manual linking — never "same e-mail ⇒ same
 * person" on the client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { isNativeApp } from "../lib/platform/nativePlatform";
import { closeAuthBrowser, openAuthBrowser } from "../lib/platform/nativeAuthBrowser";
import { recordTechEvent } from "../lib/techEvents";
import { AUTH_PROVIDERS, SUPABASE_PROVIDER, type SocialProviderId } from "../lib/auth/providers";
import { oauthRedirectUrl, parseOAuthCallback, safeReturnTo } from "../lib/auth/oauthRedirect";
import { makeAuthError, type AuthError, type AuthStage } from "../lib/auth/authError";
import { clearPending, markCodeProcessed, readPending, savePending, type PendingOAuth } from "../lib/auth/oauthState";
import { ensureProfileForCurrentSession } from "./authService";

const OAUTH_STORAGE_KEY = "longyu:oauth-pkce";
/** The whole callback (exchange + account bootstrap) must end or fail within this. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 20_000;

let oauthClient: SupabaseClient | null = null;

function getOAuthClient(): SupabaseClient | null {
  if (!isSupabaseBackendEnabled()) return null;
  if (oauthClient) return oauthClient;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  oauthClient = createClient(url, anonKey, {
    auth: { flowType: "pkce", storageKey: OAUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return oauthClient;
}

function platform(): "web" | "android" {
  return isNativeApp() ? "android" : "web";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export type StartResult = { ok: true; stage: AuthStage } | { ok: false; error: AuthError };

/** Start Google / Apple / Microsoft sign-in (or linking, when signed in). */
export async function startProviderAuth(provider: SocialProviderId, opts: { intent?: "signin" | "link"; returnTo?: string } = {}): Promise<StartResult> {
  const intent = opts.intent ?? "signin";
  const oauth = getOAuthClient();
  const main = getSupabaseClient();
  if (!oauth || !main) return { ok: false, error: makeAuthError("CONFIG", provider, "starting_provider", "backend_off") };
  const redirectTo = oauthRedirectUrl(platform(), typeof window !== "undefined" ? window.location.origin : "");
  if (!redirectTo) return { ok: false, error: makeAuthError("CONFIG", provider, "starting_provider", "origin_not_allowed") };
  const meta = AUTH_PROVIDERS.find((p) => p.id === provider);
  const pending: PendingOAuth = { provider, intent, returnTo: safeReturnTo(opts.returnTo, intent === "link" ? "/conta" : "/jornada"), startedAt: Date.now() };
  recordTechEvent("auth_provider_started", { provider, intent, platform: platform() });
  try {
    let url: string | undefined;
    if (intent === "link") {
      // Official manual linking: requires the current session; Supabase decides.
      const { data: sessionData } = await main.auth.getSession();
      const session = sessionData.session;
      if (!session) return { ok: false, error: makeAuthError("SESSION", provider, "linking", "no_session") };
      await oauth.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
      const { data, error } = await oauth.auth.linkIdentity({ provider: SUPABASE_PROVIDER[provider], options: { redirectTo, scopes: meta?.scopes, skipBrowserRedirect: true } });
      if (error) return { ok: false, error: makeAuthError("PROVIDER", provider, "linking", error.name || "link_failed") };
      url = data?.url ?? undefined;
    } else {
      const { data, error } = await oauth.auth.signInWithOAuth({ provider: SUPABASE_PROVIDER[provider], options: { redirectTo, scopes: meta?.scopes, skipBrowserRedirect: true } });
      if (error) return { ok: false, error: makeAuthError("PROVIDER", provider, "starting_provider", error.name || "start_failed") };
      url = data?.url ?? undefined;
    }
    if (!url) return { ok: false, error: makeAuthError("PROVIDER", provider, "starting_provider", "no_url") };
    savePending(pending);
    if (platform() === "android") {
      await openAuthBrowser(url);
    } else {
      window.location.assign(url);
    }
    return { ok: true, stage: "browser_opened" };
  } catch {
    return { ok: false, error: makeAuthError("NETWORK", provider, "starting_provider", "start_exception") };
  }
}

export type CallbackOutcome =
  | { status: "signed_in"; provider: SocialProviderId; returnTo: string; suggestedName: string | null }
  | { status: "linked"; provider: SocialProviderId; returnTo: string }
  | { status: "duplicate" }
  | { status: "error"; error: AuthError; returnTo: string };

let inFlight: Promise<CallbackOutcome> | null = null;

/**
 * Android: the deep link arrives in nativeShell (cold or warm start). It is
 * kept in memory only and the app navigates to /auth/callback, whose page
 * hands it to the same router as the web.
 */
let nativeCallbackUrl: string | null = null;

export function isOAuthCallbackUrl(url: string): boolean {
  return /^longyu\.noba\.com:\/\/auth\/callback\b/.test(url);
}

export function setNativeCallbackUrl(url: string): void {
  nativeCallbackUrl = url;
}

export function takeNativeCallbackUrl(): string | null {
  const url = nativeCallbackUrl;
  nativeCallbackUrl = null;
  return url;
}

/**
 * THE callback router. Web `/auth/callback` and the Android deep link both end
 * here. Single-flight + processed-code ledger = a callback is handled once.
 */
export function completeOAuthCallback(rawUrl: string): Promise<CallbackOutcome> {
  if (inFlight) return inFlight.then(() => ({ status: "duplicate" as const }));
  inFlight = handleCallback(rawUrl).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Last callback stage/outcome (QA panel only; no codes, no tokens). */
export const oauthDiagnostics: { lastStage: string | null; lastOutcome: string | null; at: number | null } = { lastStage: null, lastOutcome: null, at: null };

async function handleCallback(rawUrl: string): Promise<CallbackOutcome> {
  const outcome = await handleCallbackInner(rawUrl);
  oauthDiagnostics.lastOutcome = outcome.status === "error" ? `error:${outcome.error.category}:${outcome.error.safeCode}` : outcome.status;
  oauthDiagnostics.lastStage = outcome.status === "error" ? outcome.error.stage : "done";
  oauthDiagnostics.at = Date.now();
  return outcome;
}

async function handleCallbackInner(rawUrl: string): Promise<CallbackOutcome> {
  const pending = readPending();
  const provider: SocialProviderId = pending?.provider ?? "google";
  const returnTo = safeReturnTo(pending?.returnTo, "/jornada");
  const parsed = parseOAuthCallback(rawUrl);
  if (!parsed.ok) {
    clearPending();
    const category = parsed.reason === "CANCELLED" ? "CANCELLED" : parsed.reason === "UNKNOWN_ORIGIN" || parsed.reason === "WRONG_PATH" ? "CONFIG" : "PROVIDER";
    recordTechEvent(category === "CANCELLED" ? "auth_provider_cancelled" : "auth_callback_failed", { provider, reason: parsed.reason ?? "unknown", code: parsed.errorCode ?? null });
    const error = makeAuthError(category, provider, "callback_received", parsed.errorCode ?? parsed.reason ?? "unknown");
    // A provider refusing to link because the identity belongs to someone else.
    if (/identity_already_exists|already_linked/i.test(parsed.errorCode ?? "")) return { status: "error", error: { ...error, category: "CONFLICT" }, returnTo };
    return { status: "error", error, returnTo };
  }
  if (!markCodeProcessed(parsed.code!)) {
    recordTechEvent("auth_callback_duplicate", { provider });
    return { status: "duplicate" };
  }
  const oauth = getOAuthClient();
  const main = getSupabaseClient();
  if (!oauth || !main) return { status: "error", error: makeAuthError("CONFIG", provider, "session_exchanging", "backend_off"), returnTo };
  try {
    const exchanged = await withTimeout(oauth.auth.exchangeCodeForSession(parsed.code!), OAUTH_CALLBACK_TIMEOUT_MS);
    if (exchanged.error || !exchanged.data.session) {
      clearPending();
      const conflict = /already|exists|linked/i.test(exchanged.error?.message ?? "");
      recordTechEvent("auth_callback_failed", { provider, stage: "session_exchanging", conflict });
      return { status: "error", error: makeAuthError(conflict ? "CONFLICT" : "SESSION", provider, "session_exchanging", exchanged.error?.name ?? "exchange_failed"), returnTo };
    }
    const session = exchanged.data.session;
    // Hand the session to the main client (it owns refresh); drop the PKCE copy locally.
    await main.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    await oauth.auth.signOut({ scope: "local" }).catch(() => undefined);
    clearPending();
    if (platform() === "android") {
      await closeAuthBrowser();
    }
    if (pending?.intent === "link") {
      recordTechEvent("auth_success", { provider, intent: "link" });
      return { status: "linked", provider, returnTo };
    }
    // Provider metadata is only a suggestion (Apple may send nothing after the first login).
    const meta = session.user.user_metadata ?? {};
    const suggestedName = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
    await withTimeout(ensureProfileForCurrentSession(suggestedName), OAUTH_CALLBACK_TIMEOUT_MS).catch(() => null);
    recordTechEvent("auth_success", { provider, intent: "signin" });
    return { status: "signed_in", provider, returnTo, suggestedName };
  } catch {
    clearPending();
    recordTechEvent("auth_callback_failed", { provider, stage: "session_exchanging", reason: "timeout" });
    return { status: "error", error: makeAuthError("TIMEOUT", provider, "session_exchanging", "timeout"), returnTo };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Access methods (identities) — official getUserIdentities / unlinkIdentity
// ─────────────────────────────────────────────────────────────────────────

export interface AccessMethod {
  provider: string;
  identityId: string;
  /** Shown masked; relay addresses are normal, not an error. */
  emailHint: string | null;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return null;
  if (/privaterelay\.appleid\.com$/i.test(domain)) return "e-mail oculto pela Apple";
  return `${user.slice(0, 2)}•••@${domain}`;
}

export async function listAccessMethods(): Promise<AccessMethod[]> {
  const main = getSupabaseClient();
  if (!main) return [];
  const { data, error } = await main.auth.getUserIdentities();
  if (error || !data) return [];
  return data.identities.map((identity) => ({
    provider: identity.provider,
    identityId: identity.identity_id ?? identity.id,
    emailHint: maskEmail(typeof identity.identity_data?.email === "string" ? identity.identity_data.email : null),
  }));
}

/** ACCOUNT_MUST_REMAIN_RECOVERABLE: the last access method can never be removed. */
export function canUnlink(methods: readonly AccessMethod[], provider: string): boolean {
  return methods.length >= 2 && methods.some((m) => m.provider === provider);
}

export async function unlinkAccessMethod(provider: string): Promise<{ ok: boolean; reason?: "LAST_METHOD" | "FAILED" }> {
  const main = getSupabaseClient();
  if (!main) return { ok: false, reason: "FAILED" };
  const { data, error } = await main.auth.getUserIdentities();
  if (error || !data) return { ok: false, reason: "FAILED" };
  const methods = data.identities.map((i) => ({ provider: i.provider, identityId: i.identity_id ?? i.id, emailHint: null }));
  if (!canUnlink(methods, provider)) return { ok: false, reason: "LAST_METHOD" };
  const identity = data.identities.find((i) => i.provider === provider);
  if (!identity) return { ok: false, reason: "FAILED" };
  const { error: unlinkError } = await main.auth.unlinkIdentity(identity);
  return unlinkError ? { ok: false, reason: "FAILED" } : { ok: true };
}
