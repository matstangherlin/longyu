# RC2.3.10B - Security advisor hardening (classification only)

Production project `drjcfalvlbbeblmmyhwj` (MandarimProject, **free plan**), advisors re-consulted 2026-10-08.
Machine-readable detail: `docs/launch/rc2-3-10b-security-advisor-classification.json`.

**Nothing was applied.** No migration, no policy, no grant change, no Auth setting. Every production read in this wave was a `SELECT` on `pg_catalog` (function definitions, grants, event triggers) and is summarised, not copied, in `docs/launch/rc2-3-10b-live-facts.json` (hashes and booleans only).

## Result at a glance

| Advisor | Level | Count | Verdict |
|---|---|---|---|
| `rls_enabled_no_policy` | INFO | 16 | 15 `DENY_ALL_INTENTIONAL`, 1 `OBSOLETE` (`_jev_triage_tmp`). No policy added. |
| `function_search_path_mutable` | WARN | 14 | 14 `PURE_HELPER` (all SECURITY INVOKER, `proconfig` NULL, pg_catalog-only bodies). Low risk; fix is a batched `ALTER FUNCTION ... SET search_path = ''` later. |
| `anon_security_definer_function_executable` | WARN | 2 | Both `PUBLIC_INTENTIONAL`: session-token gated and rate-limited. No revoke. |
| `authenticated_security_definer_function_executable` | WARN | 28 | All by design (RPC-only write model). `update_beta_feedback_admin` is `ADMIN_SAFE`. No revoke. |
| `auth_leaked_password_protection` | WARN | 1 | `OWNER_ACTION_REQUIRED` and **plan-gated (Pro)**. Not enabled. |

The 28 authenticated signatures are 27 function names plus the second `submit_beta_feedback` overload.

## 1. RLS enabled, no policy (16 tables)

Rule applied: a table that only server code touches, with RLS on and zero policies, is `DENY_ALL_INTENTIONAL`. Zero policies denies `anon`/`authenticated`; `SECURITY DEFINER` functions (owner `postgres`) and `service_role` keep access. We document it and do **not** add a policy to silence the advisor.

- `src/` never references any of the 16 tables (grep), so the learner client cannot depend on a policy.
- Every table has a named access path in the JSON (for example `beta_anon_ingestion_sessions` via `issue_beta_anon_ingestion_session` / `beta_anon_resolve_ingestion_session`; `league_xp_events` via `add_league_weekly_xp`; `reserved_usernames` via `claim_own_username`).
- A client policy on any of them would be harmful: `beta_anon_ingestion_sessions` holds token hashes, `referral_email_blocks` hashed emails, `league_xp_events` and `referral_verified_lesson_completions` are reward-forgery surfaces.
- `_jev_triage_tmp` is `OBSOLETE` (5 rows, no repo reference, left from a manual `pg_net` triage). It is tracked as `EXC-JEV-TRIAGE-TMP` in `docs/release/production-schema-exceptions.json` and needs the owner's export-then-drop decision (`OA-JEV-TMP-TABLE`). The agent does not drop it.
- Residual, separate from the advisor: `anon`/`authenticated` still hold table-level grants on most public tables (`least_privilege_api_grants` not applied). RLS is the only barrier today. That migration is `UNSAFE_UNTIL_RECONCILED` in the migration plan and stays out of scope here.

## 2. Mutable `search_path` (14 functions)

Live read: all 14 are `SECURITY INVOKER` with no `proconfig`. None reads a table in its production definition. Bodies use only pg_catalog functions and operators (`md5`, `now`, `timezone`, `to_char`, `random`, `jsonb_*`, ...), which always resolve first.

All 14 are `PURE_HELPER`: `iso_week_key`, `week_ends_at`, `economy_row_to_json`, `economy_rand01`, `economy_mission_reward`, `economy_mission_is_pro`, `economy_activity_consumes_charge`, `economy_constants`, `economy_mission_goal`, `beta_pedagogy_rate_bucket_key`, `beta_pedagogy_context_digest`, `beta_pedagogy_identity_match`, `_referral_random_code`, `sanitize_pedagogy_metadata`.

Notes worth keeping:

- `economy_row_to_json` in production is the old 006 version. The repo's `20260813180000_pearl_pro_economy.sql` redefines it with `search_path = ''` but reads `pearl_milestone_claims`, which does not exist in production. Do not apply that file to "fix" the advisor.
- `sanitize_pedagogy_metadata` is privacy-relevant (telemetry allowlist) but pure. Its production body must be diffed before any redefinition (`20260812180000_production_help_telemetry.sql` is `PRODUCTION_DEFINITION_DRIFT_UNKNOWN`).
- Proposed fix: one forward migration with `ALTER FUNCTION public.<name>(<args>) SET search_path = ''` (metadata only, reversible with `RESET search_path`), applied with the reconciled set after backup and owner approval. Do not re-run `004`, `006`, `013` or `017`; they are superseded and would overwrite newer production objects.

## 3. anon SECURITY DEFINER (2)

Both verified in production (`pg_proc`, `has_function_privilege`, body checks) and in repo SQL.

