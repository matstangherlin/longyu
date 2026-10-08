# RC2.3.10B - Review of `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` (Prompt 13)

**Verdict: technically sound. Recommend approving it as the first controlled migration (`OA-LEAGUE-POLICY-FIX`), with two optional refinements and one behaviour change the owner should accept knowingly.** Nothing was applied: the file is unchanged, and production was only read (catalog `SELECT`s).

Not rehearsed on a live Postgres: there is no local Postgres or Docker in this environment and the Supabase ephemeral rehearsal needs both. The review rests on the file text, the live catalog facts below and Postgres RLS semantics. Before approval the file should run once in `npm run rehearse:ephemeral` (or any throwaway Postgres) against the 004 schema.

## The defect (confirmed live)

Production policy `league_memberships_select_peers` (read 2026-10-08, `docs/launch/rc2-3-10b-schema-column-extract.json`, `SELECT` for `authenticated`) has two sub-selects `FROM league_memberships league_memberships_1 WHERE user_id = auth.uid()` inside its own `USING`. Any direct read of the table by an `authenticated` user re-enters the policy: `42P17 infinite recursion detected in policy`. It fails closed. The client never reads the table directly (`src/services/leagueService.ts` uses only `get_league_standings`, `sync_league_week`, `add_league_weekly_xp`, `claim_league_week_reward`), so learners are not affected today. Column-diff finding: `POLICY_SELF_REFERENCE_IN_PRODUCTION`.

## What the file does

1. `create or replace function public.league_viewer_scope() returns table (tier_id text, week_key text)`: `language sql`, `stable`, `security definer`, `set search_path = ''`, body `select m.league_tier_id, m.current_week_key from public.league_memberships m where m.user_id = (select auth.uid())`.
2. `revoke all on function ... from public, anon; grant execute ... to authenticated;`
3. `drop policy if exists ...; create policy ... for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.league_viewer_scope() s where s.tier_id = league_memberships.league_tier_id and s.week_key = league_memberships.current_week_key))`.

## SECURITY DEFINER helper evaluation

| Point | Assessment |
|---|---|
| Why DEFINER is required | The helper must read the table without re-running the policy. A definer function runs with the owner's rights; the table owner bypasses RLS unless `FORCE ROW LEVEL SECURITY` is set. Live: owner `postgres`, `rolbypassrls = true`, `relforcerowsecurity = false`. So the helper reads the row directly and the policy no longer references its own table: no recursion. |
| Owner at apply time | The function is owned by the role that runs the migration. It must be `postgres` (or another role with BYPASSRLS or table ownership). Run it through the controlled apply as `postgres`; do not run it as `anon`/`authenticated`/`service_role`. |
| Scope of what it returns | At most one row (`user_id` is the primary key), only the caller's own `league_tier_id` and `current_week_key`. `auth.uid()` null returns zero rows. The caller already sees that row through the first branch of the policy, so the helper discloses nothing new. |
| `search_path` | `set search_path = ''` and every reference is schema-qualified (`public.league_memberships`, `auth.uid()`). `text` resolves from `pg_catalog`. This is the strictest option and matches the repo gate `checkSearchPath`. Production has no definer function without a search_path (`production.definerWithoutSearchPath` is empty in the column diff). |
| Inlining | A `SECURITY DEFINER` SQL function with `SET` clauses is not inlined by the planner, so the definer context holds inside the policy. |
| API surface | `league_viewer_scope` becomes callable at `/rest/v1/rpc/league_viewer_scope` for `authenticated`. It returns the caller's own data only. Optional hardening: put it in a non-exposed schema (e.g. `private`) with `USAGE` for `authenticated`; not required for safety. |
| Volatility | `stable` is correct (one snapshot per statement, no writes). |

## EXECUTE grants

Production defaults (read): default ACL for functions created by `postgres` in `public` grants only `postgres` and `service_role`; `anon` and `authenticated` are not in it (earlier hardening). PostgreSQL's built-in `PUBLIC` execute default still applies to new functions, which is exactly what the file's `revoke all ... from public, anon` removes.

