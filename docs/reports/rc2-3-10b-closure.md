# RC2.3.10B - Production reconciliation closure (draft)

`cloud.certification` = `BLOCKED`. This wave reconciles what production runs against what the repo claims. It does **not** certify the cloud, applied nothing, deployed nothing and wrote nothing to production. `docs/release/rc2-3-10-cloud-matrix.json` is unchanged: 1 gate `PASS`, 30 not.

## What is proven (PASS = evidence in the repo, not a cloud gate)

| Item | Result | Evidence |
|---|---|---|
| Semantic migration reconciliation | 63 entries: 19 `MATCH_EXACT`, 3 `MATCH_SEMANTIC`, 7 `PARTIAL_EQUIVALENT`, 34 `UNKNOWN`. Names never count as evidence. | `docs/launch/rc2-3-10b-migration-reconciliation.json`, `docs/reports/rc2-3-10b-migration-forensics.md` |
| Client to backend call graph | 70 calls; 45 present, 17 missing on production paths, 8 auth (unresolvable by design). | `docs/launch/rc2-3-10b-client-backend-call-graph.json` |
| Minimum safe migration set (advisory) | 4 files, 2 Edge Functions, dependency order, 0 cycles. Nothing applied. | `docs/launch/rc2-3-10b-migration-plan.json` |
| Security advisor classification | 16 deny-all intentional (1 obsolete), 14 pure helpers, 2 public-intentional, 28 by design, 1 owner/plan-gated. | `docs/launch/rc2-3-10b-security-advisor-classification.json` |
| Client fails soft where production lacks a backend | social, family, business, pearl gated by `VITE_BACKEND_*_ENABLED`. | `src/lib/cloud/backendCapability.ts`, `npm run test:backend-capability` |
| Schema fingerprint | 125 objects (37 tables, 1 view, 87 functions). | `docs/launch/rc2-3-10b-schema-fingerprint.json` |
| Backup preflight | Dry-run by default, schema-only, destination outside the repo. | `scripts/production-backup-preflight.mjs` |
| `PROD_ONLY` rows | 6 classified: 3 `HOTFIX_NOT_BACKPORTED`, 2 `SPLIT_CHUNK_OF_REPO_FILE`, 1 `LEGIT_LEGACY`. | `docs/launch/rc2-3-10b-prod-only-classification.json` |
| Edge Function parity | 11 classified: 3 `DEPLOYED_STALE`, 1 `DEPLOYED_STALE_WAIT_MIGRATION`, 4 `DEPLOYED_UNKNOWN_DIFF`, 3 `MISSING_WAIT_MIGRATION`, 0 current. | `docs/launch/rc2-3-10b-edge-parity.json` |
| Stripe TEST audit | Server authority, ownership, allowlist, signature, ordering hold in code; 10 findings, none live-key related. | `docs/reports/rc2-3-10b-stripe-test-hardening.md` |
| Gitleaks | Root cause = two synthetic fixtures; no bypass, no wildcard allowlist. | `docs/reports/rc2-3-10b-gitleaks-root-cause.md` |
| Mutation gate | `npm run gate:rc2-3-10b`: 45 requested mutation classes plus closure honesty, every mutation killed (see the test output for the count). | `scripts/rc2-3-10b-certification.mjs` |

## What is still not PASS

| Cloud gate | Status | Why |
|---|---|---|
| `MIGRATION_HISTORY_PASS` | `BLOCKED` | 34 `UNKNOWN` + 7 `PARTIAL_EQUIVALENT`; 3 history rows are placeholders (real SQL applied outside history). |
| `PRODUCTION_SCHEMA_TRUTH_PASS` | `BLOCKED` | 17 client-called objects absent in production; column-level diff not run. |
| `PRODUCTION_RLS_PASS` | `BLOCKED` | Isolation proven; `league_memberships` policy recursion (42P17) and broad table grants remain. |
| `EDGE_FUNCTIONS_PASS` | `BLOCKED` | 3 absent, 1 diverged (`create-account`), 3 stale, 4 unproven. |
| `ISSUE_273_RESOLUTION_READY` | `BLOCKED` | Backup, schema diff and migration blockers remain. |
| `BACKUP_EXPORT_PASS`, `TELEMETRY_RETENTION_PASS`, `JEV_SERVER_TRIAGE_PASS`, `DATA_PRIVACY_PASS`, `RATE_LIMIT_PASS`, `TURNSTILE_PASS`, `FREE_TIER_BUDGET_PASS`, `RESEND_DOMAIN_PASS`, `PRODUCTION_WEB_SHA_IDENTIFIED`, `OWNER_CLOUD_ACCEPTANCE` | `OWNER_ACTION_REQUIRED` | Need the owner (see `docs/release/OWNER_NEXT_ACTIONS.md`). |
| `SUPABASE_SMTP_PASS`, `AUTH_GOOGLE_PASS`, `AUTH_APPLE_PASS`, `AUTH_MICROSOFT_PASS`, `SENTRY_PASS` | `CONFIG_REQUIRED` | Provider dashboards. |
| `PARENT_HOSTED_TRUTH_PASS`, `WEBKIT_CROSS_ENGINE_PASS`, `ANDROID_OAUTH_PASS`, `SECURITY_HEADERS_PASS`, `ROLLBACK_PASS`, `CLOUD_SMOKE_PASS`, `ANDROID_BUILD_PASS`, `APK_PASS` | `NOT_RUN` | Hosted runs and physical tests. |
| `APK_PROVENANCE_PASS`, `WEB_PASS` | `CODE_READY` | Need the hosted build of this head. |
| `JEV_LEARNER_RUNTIME_DISABLED` | `PASS` | Only PASS in the matrix. |

## Risks found in this wave (not fixed here)

1. `HOTFIX_NOT_BACKPORTED`: production history carries older `claim_mission`, `grant_story_energy` and `grant_lesson_reward` bodies that trust client values (`p_metric_value`, `p_stars`). The repo's anti-cheat bodies may or may not be what runs live; later history rows are placeholders. Needs a `pg_get_functiondef` diff before anyone calls the economy hardened.
2. `.github/workflows/apply-beta-feedback.yml` (manual, `environment: production`) runs `db:apply-api`, which replays every file in `supabase/migrations/` against production. `deploy-leagues.yml` replays `004_leagues.sql`. Both would overwrite newer production definitions. Not changed here; the gate only proves nothing triggers them automatically.
3. `scripts/configure-supabase-auth.mjs` overwrites the Auth redirect allowlist and omits the Android callback.
4. `create-account` in production differs from the repo; redeploying it before the placement migrations breaks sign-up.
5. Stripe webhook swallows RPC errors (200 without retry). Held for RC2.3.11.
6. Account e-mail is still stored in 12 progress snapshots (`OA-PRIVACY-SNAPSHOT-EMAIL`).

## Not done on purpose

No migration applied, no Edge Function deployed, no Auth/SMTP/Stripe setting changed, no history repair, no `_jev_triage_tmp` drop, no live Stripe object, no real learner touched.
