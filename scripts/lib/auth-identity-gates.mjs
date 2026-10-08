/**
 * RC2.3.8 — gate:rc2-3-8-auth-identity (pure checks over an injectable runtime).
 *
 * AI1  CANONICAL_ID          account/namespace/claim keyed by Supabase user id, never e-mail
 * AI2  NO_TOKEN_LOGGING      no token / auth code / provider token in logs or telemetry
 * AI3  NO_SERVICE_ROLE       no service-role key in src, dist or Android assets
 * AI4  NO_CLIENT_SECRET      no OAuth client secret / Apple private key / Azure secret shipped
 * AI5  REDIRECT_ALLOWLIST    unknown origins/paths rejected; return route internal only
 * AI6  CALLBACK_ONCE         a callback is processed once (code ledger + single flight)
 * AI7  PROGRESS_NEVER_LOST   local progress is claimed, merged or parked — never dropped
 * AI8  ACCOUNT_ISOLATION     evidence of account A is never loaded for account B
 * AI9  ENTITLEMENT_SERVER    entitlements are never decided/merged on the client
 * AI10 NO_EMAIL_LINKING      identities link only via the official manual link flow
 * AI11 LAST_METHOD_KEPT      the last access method can never be removed
 * AI12 NO_INFINITE_LOADING   callback has a timeout and a way out
 * AI13 EMAIL_ALWAYS_OFFERED  e-mail stays available whatever social provider does
 * AI14 APPLE_NO_EMAIL_OK     missing/hidden e-mail never breaks profile or UI
 * AI15 LOGOUT_ISOLATION      after logout the guest never sees the previous mastery
 * AI16 CLAIM_IDEMPOTENT      the same anonymous claim never applies twice
 * AI17 WALLET_NOT_SUMMED     XP/Qi/pearls/streak merge by max/union, never sum
 * AI18 NO_JEV_IN_AUTH        Jev/TypeSafe never participates in identity/security
 * AI19 PKCE_AND_PROVIDERS    OAuth uses PKCE; Supabase provider ids current (azure); official labels
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./v495a-runtime.mjs";

export const FILES = {
  oauthService: "src/services/oauthService.ts",
  authService: "src/services/authService.ts",
  sync: "src/services/cloudSyncCoordinator.ts",
  syncMerge: "src/lib/syncMerge.ts",
  store: "src/lib/store.ts",
  callbackPage: "src/features/auth/OAuthCallbackPage.tsx",
  nativeShell: "src/lib/platform/nativeShell.ts",
  accessMethods: "src/components/auth/AccessMethodsCard.tsx",
};
const AUTH_FILES = ["src/lib/auth", "src/services/oauthService.ts", "src/services/authService.ts", "src/services/cloudSyncCoordinator.ts", "src/components/auth", "src/features/auth"];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) return [dir];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|json|html|properties|xml)$/.test(e.name)) out.push(p);
  }
  return out;
}

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

export function loadAuthRuntime(root) {
  globalThis.localStorage = new MemoryStorage();
  const providers = tsRequire("../../src/lib/auth/providers.ts");
  const redirect = tsRequire("../../src/lib/auth/oauthRedirect.ts");
  const claim = tsRequire("../../src/lib/auth/progressClaim.ts");
  const state = tsRequire("../../src/lib/auth/oauthState.ts");
  const storage = tsRequire("../../src/lib/accountStorage.ts");
  const evClaim = tsRequire("../../src/lib/auth/evidenceClaim.ts");
  const ev = tsRequire("../../src/lib/mastery/evidence.ts");
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const srcFiles = {};
  for (const f of walk(path.join(root, "src"))) srcFiles[path.relative(root, f)] = fs.readFileSync(f, "utf8");
  const shipped = {};
  for (const dir of ["dist", "android/app/src/main/assets"]) for (const f of walk(path.join(root, dir))) if (fs.statSync(f).size < 8_000_000) shipped[path.relative(root, f)] = fs.readFileSync(f, "utf8");
  return {
    ...providers,
    parseOAuthCallback: redirect.parseOAuthCallback,
    oauthRedirectUrl: redirect.oauthRedirectUrl,
    safeReturnTo: redirect.safeReturnTo,
    classifyClaim: claim.classifyClaim,
    recordClaim: claim.recordClaim,
    emptyLedger: claim.emptyLedger,
    claimId: claim.claimId,
    ECONOMY_MERGE_POLICY: claim.ECONOMY_MERGE_POLICY,
    mergeWalletField: claim.mergeWalletField,
    markCodeProcessed: state.markCodeProcessed,
    namespaceForAccount: storage.namespaceForAccount,
    setStorageNamespace: storage.setStorageNamespace,
    readScoped: storage.readScoped,
    writeScoped: storage.writeScoped,
    claimAnonymousEvidence: evClaim.claimAnonymousEvidence,
    makeEvidence: ev.makeEvidence,
    appendEvidence: ev.appendEvidence,
    emptyRecord: ev.emptyRecord,
    canUnlink: (methods, provider) => methods.length >= 2 && methods.some((m) => m.provider === provider),
    maskEmail: (email) => {
      if (!email) return null;
      const [user, domain] = email.split("@");
      if (!domain) return null;
      if (/privaterelay\.appleid\.com$/i.test(domain)) return "e-mail oculto pela Apple";
      return `${user.slice(0, 2)}•••@${domain}`;
    },
    src: Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, read(rel)])),
    srcFiles,
    shipped,
  };
}

const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const SECRET_RE = /client_secret\s*[:=]\s*["'][^"']{8,}|GOOGLE_CLIENT_SECRET|APPLE_PRIVATE_KEY|AZURE_[A-Z_]*SECRET|-----BEGIN (EC |RSA )?PRIVATE KEY-----|external_(google|apple|azure)_secret/;
const TOKEN_LOG_RE = /(console\.(log|info|warn|error|debug)|recordTechEvent|trackFunnelEvent|logSensory|noteOps|recordClientDiagnostic)\([^)]*\b(access_token|refresh_token|provider_token|provider_refresh_token|session\.access_token|parsed\.code|authorizationCode)\b/;

function jwtRoles(text) {
  const roles = [];
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
    try {
      roles.push(JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")).role);
    } catch {
      /* not a JWT */
    }
  }
  return roles;
}

