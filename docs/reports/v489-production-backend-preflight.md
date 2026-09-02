# V4.8.9 — Production backend reconciliation and release preflight

## Decision

`BLOCKED_BEFORE_PRODUCTION_APPLY`

The production delta is understood, but there is no fresh logical backup or isolated restore verification. The currently deployed backend is also incompatible with the current signup/onboarding frontend. This remessa therefore stops at `PRODUCTION_WRITE_BOUNDARY_REACHED`; it does not apply migrations, deploy Edges, change secrets/Auth settings, create hosted users, flip production flags, alter entitlements, or touch Stripe Live.

## Identity and refreshed read-only state

- Base main: `02bf2f1803ffbde0e17efc00dbf3f0cde5b71163`
- V4.8.8 vehicle: PR #219, merged into that main
- Backend identity: `backend-rc-v489-preapply`
- MandarimProject: `drjcfalvlbbeblmmyhwj`, `ACTIVE_HEALTHY`
- Read-only refresh recorded at: `2026-09-02T09:18:43.053Z`
- Production migration watermark: `20260810175737`
- Repository migrations: 48; hosted migration rows: 34; operational delta: 11
- Placement version: 2

The refresh confirmed the same hosted migration watermark and the same six deployed Edge Functions. No hosted mutation was used to obtain this state. Product/Journey identity remains independent from the backend RC.

PR #208 remains an open, conflicting draft based on an older base. It is only a source of operational knowledge; it must not be merged or treated as current evidence. Closure as `SUPERSEDED_BY_V489` may be recommended only after PR #220 is green on its final HEAD.

## Exact pending migration chain

| # | Migration | Risk | Dependency / stop rule |
| ---: | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | R1_ADDITIVE_SAFE | Validate telemetry enum/function before continuing. |
| 2 | `20260813180000_pearl_pro_economy.sql` | R3_AUTH_CRITICAL | Economy/RPC change; verify grants, ledger and idempotency. |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | R1_ADDITIVE_SAFE | Validate telemetry contract. |
| 4 | `20260825043000_business_foundation.sql` | R2_BEHAVIOR_CHANGE | Creates organization surfaces and RLS. |
| 5 | `20260825062000_business_operational_hardening.sql` | R2_BEHAVIOR_CHANGE | Must immediately follow #4; validates member/admin isolation. |
| 6 | `20260826230000_placement_onboarding.sql` | R3_AUTH_CRITICAL | Placement tables and server authority. |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | R3_AUTH_CRITICAL | Must precede current `create-account` and `finalize-onboarding`. |
| 8 | `20260828013000_api_role_table_grants.sql` | R3_AUTH_CRITICAL | Temporary grant surface; never stop between #8 and #9. |
| 9 | `20260828020000_least_privilege_api_grants.sql` | R3_AUTH_CRITICAL | Inseparable from #8; closes anon/excess authenticated grants. |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | R4_DATA_RISK | Never stop between #10 and #11. Human approval required. |
| 11 | `20260828032249_progress_mastery_monotonic_clamp.sql` | R4_DATA_RISK | Inseparable from #10; clamps malformed mastery safely. |

The computed object/risk/rollback inventory is in `docs/reports/v489-production-migration-delta.md`. Nothing in this report authorizes applying the chain.

## Edge reconciliation

