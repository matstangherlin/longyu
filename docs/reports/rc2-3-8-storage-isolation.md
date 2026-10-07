# RC2.3.8 — Storage isolation

Namespaces: `local` (anonymous) and `cloud:<uid>`; keys stored as `${base}::${ns}` (`src/lib/accountStorage.ts`).
Bound to the store's `currentAccountId` in `main.tsx` before the native shell starts.

| Key | Class | Scoped |
|---|---|---|
| `longyu-v1` (zustand) | progress, per-account map | already per account |
| `longyu:learner-evidence-v1` | learner evidence | yes |
| speech evidence | learner evidence | yes |
| Hànzì writing evidence | learner evidence | yes |
| `longyu:progress-claims:v1` | claim ledger (ids only) | device |
| `longyu:parked-local-progress:v1` | parked anonymous progress | device |
| `longyu:oauth-pending:v1` / `longyu:oauth-processed:v1` | transient auth (hashes, TTL) | device |
| `longyu:oauth-pkce*` | PKCE verifier (Supabase) | device, cleared after exchange |
| preferences / telemetry consent | device | device |

Migration: legacy unscoped evidence moves once into the active namespace (`longyu:account-storage-legacy-moved-v1`).
Logout / switch account: namespace switches; account A's evidence is not readable as B (gate AI multi-account check).
