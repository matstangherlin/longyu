-- Down for supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql
-- Prefer the safer rollback (own-row only). Recreating the 004 recursive
-- policy returns production to 42P17 on direct authenticated SELECT.

-- Safer rollback (recommended):
drop policy if exists "league_memberships_select_peers" on public.league_memberships;
create policy "league_memberships_select_peers"
  on public.league_memberships for select to authenticated
  using (user_id = (select auth.uid()));
drop function if exists public.league_viewer_scope();

-- Legacy 004 recreation (NOT recommended — reintroduces recursion):
-- drop policy if exists "league_memberships_select_peers" on public.league_memberships;
-- create policy "league_memberships_select_peers"
--   on public.league_memberships for select to authenticated
--   using (
--     user_id = auth.uid()
--     or (
--       league_tier_id = (select league_tier_id from public.league_memberships where user_id = auth.uid())
--       and current_week_key = (select current_week_key from public.league_memberships where user_id = auth.uid())
--     )
--   );
-- drop function if exists public.league_viewer_scope();