| Function | Hosted | Target class | Dependency / conclusion |
| --- | ---: | --- | --- |
| `create-account` | v8 | CORE_LAUNCH_REQUIRED | Outdated and incompatible with the V4.8.8 locale/onboarding body. Target source requires migrations #6–#7. |
| `commit-placement` | missing | CORE_LAUNCH_REQUIRED | Deploy only after #6–#7 and server-side placement RPC validation. |
| `finalize-onboarding` | missing | CORE_LAUNCH_REQUIRED | Deploy only after #6–#7; must remain idempotent. |
| `delete-account` | v10 | CORE_LAUNCH_REQUIRED | Reconcile frozen source hash and deletion regression. |
| `issue-anon-ingestion-session` | v3 | CORE_LAUNCH_REQUIRED | Reconcile frozen source hash; preserve abuse controls. |
| `create-checkout-session` | v10 | COMMERCIAL_REQUIRED | Stripe Test contract only; no Live action. |
| `create-billing-portal` | v9 | COMMERCIAL_REQUIRED | Existing subscription terms remain stable. |
| `stripe-webhook` | v11 | COMMERCIAL_REQUIRED | Signature, replay and out-of-order idempotency required. |
| `submit-business-lead` | missing | BUSINESS_OPTIONAL | May defer; not a learner-core dependency. |

Repo source identities are frozen in `docs/backend/edge-contract.json`. A source or SQL change creates a different backend RC.

### Hosted signup failure evidence (read-only)

The Supabase production snapshot for `create-account` is version 8. Its `OPTIONS` response allows only `authorization, x-client-info, apikey, content-type`, while the current frontend sends the operational headers `x-longyu-correlation-id`, `x-longyu-session-id` and `x-longyu-op`. The browser therefore rejects the preflight as a CORS mismatch and never sends the signup `POST`; the frontend can only observe `Failed to fetch`.

The same deployed source predates the current onboarding contract: it does not consume the locale/placement fields, forces `onboarding_completed=true` and `native_language/interface_locale/instruction_locale=pt-BR`, and cannot persist the current placement draft. A read-only schema check also found `check_and_record_signup_rate` present, but `save_placement_onboarding_draft`, `commit_placement_result`, the placement tables and the new profile locale columns absent.

This is not repaired by weakening the client or silently falling back to the old Edge: that would allow an account to be created with the wrong locale and without server-authoritative placement. The safe fix is a coordinated production migration plus deployment of the frozen current `create-account`, `commit-placement` and `finalize-onboarding` sources after the backup gates below are approved. No such production mutation was executed in this remessa.

## Ephemeral contract added to the final-HEAD gate

`scripts/rehearse-backend-contract.mjs` now produces two V4.8.9 exact-run artifacts:

- `docs/reports/v489-ephemeral-scoreboard.json`
- `docs/reports/v489-production-backend-preflight.ci.md`

The final GitHub `backend-contract` job is authoritative for the ephemeral cells. The suite is production-credential-free and fails if its URL/target resolves to MandarimProject. It covers:

- full migration replay plus a second `migration up --local` that must be a safe no-op;
- least-privilege grants and RLS A≠B for profile, progress, placement, subscription and economy;
- Org A≠Org B, learner versus owner/admin, invite/entitlement privacy and service-role-only paths;
- signup/confirmation/profile, logout/login and refresh token;
- password-recovery email in local Inbucket, valid recovery link, invalid token, expired token, password change and offline→online reconnect;
- all four supported independent `interface_locale`/`instruction_locale` combinations, with country deliberately varied;
- persisted Auth metadata and `profiles` locale fields, `onboarding_completed=false`, and placement draft creation;
- finalize-onboarding success, replay and concurrent idempotency with exactly one attempt and consumed draft;
- Device A→B→A progress/mastery/SRS/mistake propagation, monotonic conflicts, malformed mastery clamping and concurrent economy reward idempotency;
- course-language switching without changing progress, mastery, SRS, mistakes or unlock identity.

No older-SHA PASS is promoted here. Until the new exact-run artifact exists, these cells remain `NOT_RUN` in the committed pre-run scoreboard below.

## Frontend × backend compatibility matrix

