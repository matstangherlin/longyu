# RC2.3.8 — Security

| Control | Evidence | Status |
|---|---|---|
| No OAuth client secret / service_role in client | secret scan of `src`, `dist`, `android/app/src/main/assets` (gate) | PASS |
| PKCE for all social providers | `oauthService` dedicated client | PASS (code) |
| Redirect allowlist | `oauthRedirectUrl` / `parseOAuthCallback` | PASS (mutation-tested) |
| Open redirect | `safeReturnTo` + E2E crafted URL | PASS |
| Code replay | processed-code ledger (hashed) + single flight | PASS (mutation-tested) |
| Entitlements | server-only; `serverIsPro` not persisted | PASS |
| Last method protection | `canUnlink` ≥ 2 | PASS (mutation-tested) |
| Error copy | no OAuthException/PKCE/HTTP/Supabase in learner copy | PASS (gate + E2E) |
| Telemetry | category/provider/stage/safe code only — no email, token, code | PASS |
| Jev in auth | none | PASS |
| Provider secrets in Supabase dashboard | owner | OWNER_ACTION_REQUIRED |
