-- Align local/ephemeral Data API grants with hosted Supabase defaults.
-- MandarimProject already has these privileges via platform default privileges
-- (read-only information_schema check 2026-08-28). Do not treat this as a
-- production schema change this remessa. Idempotent if applied later.
--
-- Local CLI applies user migrations without the hosted ALTER DEFAULT PRIVILEGES
-- on public tables, so service_role PostgREST gets 42501
-- "permission denied for table user_progress".

begin;

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Client-reachable tables that have authenticated RLS policies.
-- RLS still filters rows. Do not GRANT ALL ON ALL TABLES to authenticated:
-- that would undo economy/inventory write-closes.
grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.user_progress to anon, authenticated, service_role;
grant all on table public.user_srs to anon, authenticated, service_role;
grant all on table public.subscriptions to anon, authenticated, service_role;
grant all on table public.transactions to anon, authenticated, service_role;

do $$
begin
  if to_regclass('public.placement_attempts') is not null then
    execute 'grant all on table public.placement_attempts to anon, authenticated, service_role';
  end if;
end $$;

revoke insert, update, delete on table public.user_economy from authenticated;
revoke insert, update, delete on table public.user_chests from authenticated;
revoke insert, update, delete on table public.user_missions from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
revoke insert, update, delete on table public.economy_ledger from authenticated;

grant select on table public.user_economy to authenticated;
grant select on table public.user_chests to authenticated;
grant select on table public.user_missions to authenticated;
grant select on table public.user_achievements to authenticated;
grant select on table public.economy_ledger to authenticated;

commit;