| Role | After the migration | Needed? |
|---|---|---|
| `PUBLIC` | none (revoked) | no |
| `anon` | none (revoked) | no: the policy is `TO authenticated`, so it is never evaluated for `anon` |
| `authenticated` | EXECUTE (granted) | yes: functions in a policy expression run with the caller's privileges |
| `service_role` | EXECUTE (default ACL) | harmless: it bypasses RLS and never evaluates the policy |

Matches the repo gate `checkPublicExecute` (a definer function must revoke from `public`) and the production pattern (`authenticated` + `service_role`, no `PUBLIC`).

## Recursion risk after the change

- The helper references `league_memberships` but runs as a definer owner that bypasses RLS, so the policy is not re-entered. No other policy on the table exists (production has exactly one), so there is no cross-policy cycle.
- Other definer functions that touch the table (`sync_league_week`, `get_league_standings`, `finalize_*`, `recalculate_league_ranks`) are unaffected: they already bypass RLS as `postgres`.
- The repo gate `checkLeaguePolicy` looks at the final `create policy` for `from league_memberships`: the new text has `from public.league_viewer_scope()`, so it passes.
- Risk that remains: if the function were ever created by a role without BYPASSRLS/ownership, the helper would be subject to the policy and recursion would return (`42P17`). Verify after apply (below).

## Behaviour change to accept

Today the broken policy makes every direct read fail. After the fix a direct `select` returns the caller's row plus the rows of same tier and same week, with all table columns (`user_id`, `weekly_xp`, `rank_position`, flags, timestamps), through PostgREST, not only through the RPC. That set is a strict subset of what `get_league_standings` already returns to the same users (`user_id`, `display_name`, `weekly_xp`, `rank`, `streak`, `is_pro`), so no new class of data is exposed. It is still a change from "denied" to "allowed", and `anon` and `authenticated` keep broad table privileges (column-diff `BROAD_ANON_TABLE_PRIVILEGES_IN_PRODUCTION`) until the least-privilege grant migrations land.

If direct peer reads are not wanted at all, the smaller alternative is to replace the policy with own-row only (`using (user_id = (select auth.uid()))`) and drop the helper: no definer function, no new surface, standings stay RPC-only. The client does not need the peer branch. The owner should choose; the file as written implements the original product intent (peers visible).

## Optional refinements (non-blocking, untested here)

1. Evaluate the helper once per statement: `(league_tier_id, current_week_key) in (select tier_id, week_key from public.league_viewer_scope())` is uncorrelated, so Postgres can evaluate it once; the current `exists (... where s.tier_id = league_memberships.league_tier_id ...)` is correlated and re-scans the function per candidate row. Cohorts are small, so this is performance only.
2. Wrap the file in `begin; ... commit;` (or confirm the apply tool does). Without it there is a window between `drop policy` and `create policy` where even own-row reads are denied (fail closed, short).

## Down / rollback

The file's own "Down" is: drop the new policy, recreate the 004 policy, drop the helper. That returns production to the broken recursive state. The safer rollback is: drop the new policy, create an own-row-only policy, then drop the helper.

## Verification after a future approved apply (read-only SQL)

- `pg_policies` for `league_memberships`: one `SELECT` policy; `qual` mentions `league_viewer_scope` and no `FROM ... league_memberships`.
- `pg_proc` for `league_viewer_scope`: `prosecdef = true`, `proconfig` contains `search_path=""`, owner `postgres`; `has_function_privilege` is true for `authenticated` and `service_role`, false for `anon` and for PUBLIC.
- With a seeded QA user (never a learner): direct `select` on `league_memberships` returns own row and same-cohort rows with no `42P17`; a QA user in another tier sees none of them. This is the `account_isolation_basic` step of the cloud smoke.
- Re-run `docs/launch/rc2-3-10b-schema-column-extract.json` capture and `npm run schema:column-diff`; `POLICY_SELF_REFERENCE_IN_PRODUCTION` and `FUNCTION_MISSING_IN_PRODUCTION:league_viewer_scope` must disappear and nothing new may appear.

## Preconditions before it is applied

`PRODUCTION_MIGRATION_READY` (candidate SHA, schema diff no older than 7 days, ledger, verified backup, this review, a down script, owner approval). The backup is required because the order of migrations matters: this file is the safe first step; it changes no data and no columns.
