# V4.8.9 — Production backend reconciliation and release preflight

## Decision

`BLOCKED_BEFORE_PRODUCTION_APPLY`

The production inventory and exact delta are understood, but a new logical backup and isolated restore verification are unavailable. This remessa therefore ends at `PRODUCTION_WRITE_BOUNDARY_REACHED`; it does not apply migrations, deploy Edges, change secrets/Auth settings, create users, flip production flags, or touch Stripe Live.

## Identity and base

- Base main: `02bf2f1803ffbde0e17efc00dbf3f0cde5b71163`
- V4.8.8 vehicle: PR #219, merged into that main
- Backend identity: `backend-rc-v489-preapply`
- MandarimProject: `drjcfalvlbbeblmmyhwj`
- Production read-only capture: `2026-09-01T23:48:15.668474Z`
- Production migration watermark: `20260810175737`
- Repository migrations: 48; hosted migration rows: 34; operational delta: 11
- Placement version: 2
- Product/Journey identity remains independent of backend identity

PR #208 is an old draft/operational knowledge source, not the merge vehicle: it is open, conflicting and based on stale evidence. Its useful ordering and stop rules were reconciled here; it must not be merged wholesale.

## Edge reconciliation

| Function | Hosted | `verify_jwt` | Class | Pre-apply conclusion |
| --- | ---: | --- | --- | --- |
| `create-account` | v8 | false | CORE_LAUNCH_REQUIRED | Hosted source is outdated: it completes onboarding immediately and predates the V4.8.8 locale body contract. Current repo validates/persists PT or EN locale fields, fails closed on partial profile/draft writes, and uses placement draft/handoff. Redeploy only after schema/RPC gates. |
| `commit-placement` | missing | true | CORE_LAUNCH_REQUIRED | Required after placement migrations. |
| `finalize-onboarding` | missing | true | CORE_LAUNCH_REQUIRED | Required after handoff migration. |
| `delete-account` | v10 | true | CORE_LAUNCH_REQUIRED | Reconcile source hash and regression-test deletion. |
| `issue-anon-ingestion-session` | v3 | false | CORE_LAUNCH_REQUIRED | Reconcile source hash; keep abuse controls. |
| `create-checkout-session` | v10 | true | COMMERCIAL_REQUIRED | Test Mode contract only; no Live price/secret/write. |
| `create-billing-portal` | v9 | true | COMMERCIAL_REQUIRED | Existing subscription terms must remain stable. |
| `stripe-webhook` | v11 | false | COMMERCIAL_REQUIRED | Signature verification and replay/out-of-order idempotency required. |
| `submit-business-lead` | missing | false | BUSINESS_OPTIONAL | May defer; must not block learner core. |

The generated source identities are frozen in `docs/backend/edge-contract.json`; `docs/backend/v489-backend-rc.json` binds their aggregate contract hash to this pre-apply identity. A later source/SQL change creates a different backend RC.

## Auth, placement, sync and recovery preflight

- Fresh production diagnosis: `check_and_record_signup_rate(text,text)` and `_edge_get_turnstile_secret()` exist; `save_placement_onboarding_draft` does not. Edge request logs show `create-account` v8 answering CORS preflight with 200, while `finalize-onboarding` answers 404 because it is not deployed. This narrows the current breakage to backend-version skew rather than an absent signup rate-limit RPC.
- Auth: the full local harness covers signup/confirmation/session/profile without production credentials. Hosted real-mail confirmation remains `NOT_RUN` until an approved apply and dedicated test account.
- Signup P0: `create-account` now reads `interfaceLocale`, `instructionLocale`, `nativeLanguage`, and `targetLanguage`; PT persists as `pt-BR/pt-BR/pt-BR/zh-CN`, EN persists as `en/en/en/zh-CN`, and unknown values are rejected. Country and billing market never derive these fields.
- Placement: client evidence is not authoritative; `commit_placement_result` must recalculate. Hosted tables/RPCs/Edges are currently absent.
- Sync: repository merge validation is monotonic; migrations #10–#11 add server enforcement. Hosted trigger is absent, so `HOSTED_SYNC_READY` is not promoted.
- Course/interface language: fields remain independent from country/billing market and from SRS/mastery identity.
- Recovery: password recovery and backup restore are different gates. Neither a UI path nor archive configuration proves database recoverability.
- RLS: future validation must use USER_A ≠ USER_B across profile, progress, placement, economy, subscription and org membership. Current broad grants must be narrowed by the ordered pair #8→#9 before promotion.

