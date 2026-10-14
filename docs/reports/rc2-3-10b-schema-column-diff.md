# RC2.3.10B - Column-level schema diff (Prompt 7)

Evidence: `docs/launch/rc2-3-10b-schema-column-diff.json` (79 findings), built from `docs/launch/rc2-3-10b-schema-column-extract.json` (production catalog, read 2026-10-08, project `drjcfalvlbbeblmmyhwj`). Re-run: `npm run schema:column-diff`; verify: `npm run validate:rc2-3-10b-column-diff` and `npm run test:rc2-3-10b-column-diff`.

**Verdict: `BLOCKED`.** This does not make `PRODUCTION_SCHEMA_TRUTH_PASS` true. It closes the "column-level diff not run" gap listed in `rc2-3-10b-closure.md`; the gate still needs the function-body diff, the owner-approved runbook and `PRODUCTION_MIGRATION_READY`.

## How it was produced

- Production: `SELECT`s on `pg_catalog` only, through Supabase MCP, project `drjcfalvlbbeblmmyhwj`. Columns, constraints, indexes, policies, function attribute flags (security mode, `search_path`, volatility, who may EXECUTE) and privilege flags. No row data, no function bodies, no vault or secret values. Counts match the committed fingerprint: 37 tables, 1 view, 87 function names.
- Repo: `supabase/migrations` (53 files) then `supabase/pending` (3) replayed statement by statement into the schema the repo describes (55 tables, 125 functions, 41 policies).
- Each repo file carries its reconciliation status from `rc2-3-10b-migration-reconciliation.json`. Most absent objects come from `REPO_ONLY_NOT_APPLIED` files; two notes matter:
  - `20260808070849_secure_social_profile_boundary.sql` is `MATCH_EXACT` with its production history row, yet `search_public_profiles`, `get_public_profile_by_username` and `get_public_profiles_by_ids` do not exist. They are created inside a `DO` block guarded by `to_regclass('public.user_follows') is not null`; the guard was false in production, so the recorded run was a no-op for them. Findings carry that caveat.
  - `005_social.sql` is only `PARTIAL_EQUIVALENT` (the `profiles` columns chunk); the social tables were never applied.

## Shared tables: column drift

36 tables exist on both sides; 298 shared columns compared (type, nullability, default presence). **33 tables match column for column; there is no type drift and no nullability drift anywhere.** The drift is all "repo expects more than production has":

| Table | Missing in production | Introduced by |
|---|---|---|
| `profiles` | `onboarding_version`, `learning_goal`, `declared_experience`, `placement_attempt_id`, `placement_completed_at`, `local_migrated_at`, `interface_locale`, `instruction_locale`, `country_code`; FK `placement_attempt_id -> placement_attempts` | `20260826230000_placement_onboarding.sql`, `20260827023000_placement_onboarding_handoff.sql` (repo only) |
| `user_economy` | `pearl_ledger`, `pearl_pro_expires_at`, `pearl_pro_last_activated_at`, `pearl_pro_auto_activate` | `20260813180000_pearl_pro_economy.sql` (repo only) |
| `league_memberships` | none; the policy is recursive (below) | `004_leagues.sql` and production |

Nothing exists only in production at column level (`COLUMN_ONLY_IN_PRODUCTION` = 0), so production has no hidden hot-fix columns on shared tables. One constraint note: `profiles_username_format_v2` is `NOT VALID` (new writes checked, old rows not).

## What matters for the client