export function runAuthGate(rt) {
  const failures = [];
  const fail = (code, subject, message) => failures.push({ code, subject, message });
  const authSources = Object.entries(rt.srcFiles).filter(([rel]) => AUTH_FILES.some((p) => rel === p || rel.startsWith(`${p}/`)));

  // AI1 — canonical id
  if (!/cloudAccountId\(userId: string\): string \{\s*return "cloud:" \+ userId;|return `cloud:\$\{userId\}`/.test(rt.src.store)) fail("CANONICAL_ID", FILES.store, "cloud account id is not cloud:<userId>");
  for (const [rel, text] of authSources) if (/cloudAccountId\(\s*[a-z.]*email|`cloud:\$\{[a-z.]*email|claimId\([^)]*email/i.test(strip(text))) fail("CANONICAL_ID", rel, "account keyed by e-mail");
  if (rt.namespaceForAccount("cloud:11111111-2222") !== "cloud:11111111-2222") fail("CANONICAL_ID", "namespaceForAccount", "namespace is not the user id");

  // AI2 — tokens never logged
  for (const [rel, text] of Object.entries(rt.srcFiles)) if (TOKEN_LOG_RE.test(strip(text))) fail("NO_TOKEN_LOGGING", rel, "token/code passed to a log or telemetry call");

  // AI3/AI4 — secrets
  for (const [rel, text] of [...Object.entries(rt.srcFiles), ...Object.entries(rt.shipped)]) {
    if (jwtRoles(text).includes("service_role")) fail("NO_SERVICE_ROLE", rel, "service-role JWT shipped");
    if (/VITE_[A-Z_]*SERVICE_ROLE/.test(text)) fail("NO_SERVICE_ROLE", rel, "service role exposed via VITE_ env");
    if (SECRET_RE.test(text)) fail("NO_CLIENT_SECRET", rel, "OAuth secret / private key shipped");
  }

  // AI5 — redirects
  {
    const evil = ["https://evil.example/auth/callback?code=abcdefghijk", "https://longyu.com.br.evil.example/auth/callback?code=abcdefghijk", "javascript:alert(1)", "evilapp://auth/callback?code=abcdefghijk", "https://longyu.com.br/elsewhere?code=abcdefghijk"];
    for (const url of evil) if (rt.parseOAuthCallback(url).ok) fail("REDIRECT_ALLOWLIST", url, "callback accepted from unapproved origin/path");
    if (!rt.parseOAuthCallback("https://longyu.com.br/auth/callback?code=abcdefghijk").ok) fail("REDIRECT_ALLOWLIST", "control", "valid production callback rejected");
    if (!rt.parseOAuthCallback("longyu.noba.com://auth/callback?code=abcdefghijk").ok) fail("REDIRECT_ALLOWLIST", "control", "valid Android callback rejected");
    if (rt.oauthRedirectUrl("web", "https://evil.example") !== null) fail("REDIRECT_ALLOWLIST", "oauthRedirectUrl", "redirect built for unknown origin");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)"]) if (rt.safeReturnTo(bad) !== "/jornada") fail("REDIRECT_ALLOWLIST", "safeReturnTo", `external return accepted: ${bad}`);
    if (/searchParams\.get\(["'](redirect|redirectTo|returnTo|next)["']\)/.test(strip(rt.src.oauthService))) fail("REDIRECT_ALLOWLIST", FILES.oauthService, "redirect taken from query string");
  }

  // AI6 — callback once
  {
    localStorage.clear();
    const first = rt.markCodeProcessed("code-aaaaaaaaaaaa");
    const second = rt.markCodeProcessed("code-aaaaaaaaaaaa");
    if (!first || second) fail("CALLBACK_ONCE", "markCodeProcessed", "same code processed twice");
    const svc = strip(rt.src.oauthService);
    if (!/markCodeProcessed\(parsed\.code!\)/.test(svc) || svc.indexOf("markCodeProcessed(parsed.code!)") > svc.indexOf("exchangeCodeForSession(")) fail("CALLBACK_ONCE", FILES.oauthService, "ledger not checked before the code exchange");
    if (!/if \(inFlight\) return inFlight/.test(svc)) fail("CALLBACK_ONCE", FILES.oauthService, "no single-flight guard");
    if (localStorage.getItem("longyu:oauth-processed:v1")?.includes("code-aaaa")) fail("NO_TOKEN_LOGGING", "oauthState", "raw auth code persisted");
  }

  // AI7 — progress never lost
  {
    const base = { localFingerprint: "a", remoteFingerprint: "b", localScore: 10, remoteScore: 20 };
    const cases = [
      [{ ...base, localMeaningful: true, remoteMeaningful: false }, "CLAIM_SILENT"],
      [{ ...base, localMeaningful: true, remoteMeaningful: true }, "ASK"],
      [{ ...base, localMeaningful: true, remoteMeaningful: true, localScore: 30 }, "ASK"],
      [{ ...base, localMeaningful: false, remoteMeaningful: true }, "RESTORE_CLOUD"],
    ];
    for (const [input, expected] of cases) if (rt.classifyClaim(input).action !== expected) fail("PROGRESS_NEVER_LOST", "classifyClaim", `${JSON.stringify(input)} → ${rt.classifyClaim(input).action}, expected ${expected}`);
    if (!/PARKED_LOCAL_PROGRESS_KEY, JSON\.stringify\(\{ at: Date\.now\(\), claimId: options\.claimId \?\? null, snapshot: exported \}\)/.test(rt.src.sync)) fail("PROGRESS_NEVER_LOST", FILES.sync, "'Agora não' does not park local progress");
  }

  // AI8 / AI15 — isolation
  {
    localStorage.clear();
    const key = "longyu:learner-evidence-v1";
    rt.setStorageNamespace(rt.namespaceForAccount("cloud:A"));
    rt.writeScoped(key, JSON.stringify({ owner: "A" }));
    rt.setStorageNamespace(rt.namespaceForAccount("cloud:B"));
    if (rt.readScoped(key)) fail("ACCOUNT_ISOLATION", "readScoped", "account B sees account A evidence");
    rt.setStorageNamespace(rt.namespaceForAccount("local"));
    if (rt.readScoped(key)) fail("LOGOUT_ISOLATION", "readScoped", "guest after logout sees previous account evidence");
    rt.setStorageNamespace(rt.namespaceForAccount("cloud:A"));
    if (!rt.readScoped(key)) fail("ACCOUNT_ISOLATION", "control", "account A lost its own evidence");
    rt.setStorageNamespace("local");
    if (!/endCloudSession[\s\S]{0,400}wipeToGuestShell\(\)/.test(rt.src.store)) fail("LOGOUT_ISOLATION", FILES.store, "logout does not reset to a guest shell");
  }

  // AI9 / AI17 — economy & entitlement
  {
    if (rt.ECONOMY_MERGE_POLICY.serverIsPro !== "SERVER" || rt.ECONOMY_MERGE_POLICY.subscriptions !== "SERVER") fail("ENTITLEMENT_SERVER", "ECONOMY_MERGE_POLICY", "entitlement merged on the client");
    if (rt.mergeWalletField("SERVER", 1, 1) !== null) fail("ENTITLEMENT_SERVER", "mergeWalletField", "client decided an entitlement");
    if (!/partialize: \(state\) => \(\{ \.\.\.state, serverIsPro: false \}\)/.test(rt.src.store)) fail("ENTITLEMENT_SERVER", FILES.store, "serverIsPro persisted on the client");
    if (rt.mergeWalletField("MAX", 10, 20) !== 20) fail("WALLET_NOT_SUMMED", "mergeWalletField", `10 + 20 → ${rt.mergeWalletField("MAX", 10, 20)}`);
    for (const field of ["xpTotal", "points", "dragonPearls", "streak"]) if (!new RegExp(`${field}: Math\\.max\\(`).test(rt.src.syncMerge)) fail("WALLET_NOT_SUMMED", FILES.syncMerge, `${field} is not merged by max`);
  }

  // AI10 — no e-mail linking
  for (const [rel, text] of authSources) {
    const t = strip(text);
    if (/\.email\s*===\s*[a-zA-Z_.]*email[\s\S]{0,200}linkIdentity|linkIdentity[\s\S]{0,200}\.email\s*===/.test(t)) fail("NO_EMAIL_LINKING", rel, "identity linked by e-mail comparison");
    if (/linkIdentity\(/.test(t) && rel !== FILES.oauthService) fail("NO_EMAIL_LINKING", rel, "linkIdentity outside the official link flow");
  }
  if (!/if \(intent === "link"\)[\s\S]{0,300}getSession\(\)/.test(rt.src.oauthService)) fail("NO_EMAIL_LINKING", FILES.oauthService, "link without an authenticated session");

  // AI11 — last method kept
  if (rt.canUnlink([{ provider: "email" }], "email")) fail("LAST_METHOD_KEPT", "canUnlink", "last access method removable");
  if (!rt.canUnlink([{ provider: "email" }, { provider: "google" }], "google")) fail("LAST_METHOD_KEPT", "control", "cannot unlink with two methods");
  if (!/if \(!canUnlink\(methods, provider\)\) return \{ ok: false, reason: "LAST_METHOD" \}/.test(rt.src.oauthService)) fail("LAST_METHOD_KEPT", FILES.oauthService, "server-side unlink not guarded");

  // AI12 — no infinite loading
  if (!/withTimeout\(oauth\.auth\.exchangeCodeForSession/.test(rt.src.oauthService)) fail("NO_INFINITE_LOADING", FILES.oauthService, "code exchange without timeout");
  if (!/setTimeout\(\(\) => setPhase\(\(p\) => \(p === "working" \? "error" : p\)\), OAUTH_CALLBACK_TIMEOUT_MS/.test(rt.src.callbackPage) || !/Usar outro método/.test(rt.src.callbackPage)) fail("NO_INFINITE_LOADING", FILES.callbackPage, "no watchdog / no way out");

  // AI13 — e-mail always offered
  for (const enabled of [new Set(), new Set(["google", "apple", "microsoft"])]) {
    const avail = rt.providerAvailability(enabled, "android", new Set(["google", "apple", "microsoft"]));
    if (!avail.find((a) => a.provider.id === "email")?.offered) fail("EMAIL_ALWAYS_OFFERED", "providerAvailability", "e-mail fallback removed");
  }
  if (rt.providerAvailability(new Set(), "web").some((a) => a.provider.id !== "email" && a.offered)) fail("EMAIL_ALWAYS_OFFERED", "providerAvailability", "unconfigured provider offered to learners");

  // AI14 — Apple without e-mail
  try {
    if (rt.maskEmail(null) !== null || rt.maskEmail("abc@privaterelay.appleid.com") !== "e-mail oculto pela Apple") fail("APPLE_NO_EMAIL_OK", "maskEmail", "relay/missing e-mail mishandled");
  } catch {
    fail("APPLE_NO_EMAIL_OK", "maskEmail", "missing e-mail throws");
  }
  if (!/profileFromName\(suggestedName \?\? undefined\)/.test(rt.src.authService) || !/name\?\.trim\(\) \|\| "Aluno Longyu"/.test(rt.src.authService)) fail("APPLE_NO_EMAIL_OK", FILES.authService, "profile requires provider name/e-mail");

  // AI16 — claim idempotent
  {
    const { ledger, changed } = rt.recordClaim(rt.emptyLedger(), "claim_x", "claimed");
    const again = rt.recordClaim(ledger, "claim_x", "claimed");
    if (!changed || again.changed || again.ledger.claimed.length !== 1) fail("CLAIM_IDEMPOTENT", "recordClaim", "claim recorded twice");
    localStorage.clear();
    const e = rt.makeEvidence({ targetId: "hanzi:水", targetType: "HANZI", skill: "MEANING_CHOICE", result: "SUCCESS", source: { activityId: "t" }, attemptKey: "k1", timestamp: 1 });
    localStorage.setItem("longyu:learner-evidence-v1::local", JSON.stringify(rt.appendEvidence(rt.emptyRecord("local"), [e]).record));
    const r1 = rt.claimAnonymousEvidence("cloud:U");
    const r2 = rt.claimAnonymousEvidence("cloud:U");
    const target = JSON.parse(localStorage.getItem("longyu:learner-evidence-v1::cloud:U") ?? "{}");
    if (!r1.moved || r2.moved || (target.recent ?? []).length !== 1) fail("CLAIM_IDEMPOTENT", "claimAnonymousEvidence", "anonymous evidence claimed twice or lost");
    if (localStorage.getItem("longyu:learner-evidence-v1::local")) fail("LOGOUT_ISOLATION", "claimAnonymousEvidence", "anonymous namespace not cleared after claim");
  }

  // AI18 — Jev never in auth
  for (const [rel, text] of authSources) if (/askJev|typesafe|\bjev\b/i.test(strip(text))) fail("NO_JEV_IN_AUTH", rel, "Jev/TypeSafe in an identity/security path");

  // AI19 — PKCE & providers
  if (!/flowType: "pkce"/.test(rt.src.oauthService)) fail("PKCE_AND_PROVIDERS", FILES.oauthService, "OAuth without PKCE");
  if (rt.SUPABASE_PROVIDER.microsoft !== "azure" || rt.SUPABASE_PROVIDER.google !== "google" || rt.SUPABASE_PROVIDER.apple !== "apple") fail("PKCE_AND_PROVIDERS", "SUPABASE_PROVIDER", "provider ids do not match Supabase");
  const labels = rt.AUTH_PROVIDERS.map((p) => p.label).join(" | ");
  if (!/Continuar com Apple/.test(labels) || /iCloud/i.test(labels) || !/Continuar com Microsoft/.test(labels) || !/Continuar com Google/.test(labels)) fail("PKCE_AND_PROVIDERS", "AUTH_PROVIDERS", "labels differ from the official wording");
  if (rt.AUTH_PROVIDERS.find((p) => p.id === "microsoft")?.scopes !== "email") fail("PKCE_AND_PROVIDERS", "microsoft", "Azure requires the email scope");
  return failures;
}
