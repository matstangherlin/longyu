-- RC2.3.10 — PENDING (not applied). Telemetry retention, dry-run first.
-- Apply only through PRODUCTION_MIGRATION_READY. Decision still open:
-- OA-TELEMETRY-RETENTION-DECISION (recommended: 30 days raw + daily aggregates).
-- See docs/reports/rc2-3-10-free-tier-budget.md (Retention section).
--
-- What it does:
--   * telemetry_retention_runs: one row per run (observability), no client access.
--   * run_telemetry_retention(p_retain_days, p_dry_run):
--       - dry run: only COUNTS raw beta_pedagogy_events older than the cutoff;
--       - real run: calls the existing cleanup_beta_pedagogy_events(), which first
--         aggregates into beta_pedagogy_daily_metrics, then deletes only rows with
--         created_at < cutoff (explicit temporal predicate), plus expired anon
--         sessions/quota counters as it already does.
--   * cron: weekly, DRY RUN, 30 days. Switching to a real run is a separate,
--     owner-approved statement (see Down/Enable notes).
--
-- Enable (after approval):
--   select cron.alter_job((select jobid from cron.job where jobname = 'longyu-telemetry-retention'),
--     command := $$select public.run_telemetry_retention(30, false)$$);
-- Down:
--   select cron.unschedule('longyu-telemetry-retention');
--   drop function public.run_telemetry_retention(integer, boolean);
--   drop table public.telemetry_retention_runs;

create table if not exists public.telemetry_retention_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  retain_days integer not null check (retain_days between 7 and 365),
  dry_run boolean not null,
  cutoff timestamptz not null,
  raw_rows_older_than_cutoff bigint not null,
  deleted_raw_rows bigint not null default 0
);
alter table public.telemetry_retention_runs enable row level security;
revoke all on public.telemetry_retention_runs from anon, authenticated;

create or replace function public.run_telemetry_retention(p_retain_days integer default 30, p_dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(7, least(coalesce(p_retain_days, 30), 365));
  v_cutoff timestamptz := now() - make_interval(days => v_days);
  v_older bigint;
  v_deleted bigint := 0;
begin
  select count(*) into v_older from public.beta_pedagogy_events where created_at < v_cutoff;
  if not p_dry_run then
    v_deleted := public.cleanup_beta_pedagogy_events(v_days);
  end if;
  insert into public.telemetry_retention_runs (retain_days, dry_run, cutoff, raw_rows_older_than_cutoff, deleted_raw_rows)
  values (v_days, p_dry_run, v_cutoff, v_older, v_deleted);
  return jsonb_build_object('retainDays', v_days, 'dryRun', p_dry_run, 'cutoff', v_cutoff, 'olderThanCutoff', v_older, 'deleted', v_deleted);
end;
$$;

revoke all on function public.run_telemetry_retention(integer, boolean) from public, anon, authenticated;

select cron.schedule(
  'longyu-telemetry-retention',
  '17 5 * * 1',
  $$select public.run_telemetry_retention(30, true)$$
);
