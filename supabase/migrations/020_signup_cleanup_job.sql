-- Log + agenda semanal (dry-run) da limpeza de cadastros não confirmados.
-- A exclusão real continua manual/explícita (p_dry_run=false).

create table if not exists public.signup_cleanup_runs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  dry_run boolean not null,
  eligible integer not null default 0,
  deleted integer not null default 0,
  details jsonb not null default '{}'::jsonb
);

alter table public.signup_cleanup_runs enable row level security;
-- Sem policies para authenticated/anon: só service_role.

create or replace function public.run_signup_cleanup_job(
  p_dry_run boolean default true,
  p_older_than interval default interval '14 days',
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.admin_cleanup_unconfirmed_signups(p_older_than, p_dry_run, p_limit);

  insert into public.signup_cleanup_runs (dry_run, eligible, deleted, details)
  values (
    coalesce((v_result->>'dry_run')::boolean, p_dry_run),
    coalesce((v_result->>'eligible')::int, 0),
    coalesce((v_result->>'deleted')::int, 0),
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.run_signup_cleanup_job(boolean, interval, integer) from public;
grant execute on function public.run_signup_cleanup_job(boolean, interval, integer) to service_role;

comment on function public.run_signup_cleanup_job(boolean, interval, integer) is
  'Executa cleanup de signups não confirmados e grava em signup_cleanup_runs. Default dry-run.';

-- pg_cron (se disponível): dry-run semanal domingo 06:00 UTC.
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron indisponível neste projeto: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'longyu-signup-cleanup-dry-run';

    perform cron.schedule(
      'longyu-signup-cleanup-dry-run',
      '0 6 * * 0',
      $cron$ select public.run_signup_cleanup_job(true, interval '14 days', 100); $cron$
    );
  end if;
exception when others then
  raise notice 'Não foi possível agendar cron de cleanup: %', sqlerrm;
end $$;
