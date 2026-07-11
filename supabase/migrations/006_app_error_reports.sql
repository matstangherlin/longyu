-- Relatórios de erro/crash do app com deduplicação por fingerprint.

create table if not exists public.app_error_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  error_name text not null default 'Error',
  message text not null check (char_length(trim(message)) between 1 and 2000),
  stack text,
  route text not null default '',
  app_version text not null default '',
  build_sha text not null default '',
  browser text not null default '',
  viewport text not null default '',
  last_safe_action text,
  occurrence_count integer not null default 1 check (occurrence_count >= 1),
  fingerprint text not null,
  reporter_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists app_error_reports_fingerprint_uidx
  on public.app_error_reports (fingerprint);

create index if not exists app_error_reports_last_seen_idx
  on public.app_error_reports (last_seen_at desc);

create index if not exists app_error_reports_route_idx
  on public.app_error_reports (route);

alter table public.app_error_reports enable row level security;

-- Somente admin lê relatórios de erro (insert via RPC / Edge Function).
create policy "app_error_reports_select_admin"
  on public.app_error_reports
  for select
  to authenticated
  using (public.is_admin());

create or replace function public.report_app_error(
  p_error_name text,
  p_message text,
  p_stack text default null,
  p_route text default '',
  p_app_version text default '',
  p_build_sha text default '',
  p_browser text default '',
  p_viewport text default '',
  p_last_safe_action text default null,
  p_fingerprint text default '',
  p_occurrence_delta integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fingerprint text := left(trim(coalesce(p_fingerprint, '')), 128);
  v_delta integer := greatest(1, coalesce(p_occurrence_delta, 1));
  v_id uuid;
  v_reporters uuid[];
begin
  if v_fingerprint = '' then
    raise exception 'fingerprint obrigatório';
  end if;

  insert into public.app_error_reports (
    user_id,
    error_name,
    message,
    stack,
    route,
    app_version,
    build_sha,
    browser,
    viewport,
    last_safe_action,
    occurrence_count,
    fingerprint,
    reporter_ids,
    created_at,
    last_seen_at
  )
  values (
    v_uid,
    left(coalesce(nullif(trim(p_error_name), ''), 'Error'), 200),
    left(trim(p_message), 2000),
    left(p_stack, 8000),
    left(coalesce(p_route, ''), 512),
    left(coalesce(p_app_version, ''), 64),
    left(coalesce(p_build_sha, ''), 64),
    left(coalesce(p_browser, ''), 512),
    left(coalesce(p_viewport, ''), 64),
    left(p_last_safe_action, 256),
    v_delta,
    v_fingerprint,
    case when v_uid is null then '{}'::uuid[] else array[v_uid] end,
    now(),
    now()
  )
  on conflict (fingerprint) do update set
    occurrence_count = public.app_error_reports.occurrence_count + v_delta,
    last_seen_at = now(),
    user_id = coalesce(excluded.user_id, public.app_error_reports.user_id),
    error_name = excluded.error_name,
    message = excluded.message,
    stack = coalesce(excluded.stack, public.app_error_reports.stack),
    route = case when excluded.route <> '' then excluded.route else public.app_error_reports.route end,
    app_version = case when excluded.app_version <> '' then excluded.app_version else public.app_error_reports.app_version end,
    build_sha = case when excluded.build_sha <> '' then excluded.build_sha else public.app_error_reports.build_sha end,
    browser = case when excluded.browser <> '' then excluded.browser else public.app_error_reports.browser end,
    viewport = case when excluded.viewport <> '' then excluded.viewport else public.app_error_reports.viewport end,
    last_safe_action = coalesce(excluded.last_safe_action, public.app_error_reports.last_safe_action),
    reporter_ids = (
      select array(
        select distinct unnest(
          public.app_error_reports.reporter_ids
          || case when v_uid is null then '{}'::uuid[] else array[v_uid] end
        )
        limit 200
      )
    )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_app_error(
  text, text, text, text, text, text, text, text, text, text, integer
) from public;

grant execute on function public.report_app_error(
  text, text, text, text, text, text, text, text, text, text, integer
) to authenticated;