## Compatibility and secrets

- PostgreSQL hosted: 17.6; local chain must rehearse successfully against the supported ephemeral stack.
- Supabase CLI observed: 2.109.1. CI must use Node 22+ because current Supabase tooling no longer supports Node 20.
- Newly created Data API tables require explicit grants and RLS; table creation alone is not exposure authorization.
- `TURNSTILE_SECRET_KEY` presence was observed in Vault by name only. Stripe secret presence could not be safely enumerated; values were never read.
- Required future operator checks: Turnstile production secret, Supabase service role managed only in Edge environment, Stripe Test secret/webhook secret, allowed redirect URLs and SMTP. No secret may enter client bundles or logs.

## Advisors

Fresh read-only advisors returned no security ERROR, but did return WARN/INFO findings including mutable function `search_path`, RLS-enabled tables without policies, repeated `auth.uid()` init-plan costs and unused indexes. Zero ERROR is not equivalent to `SECURITY_READY`; all findings must be re-run after migrations and classified before apply completion.

## Scoreboard

| Gate | Status |
| --- | --- |
| `PRODUCTION_INVENTORY_READY` | `PASS` |
| `MIGRATION_DELTA_READY` | `PASS` |
| `EDGE_DELTA_READY` | `PASS` |
| `NEW_LOGICAL_BACKUP_READY` | `BLOCKED` |
| `BACKUP_RESTORE_VERIFIED` | `BLOCKED` |
| `EPHEMERAL_SCHEMA_READY` | `NOT_RUN` |
| `EPHEMERAL_RLS_READY` | `NOT_RUN` |
| `EPHEMERAL_AUTH_READY` | `NOT_RUN` |
| `EPHEMERAL_PLACEMENT_READY` | `NOT_RUN` |
| `EPHEMERAL_SYNC_READY` | `NOT_RUN` |
| `EPHEMERAL_RECOVERY_READY` | `NOT_RUN` |
| `PHYSICAL_QA_READY` | `NOT_PROMOTED` |
| `PRODUCTION_APPLY_READY` | `BLOCKED` |
| `READY_FOR_PUBLIC_BETA` | `NOT_PROMOTED` |

Ephemeral statuses are deliberately not inferred from older SHAs. CI on the exact final HEAD may promote only the ephemeral cells supported by its artifacts. It cannot promote backup, hosted, physical, payments or public-release gates.

## Future authorized rollout (not executed)

1. Obtain a new encrypted logical backup and restore it into an isolated target; verify schema and aggregate counts.
2. Re-run exact-HEAD contract/ephemeral CI and record canonical schema hash.
3. Apply the 11 migrations in order, stopping at first error and treating #8→#9 and #10→#11 as inseparable pairs.
4. Validate schema, grants, RLS and RPCs before any Edge deploy.
5. Deploy core Edges using frozen source hashes; then commercial Test Mode Edges; business lead may defer.
6. Configure/verify Auth redirect URLs and SMTP without exposing secrets.
7. Run hosted USER_A≠USER_B, real-mail Auth/Placement, cross-device sync, recovery and failure injection.
8. Run the physical checklist. A human decides release promotion.

## Immutable boundary

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`

`PHYSICAL_QA_READY = NOT_PROMOTED`

`READY_FOR_PUBLIC_BETA = NOT_PROMOTED`

`PRODUCTION_WRITE_BOUNDARY_REACHED`