| Finding | Why it matters |
|---|---|
| **Client reads/writes `profiles.instruction_locale`; production has no such column** (new; `CLIENT_COLUMN_MISSING_IN_PRODUCTION`) | `src/services/courseDirectionSync.ts` does `update({instruction_locale, native_language, updated_at})` and `select("instruction_locale")` for signed-in users. By code reading both fail soft (the update error is ignored, the select returns `null`), so the course direction is not restored from the account and each call returns an HTTP 400. This is not in the earlier call graph, which does not look at columns. |
| `commit_placement_result/13`, `save_placement_onboarding_draft/6`, table `placement_onboarding_drafts` | `CRITICAL`: dependencies of `commit-placement`, `create-account` and `finalize-onboarding` (sign-up/onboarding path). Same set as `docs/launch/rc2-3-10b-edge-parity.json`; redeploying those functions before the migrations breaks sign-up. |
| `user_follows`, `social_activity_events`, `search_public_profiles`, `get_public_profile*` | `HIGH`, client-called; the client is gated by `VITE_BACKEND_*_ENABLED` and fails soft. |
| `business_leads`, `business_funnel_events`, 2 rate-limit functions | `HIGH` through `submit-business-lead` (Edge path is not gated by the flags). |
| Family (3 tables, 6 RPCs), business (organization tables and RPCs), pearl (3 tables, 2 RPCs) | gated client modules; absent objects are expected while the modules are off. |
| `league_memberships_select_peers` | recursive policy in production (`POLICY_SELF_REFERENCE_IN_PRODUCTION`); see `rc2-3-10b-league-policy-review.md`. |

19 tables are expected by the repo and absent in production (2 of them reached directly by the client, 3 through Edge Function dependencies). 37 functions are missing; one function exists only in production (`rls_auto_enable`, the event-trigger helper). One table exists only in production: the scratch table `_jev_triage_tmp` (`OA-JEV-TMP-TABLE`).

## Security attributes (production)

- 71 SECURITY DEFINER functions (overloads counted); **every one has a function-level `search_path`** (none unset); **no function grants EXECUTE to PUBLIC**; `anon` can execute exactly two (`submit_beta_feedback/12`, `submit_beta_pedagogy_event/10`), both intentional and backed by repo grants.
- RLS is on for all 37 tables; 16 have no policy (deny-all for client roles).
- **`anon` holds full table privileges (DELETE, INSERT, UPDATE, TRUNCATE...) on 31 of 37 tables**; RLS is the only guard. The least-privilege grant migrations are repo-only (`20260828013000_api_role_table_grants.sql`, `20260828020000_least_privilege_api_grants.sql`).
- `get_server_entitlement/0`: production `search_path = public`; the latest repo version (`20260914210000_family_entitlement.sql`, not applied) sets `''`. Expected until that file is applied.

## Economy RPCs (19 checked)

| Result | Functions |
|---|---|
| Attributes match the repo (definer/invoker mode and `search_path`). Production EXECUTE: client RPCs `authenticated` + `service_role`; internal helpers (`economy_ensure_row`, `economy_insert_ledger`, `economy_ledger_exists`, `economy_user_is_pro`, `economy_verified_mission_metric`, `league_xp_server_amount`) `service_role` only; none for `anon` or PUBLIC | `get_server_economy`, `consume_charge`, `spend_qi`, `grant_lesson_reward`, `grant_story_energy`, `start_story_energy_session`, `claim_mission`, `open_chest`, `migrate_local_economy`, `add_league_weekly_xp`, `claim_league_week_reward`, `economy_ensure_row`, `economy_insert_ledger`, `economy_ledger_exists`, `economy_user_is_pro`, `economy_verified_mission_metric`, `league_xp_server_amount` (17) |
| Absent in production | `activate_pearl_pro_pass`, `claim_pearl_milestone` (pearl module not applied) |

**Attribute match is not "hardened".** `claim_mission`, `grant_story_energy` and `grant_lesson_reward` are `HOTFIX_NOT_BACKPORTED` (`rc2-3-10b-prod-only-classification.json`): their live bodies are not any repo definition, and the older history bodies trusted client values. Function bodies were deliberately not read here; the economy stays unproven until a reviewed `pg_get_functiondef` diff exists (`DIFF_FIRST`). Each row in `economyRpcs` carries that caveat.

## Limits

Text-based replay (dynamic SQL is not expanded except literal anon grant arrays); CHECK constraints compared by name; defaults by presence only; view columns not compared; client columns only where the `.from(...)` payload is a literal (one unresolved: `telemetryConsent.ts` `update(patch)`). All listed in the JSON under `limits`.