| Feature | Current old backend | Target backend | Classification |
| --- | --- | --- | --- |
| Landing / static Journey shell | Loads | Loads | BACKWARD_COMPATIBLE |
| Existing-user login | Existing Auth path can work | Same plus current profile contract | BACKWARD_COMPATIBLE_WITH_HOSTED_SMOKE |
| New signup | v8 ignores the new locale contract and lacks the required draft RPC | Persists independent PT/EN fields and draft | BREAKS |
| Placement handoff | Required hosted table/RPC absent | Server-authoritative draft and attempt | BREAKS |
| `/finalizar-cadastro` | `finalize-onboarding` is not deployed | Idempotent finalize Edge | BREAKS |
| Journey / Review local state | Continues locally | Continues; cloud state preserved | BACKWARD_COMPATIBLE |
| Cloud sync/mastery | Hosted monotonic trigger absent | Server monotonic merge/clamp | FAIL_CLOSED_FOR_PROMOTION |
| Course-language persistence | Frontend selection can be lost/misclassified by v8 | Independent locale fields | BREAKS |
| Pro page | Static commercial chrome loads | Test Mode contract only | BACKWARD_COMPATIBLE; PAYMENTS NOT PROMOTED |
| Business form | Optional Edge absent | Optional target Edge | FAIL_CLOSED / NON-CORE |

Therefore `FRONTEND_OLD_BACKEND_COMPATIBLE = FAIL`. Rollout must be coordinated; frontend success messaging must not mask backend failure.

## Secrets matrix (names/status only)

| Function / surface | Secret/context | Required | Ephemeral | Production preflight |
| --- | --- | --- | --- | --- |
| all Edges | `SUPABASE_URL` | yes | local only | platform-managed; value never read |
| privileged Edges | `SUPABASE_SERVICE_ROLE_KEY` | yes | local only | platform-managed; value never read |
| public client/Edge auth | anon/publishable key | yes | local only | public config; coherence requires hosted smoke |
| `create-account` | `TURNSTILE_SECRET_KEY` or Vault RPC | yes, fail-closed | explicit skip only in ephemeral CI | Vault lookup RPC exists; secret value not read |
| commercial Edges | Stripe Test secret | required for payment validation | placeholder/no charge | presence/value not promoted |
| `stripe-webhook` | Stripe Test webhook secret | required | not a Live secret | not promoted |
| `submit-business-lead` | lead webhook when enabled | optional | not required for core | unknown / may defer |

No secret value is printed or committed.

## Future rollout order (documented, not executed)

1. Produce a fresh encrypted logical backup outside Git and restore it into an isolated non-production target; verify schema and aggregate counts.
2. Freeze the exact main/backend RC/Edge hashes and confirm all exact-HEAD CI/Security artifacts.
3. Enter a coordinated maintenance window with one migration operator and a stop-on-first-error log.
4. Apply migrations #1–#7 in order, validating objects, policies, RPCs and aggregate invariants after every file.
5. Apply #8→#9 without an intermediate release/smoke window; immediately verify Data API grants and full RLS matrix.
6. Obtain explicit human approval for R4, then apply #10→#11 without stopping between them; verify monotonic/clamp behavior and counts.
7. Deploy the frozen core Edges in dependency order: `create-account`, `commit-placement`, `finalize-onboarding`, then reconcile `delete-account` and `issue-anon-ingestion-session`.
8. Configure/check Auth redirects, SMTP and Turnstile without exposing values; run hosted signup/confirmation/placement/finalize smoke with dedicated accounts.
9. Deploy Business optional and commercial Test Mode Edges only if their independent gates are approved. Stripe Live remains forbidden.
10. Run hosted RLS A≠B, cross-device sync, recovery/failure injection and the physical-device checklist. A human decides release promotion.

## Rollback and stop rules

- Stop immediately on any migration error, unexpected lock, count regression, RLS exposure or Edge 5xx spike.
- Additive migrations are not automatically down-migrated. Prefer forward repair after the operator assesses the exact partial state.
- Never leave #8 without #9 or #10 without #11. If either second file cannot apply, keep traffic/feature activation stopped and escalate to the restore/forward-repair decision.
- Edge regressions can be contained by redeploying the previously recorded Edge version only when its schema remains backward compatible.
- Auth/onboarding can be held fail-closed or behind maintenance messaging; never synthesize client success.
- Use database restore only for verified data corruption or an unrecoverable partial apply, and only from the newly verified backup.
- Existing subscription provider price/currency/terms are never rewritten as rollback behavior.

