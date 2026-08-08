-- Fecha self-award residual: Qi de lição, energia de história e XP de liga
-- deixam de aceitar métricas/amount inventados pelo cliente.

begin;

-- ---------------------------------------------------------------------------
-- Catálogo de histórias elegíveis a energia (só free; premium já bloqueado)
-- ---------------------------------------------------------------------------

create table if not exists public.economy_eligible_stories (
  story_id text primary key,
  enabled boolean not null default true,
  min_seconds integer not null default 60
    check (min_seconds >= 30 and min_seconds <= 600),
  constraint economy_eligible_story_id_check check (
    story_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(story_id) between 3 and 64
  )
);

alter table public.economy_eligible_stories enable row level security;
revoke all on table public.economy_eligible_stories from public, anon, authenticated;

insert into public.economy_eligible_stories (story_id, min_seconds) values
  ('primeiro-encontro', 60),
  ('pedindo-agua', 60),
  ('sala-de-aula', 75),
  ('despedida-amigos', 60)
on conflict (story_id) do update
set enabled = true, min_seconds = excluded.min_seconds;

create table if not exists public.economy_story_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id text not null references public.economy_eligible_stories(story_id),
  started_at timestamptz not null default now(),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint economy_story_session_window_check check (
    not_before > started_at
    and expires_at > not_before
    and (completed_at is null or completed_at >= not_before)
  )
);

create unique index if not exists economy_story_sessions_active_uidx
  on public.economy_story_sessions (user_id, story_id)
  where completed_at is null;

create index if not exists economy_story_sessions_user_started_idx
  on public.economy_story_sessions (user_id, started_at desc);

alter table public.economy_story_sessions enable row level security;
revoke all on table public.economy_story_sessions from public, anon, authenticated;

create or replace function public.start_story_energy_session(p_story_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story text := left(trim(coalesce(p_story_id, '')), 64);
  v_min integer;
  v_existing public.economy_story_sessions%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_story = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_story');
  end if;

  select s.min_seconds into v_min
  from public.economy_eligible_stories s
  where s.story_id = v_story and s.enabled;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_story');
  end if;

  -- Limpa sessões expiradas não concluídas deste par.
  delete from public.economy_story_sessions session
  where session.user_id = v_uid
    and session.story_id = v_story
    and session.completed_at is null
    and session.expires_at <= now();

  select session.* into v_existing
  from public.economy_story_sessions session
  where session.user_id = v_uid
    and session.story_id = v_story
    and session.completed_at is null
  order by session.started_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'session_id', v_existing.id,
      'not_before', v_existing.not_before,
      'expires_at', v_existing.expires_at
    );
  end if;

  insert into public.economy_story_sessions (
    user_id, story_id, not_before, expires_at
  ) values (
    v_uid, v_story, now() + make_interval(secs => v_min), now() + interval '4 hours'
  )
  returning * into v_existing;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_existing.id,
    'not_before', v_existing.not_before,
    'expires_at', v_existing.expires_at
  );
end;
$$;

revoke all on function public.start_story_energy_session(text) from public;
grant execute on function public.start_story_energy_session(text) to authenticated;

-- ---------------------------------------------------------------------------
-- grant_lesson_reward: exige attestação server-side; ignora stars/no_skip
-- ---------------------------------------------------------------------------

