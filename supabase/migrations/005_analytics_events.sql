-- Eventos de produto do beta (sem respostas privadas).

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text not null,
  event_name text not null,
  route text not null default '',
  lesson_id text,
  step_type text,
  metadata jsonb not null default '{}',
  app_version text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_anon_created_idx
  on public.analytics_events (anonymous_id, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.analytics_events enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create policy "analytics_events_select_admin"
  on public.analytics_events
  for select
  to authenticated
  using (public.is_admin());

create or replace function public.ingest_analytics_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event jsonb;
  v_count integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'events deve ser um array JSON';
  end if;

  for v_event in select value from jsonb_array_elements(p_events) loop
    insert into public.analytics_events (
      anonymous_id,
      user_id,
      session_id,
      event_name,
      route,
      lesson_id,
      step_type,
      metadata,
      app_version
    )
    values (
      left(coalesce(v_event->>'anonymous_id', ''), 64),
      case when v_uid is null then null else v_uid end,
      left(coalesce(v_event->>'session_id', ''), 64),
      left(coalesce(v_event->>'event_name', ''), 64),
      left(coalesce(v_event->>'route', ''), 512),
      nullif(left(coalesce(v_event->>'lesson_id', ''), 128), ''),
      nullif(left(coalesce(v_event->>'step_type', ''), 64), ''),
      coalesce(v_event->'metadata', '{}'::jsonb),
      left(coalesce(v_event->>'app_version', ''), 32)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.ingest_analytics_events(jsonb) from public;
grant execute on function public.ingest_analytics_events(jsonb) to authenticated, anon;

-- Funil: landing → onboarding
create or replace view public.analytics_funnel_activation as
select
  count(*) filter (where event_name = 'landing_viewed') as landing_views,
  count(distinct anonymous_id) filter (where event_name = 'landing_viewed') as landing_users,
  count(distinct anonymous_id) filter (where event_name = 'get_started_clicked') as get_started_users,
  count(distinct anonymous_id) filter (where event_name = 'onboarding_started') as onboarding_started_users,
  count(distinct anonymous_id) filter (where event_name = 'onboarding_completed') as onboarding_completed_users,
  count(distinct anonymous_id) filter (where event_name = 'first_lesson_started') as first_lesson_started_users,
  count(distinct anonymous_id) filter (where event_name = 'first_lesson_completed') as first_lesson_completed_users
from public.analytics_events
where created_at >= now() - interval '30 days';

-- Abandono por etapa (lesson_abandoned)
create or replace view public.analytics_lesson_abandonment as
select
  coalesce(metadata->>'step_index', 'unknown') as step_index,
  coalesce(step_type, metadata->>'step_type', 'unknown') as step_type,
  count(*) as abandon_count
from public.analytics_events
where event_name = 'lesson_abandoned'
  and created_at >= now() - interval '30 days'
group by 1, 2
order by abandon_count desc;

-- Erros por tipo de exercício
create or replace view public.analytics_step_mistakes as
select
  coalesce(metadata->>'task_type', step_type, 'unknown') as task_type,
  coalesce(metadata->>'skill', 'unknown') as skill,
  count(*) as mistake_count
from public.analytics_events
where event_name = 'step_mistake'
  and created_at >= now() - interval '30 days'
group by 1, 2
order by mistake_count desc;

-- Retenção D1 / D7 (por anonymous_id)
create or replace view public.analytics_retention_d1_d7 as
with first_seen as (
  select anonymous_id, min(created_at::date) as cohort_day
  from public.analytics_events
  group by anonymous_id
),
activity as (
  select e.anonymous_id, e.created_at::date as active_day
  from public.analytics_events e
  group by e.anonymous_id, e.created_at::date
)
select
  f.cohort_day,
  count(distinct f.anonymous_id) as cohort_size,
  count(distinct case when a.active_day = f.cohort_day + 1 then f.anonymous_id end) as retained_d1,
  count(distinct case when a.active_day = f.cohort_day + 7 then f.anonymous_id end) as retained_d7
from first_seen f
left join activity a on a.anonymous_id = f.anonymous_id
where f.cohort_day >= current_date - interval '60 days'
group by f.cohort_day
order by f.cohort_day desc;

-- Funil Pro
create or replace view public.analytics_pro_funnel as
select
  count(distinct anonymous_id) filter (where event_name = 'pro_offer_shown') as offer_shown,
  count(distinct anonymous_id) filter (where event_name = 'pro_offer_clicked') as offer_clicked,
  count(distinct anonymous_id) filter (where event_name = 'checkout_started') as checkout_started,
  count(distinct anonymous_id) filter (where event_name = 'trial_started') as trial_started,
  count(distinct anonymous_id) filter (where event_name = 'subscription_activated') as subscription_activated
from public.analytics_events
where created_at >= now() - interval '30 days';

create or replace function public.get_beta_analytics_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'funnel', (select to_jsonb(f) from public.analytics_funnel_activation f),
    'lesson_abandonment', coalesce(
      (select jsonb_agg(to_jsonb(t)) from (select * from public.analytics_lesson_abandonment limit 20) t),
      '[]'::jsonb
    ),
    'step_mistakes', coalesce(
      (select jsonb_agg(to_jsonb(t)) from (select * from public.analytics_step_mistakes limit 20) t),
      '[]'::jsonb
    ),
    'retention', coalesce(
      (select jsonb_agg(to_jsonb(t)) from (select * from public.analytics_retention_d1_d7 limit 30) t),
      '[]'::jsonb
    ),
    'pro_funnel', (select to_jsonb(p) from public.analytics_pro_funnel p),
    'stories_completed', (
      select count(*) from public.analytics_events
      where event_name = 'story_completed' and created_at >= now() - interval '30 days'
    ),
    'charge_exhausted_users', (
      select count(distinct anonymous_id) from public.analytics_events
      where event_name = 'charge_exhausted' and created_at >= now() - interval '30 days'
    ),
    'reviews_completed', (
      select count(*) from public.analytics_events
      where event_name = 'review_completed' and created_at >= now() - interval '30 days'
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_beta_analytics_dashboard() from public;
grant execute on function public.get_beta_analytics_dashboard() to authenticated;
