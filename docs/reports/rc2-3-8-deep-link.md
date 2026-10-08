# RC2.3.8 — Deep link contract

| Platform | Redirect URL |
|---|---|
| Web/PWA production | `https://<LONGYU_WEB_HOST>/auth/callback` |
| Web dev | `http://localhost:5173/auth/callback`, `http://127.0.0.1:4173/auth/callback` |
| Android | `longyu.noba.com://auth/callback` (manifest intent-filter, custom scheme) |

- Allowlist: `oauthRedirectUrl` returns `null` for unknown origins → provider start refused.
- `parseOAuthCallback` rejects UNKNOWN_ORIGIN / WRONG_PATH / MALFORMED; code validated by regex.
- Return route: `safeReturnTo` accepts internal paths only, rejects `/auth`, `/login`, `/comecar`, absolute or
  protocol-relative URLs. Query params like `next=`/`redirectTo=` are ignored (E2E: stays on origin).
- PKCE: dedicated client (`flowType:"pkce"`, `storageKey:"longyu:oauth-pkce"`, `detectSessionInUrl:false`).
- Cold start: `getLaunchUrl` → `setNativeCallbackUrl` → navigate `/auth/callback`.
  Warm start: `appUrlOpen` → same path.
- Double callback: single-flight `inFlight` + processed-code ledger (hashes only) → `auth_callback_duplicate`.
- Cancel: `error=access_denied` → "Acesso cancelado." + "Tentar novamente" / "Usar outro método".
- Browser back from callback: SmartBack parent `/login`.
- Loading truth: exchange timeout 20 s + watchdog; never stuck on "Entrando…".