create or replace function public.grant_lesson_reward(
  p_lesson_id text,
  p_attempt_id text,
  p_stars integer default 3,
  p_no_skip boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_key text;
  v_qi integer := 0;
  v_is_pro boolean;
  v_lesson text := left(trim(coalesce(p_lesson_id, '')), 64);
  v_attempt text := left(trim(coalesce(p_attempt_id, '')), 64);
  v_verified boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_lesson = '' or v_attempt = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;
  if length(v_attempt) < 8 then
    raise exception 'attempt_id inválido';
  end if;

  -- p_stars / p_no_skip são ignorados de propósito (anti-cheat).

  if to_regclass('public.referral_eligible_lessons') is not null
     and not exists (
       select 1
       from public.referral_eligible_lessons lesson
       where lesson.lesson_id = v_lesson and lesson.enabled
     ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_lesson');
  end if;

  -- Evidência: conclusão verificada OU sessão de referral já fechada nesta lição.
  if to_regclass('public.referral_verified_lesson_completions') is not null then
    select exists (
      select 1
      from public.referral_verified_lesson_completions completion
      where completion.user_id = v_uid and completion.lesson_id = v_lesson
    ) into v_verified;
  end if;

  if not v_verified and to_regclass('public.referral_lesson_sessions') is not null then
    select exists (
      select 1
      from public.referral_lesson_sessions session
      where session.user_id = v_uid
        and session.lesson_id = v_lesson
        and session.completed_at is not null
    ) into v_verified;
  end if;

  if not v_verified then
    return jsonb_build_object('ok', false, 'error', 'attestation_required');
  end if;

  v_key := left('lesson-reward:' || v_lesson, 128);
  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row),
      'rewards', '[]'::jsonb
    );
  end if;

  -- Pacote fixo de conclusão attestada (não depende do cliente).
  v_qi := (public.economy_constants()->>'lesson_three_star_qi')::integer
       + (public.economy_constants()->>'lesson_no_skip_qi')::integer;
  if v_is_pro then
    v_qi := v_qi + (public.economy_constants()->>'pro_lesson_qi_bonus')::integer;
  end if;

  update public.user_economy
  set qi = qi + v_qi, updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'grant_lesson_reward', v_qi, 'qi', v_lesson, v_key,
    jsonb_build_object(
      'lesson_id', v_lesson,
      'attempt_id', v_attempt,
      'stars', 3,
      'no_skip', true,
      'once_per_lesson', true,
      'client_metrics_ignored', true,
      'server_attested', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'economy', public.economy_row_to_json(v_row),
    'rewards', jsonb_build_array(jsonb_build_object('type', 'qi', 'amount', v_qi))
  );
end;
$$;

