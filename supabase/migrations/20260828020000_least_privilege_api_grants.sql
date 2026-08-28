-- V4.7.7 — least privilege for Data API client roles.
-- 20260828013000 granted ALL to anon/authenticated to match hosted defaults.
-- Client roles only need the operations that RLS policies actually allow.
-- service_role keeps ALL. Economy write-closes stay revoked.
-- Anonymous product flows use RPCs + public Edges, not table DML.
-- Idempotent. Not applied to MandarimProject this remessa.

begin;

-- Own-row tables: authenticated SELECT/INSERT/UPDATE. No DELETE/TRUNCATE. No anon.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_progress from anon, authenticated;
revoke all on table public.user_srs from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_progress to authenticated;
grant select, insert, update on table public.user_srs to authenticated;

-- Billing rows are written by service_role / Stripe webhook RPCs.
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.transactions to authenticated;

do $$
begin
  if to_regclass('public.placement_attempts') is not null then
    execute 'revoke all on table public.placement_attempts from anon, authenticated';
    execute 'grant select on table public.placement_attempts to authenticated';
  end if;
  if to_regclass('public.placement_onboarding_drafts') is not null then
    execute 'revoke all on table public.placement_onboarding_drafts from anon, authenticated';
    execute 'grant all on table public.placement_onboarding_drafts to service_role';
  end if;
end $$;

revoke all on table public.user_economy from anon;
revoke insert, update, delete, truncate on table public.user_economy from authenticated;
revoke insert, update, delete, truncate on table public.user_chests from authenticated;
revoke insert, update, delete, truncate on table public.user_missions from authenticated;
revoke insert, update, delete, truncate on table public.user_achievements from authenticated;
revoke insert, update, delete, truncate on table public.economy_ledger from authenticated;
grant select on table public.user_economy to authenticated;
grant select on table public.user_chests to authenticated;
grant select on table public.user_missions to authenticated;
grant select on table public.user_achievements to authenticated;
grant select on table public.economy_ledger to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.user_progress to service_role;
grant all on table public.user_srs to service_role;
grant all on table public.subscriptions to service_role;
grant all on table public.transactions to service_role;
grant all on table public.user_economy to service_role;

commit;
