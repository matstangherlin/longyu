-- RC2.3.10 — PENDING (not applied). Apply only through PRODUCTION_MIGRATION_READY
-- (schema diff + verified export + owner approval). See
-- docs/reports/rc2-3-10-production-rls.md.
--
-- Defect (repo 004_leagues.sql and production, read 2026-10-08):
--   policy league_memberships_select_peers reads public.league_memberships inside
--   its own USING clause, so any direct SELECT by an authenticated user fails with
--   42P17 "infinite recursion detected in policy". The app is not affected today
--   (it reads leagues only through SECURITY DEFINER RPCs), but the policy is broken
--   and fails closed.
--
-- Fix: resolve "my tier + my week" through a narrow helper that returns only the
-- caller's own row. SECURITY DEFINER is needed to read the table without
-- re-entering the policy; it is scoped to auth.uid(), has an empty search_path
-- and is not executable by anon.
--
-- Down: drop policy league_memberships_select_peers; recreate the 004 version;
--       drop function public.league_viewer_scope();

create or replace function public.league_viewer_scope()
returns table (tier_id text, week_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.league_tier_id, m.current_week_key
  from public.league_memberships m
  where m.user_id = (select auth.uid());
$$;

revoke all on function public.league_viewer_scope() from public, anon;
grant execute on function public.league_viewer_scope() to authenticated;

drop policy if exists "league_memberships_select_peers" on public.league_memberships;
create policy "league_memberships_select_peers"
  on public.league_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.league_viewer_scope() s
      where s.tier_id = league_memberships.league_tier_id
        and s.week_key = league_memberships.current_week_key
    )
  );