revoke all on function public.grant_lesson_reward(text, text, integer, boolean) from public;
grant execute on function public.grant_lesson_reward(text, text, integer, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- grant_story_energy: catálogo + sessão com tempo mínimo
-- ---------------------------------------------------------------------------

create or replace function public.grant_story_energy(
  p_story_id text,
  p_day_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_day text := left(trim(coalesce(p_day_key, to_char((timezone('utc', now()))::date, 'YYYY-MM-DD'))), 16);
  v_story text := left(trim(coalesce(p_story_id, '')), 64);
  v_key text;
  v_cap integer := (public.economy_constants()->>'story_energy_daily_cap')::integer;
  v_granted_today integer;
  v_premium jsonb := public.economy_constants()->'premium_story_ids';
  v_session public.economy_story_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_story = '' then raise exception 'story_id obrigatório'; end if;
  if not public.economy_period_key_acceptable('daily', v_day) then
    return jsonb_build_object('ok', false, 'error', 'invalid_day_key', 'granted', false);
  end if;

  if v_premium ? v_story then
    return jsonb_build_object('ok', false, 'error', 'premium_story', 'granted', false);
  end if;

  if not exists (
    select 1 from public.economy_eligible_stories s
    where s.story_id = v_story and s.enabled
  ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_story', 'granted', false);
  end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_user_is_pro(v_uid) then
    return jsonb_build_object('ok', true, 'granted', false, 'reason', 'pro', 'economy', public.economy_row_to_json(v_row));
  end if;

  select session.* into v_session
  from public.economy_story_sessions session
  where session.user_id = v_uid
    and session.story_id = v_story
    and session.completed_at is null
  order by session.started_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'attestation_required', 'granted', false);
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'session_expired', 'granted', false);
  end if;
  if v_session.not_before > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_soon',
      'granted', false,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_session.not_before - now())))::integer)
    );
  end if;

  v_key := left('story-energy:' || v_day || ':' || v_story, 128);

  if public.economy_ledger_exists(v_uid, v_key) then
    update public.economy_story_sessions
    set completed_at = coalesce(completed_at, now())
    where id = v_session.id;
    return jsonb_build_object('ok', true, 'already_applied', true, 'granted', false, 'reason', 'claimed', 'economy', public.economy_row_to_json(v_row));
  end if;

  select count(*)::integer into v_granted_today
  from public.economy_ledger
  where user_id = v_uid
    and operation = 'grant_story_energy'
    and metadata->>'day_key' = v_day;

  if v_granted_today >= v_cap then
    return jsonb_build_object('ok', false, 'granted', false, 'reason', 'limit', 'economy', public.economy_row_to_json(v_row));
  end if;

  update public.user_economy
  set
    max_charges = max_charges + 1,
    current_charges = current_charges + 1,
    bonus_claims = bonus_claims || jsonb_build_object(v_key, true),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  update public.economy_story_sessions
  set completed_at = now()
  where id = v_session.id;

  perform public.economy_insert_ledger(
    v_uid, 'grant_story_energy', 1, 'charge', v_story, v_key,
    jsonb_build_object(
      'story_id', v_story,
      'day_key', v_day,
      'server_attested', true,
      'session_id', v_session.id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'granted', true,
    'reason', 'granted',
    'granted_today', v_granted_today + 1,
    'cap', v_cap,
    'economy', public.economy_row_to_json(v_row)
  );
end;
$$;

revoke all on function public.grant_story_energy(text, text) from public;
grant execute on function public.grant_story_energy(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- add_league_weekly_xp: amount e elegibilidade decididos no servidor
-- ---------------------------------------------------------------------------

create or replace function public.league_xp_server_amount(p_source_key text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_source text := trim(coalesce(p_source_key, ''));
  v_lesson text;
  v_story text;
  v_scope text;
  v_mission text;
  v_period text;
  v_parts text[];
begin
  if v_uid is null then
    return 0;
  end if;
  if not public.league_source_key_acceptable(v_source) then
    return 0;
  end if;

  if v_source like 'lesson:%' then
    v_lesson := split_part(v_source, ':', 2);
    if v_lesson = '' then
      return 0;
    end if;
    if to_regclass('public.referral_verified_lesson_completions') is not null
       and exists (
         select 1 from public.referral_verified_lesson_completions c
         where c.user_id = v_uid and c.lesson_id = v_lesson
       ) then
      return 15; -- LESSON_BASE_XP + THREE_STAR bonus
    end if;
    return 0;
  end if;

  if v_source like 'story:%' then
    v_story := split_part(v_source, ':', 2);
    if v_story = '' then
      return 0;
    end if;
    if not exists (
      select 1 from public.economy_eligible_stories s
      where s.story_id = v_story and s.enabled
    ) then
      return 0;
    end if;
    -- Energia já grantada, ou sessão madura (passou not_before) nesta história.
    if exists (
      select 1 from public.economy_ledger l
      where l.user_id = v_uid
        and l.operation = 'grant_story_energy'
        and l.source_id = v_story
    ) or exists (
      select 1 from public.economy_story_sessions session
      where session.user_id = v_uid
        and session.story_id = v_story
        and session.not_before <= now()
        and (session.completed_at is not null or session.expires_at > now())
    ) then
      return 18;
    end if;
    return 0;
  end if;

  if v_source like 'mission:%' then
    v_parts := string_to_array(v_source, ':');
    if coalesce(array_length(v_parts, 1), 0) < 4 then
      return 0;
    end if;
    v_scope := v_parts[2];
    v_mission := v_parts[3];
    v_period := array_to_string(v_parts[4:array_length(v_parts, 1)], ':');
    if exists (
      select 1 from public.user_missions m
      where m.user_id = v_uid
        and m.scope = v_scope
        and m.mission_id = v_mission
        and m.period_key = v_period
        and m.claimed
    ) then
      return 25;
    end if;
    return 0;
  end if;

  if v_source like 'immersion:%' then
    -- Requer rastro de atividade no dia (carga consumida / Pro trail).
    if exists (
      select 1 from public.economy_ledger l
      where l.user_id = v_uid
        and l.operation = 'consume_charge'
        and l.created_at >= date_trunc('day', timezone('utc', now()))
        and coalesce(l.metadata->>'activity_type', l.source_id, '') in (
          'immersion_session', 'lesson', 'extra_training', 'module_challenge'
        )
    ) then
      return 12;
    end if;
    return 0;
  end if;

  if v_source like 'activity:%' or v_source like 'review:%' then
    if exists (
      select 1 from public.economy_ledger l
      where l.user_id = v_uid
        and l.operation = 'consume_charge'
        and l.created_at >= date_trunc('day', timezone('utc', now()))
    ) then
      return 8;
    end if;
    return 0;
  end if;

  -- Recompensas genéricas (qi:/chest:/medal:...) e backfill: sem evidência → 0.
  if v_source like 'backfill:%' then
    return 0;
  end if;

  if v_source ~ '^(qi|chest|medal|achievement|journey-chest|monthly|league|qi_pack):' then
    if exists (
      select 1 from public.economy_ledger l
      where l.user_id = v_uid
        and l.idempotency_key = left(v_source, 128)
    ) or exists (
      select 1 from public.economy_ledger l
      where l.user_id = v_uid
        and l.source_id = split_part(v_source, ':', 2)
        and l.created_at >= now() - interval '2 days'
    ) then
      return 10;
    end if;
    return 0;
  end if;

  return 0;
end;
$$;

revoke all on function public.league_xp_server_amount(text) from public;
grant execute on function public.league_xp_server_amount(text) to service_role;

create or replace function public.add_league_weekly_xp(
  p_amount integer,
  p_source_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_week text := public.iso_week_key();
  v_amount integer;
  v_m public.league_memberships;
  v_weekly_cap constant integer := 5000;
  v_row_count integer;
  v_source text := trim(coalesce(p_source_key, ''));
  v_day_events integer;
  v_daily_event_cap constant integer := 80;
  v_day_soft_xp integer;
  v_daily_soft_cap constant integer := 400;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.league_source_key_acceptable(v_source) then
    raise exception 'invalid source key';
  end if;

  -- Servidor deriva o amount da evidência; p_amount só limita para baixo.
  v_amount := public.league_xp_server_amount(v_source);
  if v_amount <= 0 then
    return jsonb_build_object('added', 0, 'reason', 'no_server_evidence');
  end if;
  if coalesce(p_amount, 0) <= 0 then
    return jsonb_build_object('added', 0, 'reason', 'zero_amount');
  end if;
  v_amount := least(v_amount, least(coalesce(p_amount, 0), 500));

  select count(*)::integer into v_day_events
  from public.league_xp_events
  where user_id = v_user_id
    and created_at >= date_trunc('day', timezone('utc', now()));

  if v_day_events >= v_daily_event_cap then
    return jsonb_build_object('added', 0, 'reason', 'daily_event_cap');
  end if;

  select coalesce(sum(amount), 0)::integer into v_day_soft_xp
  from public.league_xp_events
  where user_id = v_user_id
    and created_at >= date_trunc('day', timezone('utc', now()));

  if v_day_soft_xp >= v_daily_soft_cap then
    return jsonb_build_object('added', 0, 'reason', 'daily_xp_cap');
  end if;

  v_amount := least(v_amount, v_daily_soft_cap - v_day_soft_xp);

  perform public.sync_league_week(v_user_id);

  select * into v_m from public.league_memberships where user_id = v_user_id;

  if v_m.weekly_xp >= v_weekly_cap then
    return jsonb_build_object('added', 0, 'reason', 'weekly_cap');
  end if;

  v_amount := least(v_amount, v_weekly_cap - v_m.weekly_xp);

  insert into public.league_xp_events (user_id, week_key, source_key, amount)
  values (v_user_id, v_week, v_source, v_amount)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_row_count = row_count;

  if v_row_count > 0 then
    update public.league_memberships
    set weekly_xp = weekly_xp + v_amount, updated_at = now()
    where user_id = v_user_id;

    update public.user_progress
    set weekly_xp = least(v_weekly_cap, weekly_xp + v_amount), updated_at = now()
    where user_id = v_user_id;

    perform public.recalculate_league_ranks(v_m.league_tier_id, v_week);

    return jsonb_build_object(
      'added', v_amount,
      'weekly_xp', v_m.weekly_xp + v_amount,
      'client_amount_ignored', true
    );
  end if;

  return jsonb_build_object('added', 0, 'reason', 'duplicate_source');
end;
$$;

revoke all on function public.add_league_weekly_xp(integer, text) from public;
grant execute on function public.add_league_weekly_xp(integer, text) to authenticated;

-- Trigger helper: não precisa ser callable por clientes.
do $$
begin
  if to_regprocedure('public.sync_profile_public_stats()') is not null then
    execute 'revoke all on function public.sync_profile_public_stats() from public, anon, authenticated';
  end if;
end $$;

commit;
