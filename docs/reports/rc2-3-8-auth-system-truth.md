# RC2.3.8 — Auth system truth

Canonical identity: **Supabase `auth.users.id`** (`userId`). E-mail is an attribute, never the key.
Local store accounts: `local` (anonymous) and `cloud:<uid>`.

| Flow | Web | PWA | Android | Authority | Status |
|---|---|---|---|---|---|
| E-mail + password login | yes | yes | yes | Supabase Auth (`signInWithPassword`) + `sign-in-identifier` edge | VERIFIED (existing) |
| Create account | yes | yes | yes | `create-account` edge function | VERIFIED (existing) |
| Recovery (OTP code) | yes | yes | yes | Supabase Auth OTP | VERIFIED (existing) |
| Logout | yes | yes | yes | `signOut()`; offline → `signOut({scope:"local"})` | CODE_READY (offline fallback new) |
| Delete account | yes | yes | yes | `delete-account` edge | VERIFIED (existing) |
| Google OAuth (PKCE) | code | code | code (`longyu.noba.com://auth/callback`) | Supabase provider `google` | PROVIDER_CONFIG_REQUIRED |
| Apple OAuth (PKCE) | code | code | code | Supabase provider `apple` | PROVIDER_CONFIG_REQUIRED |
| Microsoft OAuth (PKCE) | code | code | code | Supabase provider `azure` (scope `email`) | PROVIDER_CONFIG_REQUIRED |
| Callback router | `/auth/callback` | same | deep link → `/auth/callback` | `oauthService.completeOAuthCallback` (single-flight) | CODE_READY |
| Progress claim | yes | yes | yes | `cloudSyncCoordinator` + claim ledger | CODE_READY |
| Identity link / unlink | yes | yes | yes | `linkIdentity` / `unlinkIdentity` (manual linking must be enabled) | OWNER_ACTION_REQUIRED |
| Entitlements | server | server | server | `EntitlementBootstrap`; `serverIsPro` never persisted | VERIFIED (existing) |

Real project settings (read-only, `/auth/v1/settings`): email = on; google/apple/azure = off;
anonymous users = off; signup enabled; autoconfirm off. `auth.identities` contains only `email` identities.

Jev does **not** decide anything in auth (no call path from `src/lib/auth/*` or `oauthService`).