| Function | Anon gate | Rate limit | Verdict |
|---|---|---|---|
| `submit_beta_feedback` (token overload) | `anon_session_required` unless a valid `p_anon_session_token`, resolved by `beta_anon_resolve_ingestion_session` | `beta_anon_consume_ingestion_quota`: 1/min and 8/h per trusted bucket; authenticated callers use `beta_feedback_rate_limited` | `PUBLIC_INTENTIONAL` |
| `submit_beta_pedagogy_event` | same token requirement; authenticated callers need `pedagogy_analytics_consent` | 60/min and 1000/day plus per-event-type buckets for anon; per-user limits for authenticated | `PUBLIC_INTENTIONAL` |

The legacy 11-argument `submit_beta_feedback` overload (no token) is executable by `authenticated` only. Result: 2 `PUBLIC_INTENTIONAL`, 0 `REVOKE_REQUIRED`, 0 `REFACTOR_REQUIRED`. The advisor WARN is accepted and documented.

## 4. authenticated SECURITY DEFINER (28 signatures)

Live read: every signature pins `search_path` (`public` or `''`), and all 27 non-admin names bind to `auth.uid()`. `ensure_league_membership` and `sync_league_week` accept `p_user_id` but raise `not authorized` unless it equals `auth.uid()`.

Groups (no revoke; these are the client's only write path to server state):

- economy (9): `consume_charge`, `spend_qi`, `grant_lesson_reward`, `grant_story_energy`, `start_story_energy_session`, `claim_mission`, `open_chest`, `get_server_economy`, `migrate_local_economy`
- entitlement (1): `get_server_entitlement`
- league (5): `add_league_weekly_xp`, `claim_league_week_reward`, `ensure_league_membership`, `get_league_standings`, `sync_league_week`
- referral (6): `attribute_referral`, `complete_referral_lesson_session`, `ensure_referral_code`, `get_referral_dashboard`, `process_referral_pipeline`, `start_referral_lesson_session`
- identity (2): `ensure_own_profile`, `claim_own_username`
- feedback/telemetry (2 names, 3 signatures): `submit_beta_feedback`, `submit_beta_pedagogy_event`
- admin (2): `is_beta_admin`, `update_beta_feedback_admin`

**`update_beta_feedback_admin` = `ADMIN_SAFE`.** Verified in SQL: `supabase/migrations/010_beta_feedback.sql` starts the body with `if not public.is_beta_admin() then raise exception 'not_admin'`, validates the status allowlist and caps the note at 2000 characters. `is_beta_admin()` checks `beta_admins.user_id = auth.uid()` (`20260808130200_admin_roles_user_id.sql`) and anon execute is revoked (`20260808150000`). Production read: definer, `search_path = public`, anon cannot execute, body references `is_beta_admin`.

Known follow-up unrelated to the advisor: `league_memberships_select_peers` fails closed with `42P17` on direct SELECT; clients only use the league RPCs. The fix is `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` (migration plan batch A).

## 5. Leaked password protection

- **Status:** `OWNER_ACTION_REQUIRED`, disabled, **not enabled by the agent**.
- **Plan gate:** Supabase docs (Auth, password security, read through the Supabase docs search on 2026-10-08): "Leaked password protection is available on the Pro Plan and above." The project is on the free plan, so the toggle is not available. `scripts/configure-supabase-leaked-passwords.mjs` documents the same limit.
- **Dashboard path (Pro only):** Supabase Dashboard > MandarimProject > Authentication > Sign In / Providers > Email > "Prevent use of leaked passwords" (deep link `/dashboard/project/drjcfalvlbbeblmmyhwj/auth/providers?provider=Email`).
- **API alternative (Pro only):** `npm run configure:supabase-leaked-passwords -- --apply` after the organization is upgraded. It is a dry run without `--apply`.
- **Decision on free:** accept the advisor WARN as a known, plan-gated limitation. Compensating controls already in production: signup and login rate limits (`signup_rate_events`, `login_rate_events`) and Turnstile on `create-account`. Existing owner action: `OA-AUTH-RATE-LIMITS-READ`.

## Related artifacts from this wave

- `docs/release/production-schema-exceptions.json`: three single-object `PROD_ONLY` exceptions (`_jev_triage_tmp`, `rls_auto_enable`, event trigger `ensure_rls`), each pinned to a definition hash. Social, family, business, pearl and placement objects are listed under `notExceptions` as blockers.
- `docs/launch/rc2-3-10b-schema-fingerprint.json` (`npm run fingerprint:production-schema`, `-- --check` to detect drift): 125 objects (37 tables, 1 view, 87 functions), all with live definition hashes.
- `scripts/production-backup-preflight.mjs` (`npm run backup:production-preflight`): dry-run by default, never reads `.env` files, never runs a data dump.
- Client gates: `src/lib/cloud/backendCapability.ts` + `src/lib/cloud/knownMissingBackend.json`, tested by `npm run test:backend-capability`.

## What this does not close

- No advisor count changes until the owner approves and applies migrations. The three open decisions are the `_jev_triage_tmp` drop, the batched `search_path` pin, and a Pro upgrade for leaked-password protection.
- The 14-function pin and the grants revoke are not safe to apply until the migration set is reconciled (`UNSAFE_UNTIL_RECONCILED` items in `docs/launch/rc2-3-10b-migration-plan.json`) and `PRE_MIGRATION_BACKUP_REQUIRED` is satisfied.
