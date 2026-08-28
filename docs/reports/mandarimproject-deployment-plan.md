# MandarimProject deployment plan (V4.7.7)

**Do not apply this remessa.** This is an ordered plan of what *would* change if a
human later promotes the current repo backend to MandarimProject
(`drjcfalvlbbeblmmyhwj`). Zero writes were performed.

Read-only capture: `2026-08-28T02:20:00Z`. Production watermark:
`20260810175737` `beta_experience_telemetry` (34 remote versions).

## What would change

### A. Do not replay (already represented on hosted)

REMOTE_ONLY timestamps must **not** get empty SQL files and must **not** be
re-applied:

| Remote version | Name | Class | Already in |
| --- | --- | --- | --- |
| `20260804082814` | `referrals_mvp` | C SUPERSEDED | `017_referrals.sql` |
| `20260804175935` | `turnstile_secret_vault_rpc` | A RENAMED | `019_turnstile_vault_secret.sql` |
| `20260808133923` … `20260808134010` | economy harden splits | A | `20260808130000_harden_economy_reward_trust.sql` |
| `20260808134325` | `profiles_social_columns` | A | `005_social.sql` |

LOCAL_REPLAY_ONLY files `001`–`010` reconstruct tables that production already
has under different timestamps. **Do not** run them against MandarimProject.

`012_pedagogy_consent_rpc_gate.sql` DROP VIEW is FRESH_REPLAY_ONLY for ephemeral
reset. **Do not** re-apply 012 to production.

### B. Ordered LOCAL_ONLY `NOT_YET_DEPLOYED` (schema)

Apply **in this order**, stopping at the first error. Take a backup / point-in-time
before step 1. Hold a deploy lock (no parallel schema edits).

| Order | File | Depends on | Risk | Objects |
| --- | --- | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | `submit_beta_pedagogy_event` already on prod | Low | extra event kinds |
| 2 | `20260813180000_pearl_pro_economy.sql` | `user_economy`, `entitlement_grants` | Medium | `pearl_milestone_catalog`, `user_economy.pearl_ledger`, `claim_pearl_milestone` |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | telemetry RPC | Low | extra event kinds |
| 4 | `20260825043000_business_foundation.sql` | profiles | Medium | `organizations`, `business_leads`, org helpers |
| 5 | `20260825062000_business_operational_hardening.sql` | 4 | Medium | org RLS/helpers |
| 6 | `20260826230000_placement_onboarding.sql` | profiles, user_progress | High | `placement_attempts`, `commit_placement_result` |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | 6 | High | `placement_onboarding_drafts`, locales, `save_placement_onboarding_draft` |
| 8 | `20260828013000_api_role_table_grants.sql` | tables exist | Low on hosted | mostly no-op vs platform default ALL; **must be followed by 9** |
| 9 | `20260828020000_least_privilege_api_grants.sql` | 8 (or current hosted ALL) | Medium | revoke anon table DML; tighten authenticated |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | `user_progress.client_snapshot` | Medium | `merge_progress_mastery_monotonic` BEFORE UPDATE |

Step 8 on hosted re-states `GRANT ALL` to anon/authenticated on several tables.
If 9 is skipped, production privilege surface stays wide (today's state) or
gets re-widened. **Never apply 8 without 9.**

### C. Edge Functions (after schema 6–7)

| Slug | Production now | Action |
| --- | --- | --- |
| `commit-placement` | absent | **deploy new** (`verify_jwt=true`) |
| `finalize-onboarding` | absent | **deploy new** (`verify_jwt=true`) |
| `submit-business-lead` | absent | **deploy new** (`verify_jwt=false`) |
| `create-account` | v8 ACTIVE | deploy only if source_sha256 differs; keep `verify_jwt=false` |
| `create-checkout-session` | v10 ACTIVE | no schema blocker; hash-compare before deploy |
| `create-billing-portal` | v9 ACTIVE | hash-compare |
| `stripe-webhook` | v11 ACTIVE `verify_jwt=false` | hash-compare; needs `apply_subscription_event` |
| `delete-account` | v10 ACTIVE | hash-compare |
| `issue-anon-ingestion-session` | v3 ACTIVE `verify_jwt=false` | hash-compare |

Secrets still required for public signup/payments (not set by this remessa):
`TURNSTILE_SECRET_KEY`, Stripe Test keys. Do **not** put Live keys in CI.

### D. Grant / RLS delta vs today's hosted catalog

Read-only `information_schema` on 2026-08-28:

- RLS is already **on** for every listed public table in production.
- `anon` still has ALL (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…) on
  `profiles`, `user_progress`, `user_srs`, `subscriptions`, `transactions`,
  `user_economy`. V4.7.7 **must not copy that**. Planned: no anon table privileges
  on those tables. Anonymous product uses RPCs + public Edges.
- `authenticated` still has DELETE/TRUNCATE on profiles/progress/srs/subscriptions/transactions.
  Planned: SELECT/INSERT/UPDATE on profiles/progress/srs; SELECT-only on
  subscriptions/transactions; economy writes stay RPC-only.
- Missing tables: `placement_attempts`, `placement_onboarding_drafts`,
  `business_leads`, `pearl_milestone_catalog`, `organizations`, `organization_members`.
- Missing profile columns: `country_code`, `interface_locale`, `instruction_locale`.
- Missing economy column: `pearl_ledger`.
- Missing RPCs: `commit_placement_result`, `save_placement_onboarding_draft`,
  `claim_pearl_milestone`, `merge_progress_mastery_monotonic`.

No EXTRA_PRODUCTION_OBJECT leftover was identified that the local chain does not
already reconstruct.

## Rollback

- **Migrations 1–3:** function `CREATE OR REPLACE` can be reverted with the previous
  function body from hosted; extra kinds are additive.
- **4–5:** drop org/business tables only if unused (destructive). Prefer forward-fix.
- **6–7:** drop placement tables only if no rows; otherwise keep and disable Edges.
- **8–9:** re-grant is possible but would undo least privilege — do not roll back
  to anon ALL unless a documented incident requires it.
- **10:** `DROP TRIGGER trg_progress_mastery_monotonic` + drop function. Clients
  return to last-write-wins.
- **Edges:** redeploy previous bundle versions listed above.

## Post-apply checks (when a human actually applies)

1. `supabase migration list` watermark ≥ `20260828030000`.
2. Canonical dump hash matches CI `LONGYU_BACKEND_SCHEMA_HASH` for that SHA.
3. RPC contract: `commit_placement_result`, `save_placement_onboarding_draft`.
4. Grant assert: zero anon privileges on user-owned tables.
5. Monotonicity: concurrent mastery 2 then 1 stores 2.
6. Edges: `commit-placement` / `finalize-onboarding` deployed; missing-draft = 409.

None of those checks were executed against MandarimProject in V4.7.7.