## Post-apply observability contract

Use correlation/session IDs without PII for `signup`, `placement`, `finalize`, lesson completion/sync, checkout and webhook. The operator must watch:

- Auth success/failure and confirmation/recovery delivery;
- Edge 4xx by code and 5xx by slug/version;
- placement draft creation, attempt count and finalize replay;
- sync merge/clamp conflicts and progress-count regressions;
- RLS denial anomalies and any A≠B test failure;
- economy/reward duplication indicators;
- Business lead submission only if enabled;
- subscription entitlement and webhook replay/out-of-order results in Test Mode.

Logs must never contain passwords, tokens, CAPTCHA payloads, raw placement answers, private study data or secret values.

## Backup gate

The Supabase CLI is available, but no approved access token/database password and no isolated restore target were available. No dump was produced. Configuration flags and an old backup record do not prove a current restorable backup.

| Gate | Status | Required human action |
| --- | --- | --- |
| `NEW_LOGICAL_BACKUP` | `BLOCKED` | Provide an approved least-privilege dump path or operator-generated encrypted dump outside Git. |
| `BACKUP_VERIFIED` | `BLOCKED` | Restore the fresh artifact into an isolated target and verify schema/hash/aggregate counts. |
| `PRODUCTION_APPLY_READY` | `BLOCKED` | Cannot be promoted while either backup gate is blocked. |

## Committed pre-run scoreboard

Valid values are only `PASS`, `FAIL`, `BLOCKED`, and `NOT_RUN`. Exact-run ephemeral promotions are emitted by CI and cannot promote backup, hosted, physical, payment or public-release gates.

| Gate | Status |
| --- | --- |
| `MAIN_BASE_CURRENT` | `PASS` |
| `BACKEND_RC_CURRENT` | `PASS` |
| `PRODUCTION_DELTA_COMPUTED` | `PASS` |
| `PRODUCTION_SCHEMA_SNAPSHOT` | `PASS` |
| `NEW_LOGICAL_BACKUP` | `BLOCKED` |
| `BACKUP_VERIFIED` | `BLOCKED` |
| `MIGRATION_REHEARSAL` | `NOT_RUN` |
| `EDGE_CONTRACT` | `NOT_RUN` |
| `RLS_A_NOT_B` | `NOT_RUN` |
| `AUTH_EPHEMERAL` | `NOT_RUN` |
| `PLACEMENT_EPHEMERAL` | `NOT_RUN` |
| `FINALIZE_ONBOARDING_EPHEMERAL` | `NOT_RUN` |
| `SYNC_EPHEMERAL` | `NOT_RUN` |
| `RECOVERY_EPHEMERAL` | `NOT_RUN` |
| `COURSE_LANGUAGE_BACKEND_COMPATIBLE` | `NOT_RUN` |
| `FRONTEND_OLD_BACKEND_COMPATIBLE` | `FAIL` |
| `ROLLOUT_ORDER_READY` | `PASS` |
| `ROLLBACK_PLAN_READY` | `PASS` |
| `OBSERVABILITY_READY` | `PASS` |
| `CI_HEAD_READY` | `NOT_RUN` |
| `SECURITY_HEAD_READY` | `NOT_RUN` |
| `PHYSICAL_DEVICE_READY` | `NOT_RUN` |
| `PRODUCTION_APPLY_READY` | `BLOCKED` |

## Immutable boundary

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`

`PHYSICAL_QA_READY = NOT_PROMOTED`

`READY_FOR_PUBLIC_BETA = NOT_PROMOTED`

`PRODUCTION_WRITE_BOUNDARY_REACHED`
