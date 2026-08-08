-- Anti-cheat de Qi: o cliente deixa de poder mintar recompensa por tentativa
-- fabricada e deixa de resgatar missão com métrica inventada.

begin;

-- ---------------------------------------------------------------------------
-- Métrica verificável a partir do ledger / liga (sem confiar no cliente)
-- ---------------------------------------------------------------------------

create or replace function public.economy_period_bounds(
  p_scope text,
  p_period_key text,
  out p_start timestamptz,
  out p_end timestamptz
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_day date;
begin
  if p_scope = 'daily' then
    v_day := p_period_key::date;
    p_start := (v_day::timestamp at time zone 'utc');
    p_end := p_start + interval '1 day';
    return;
  end if;

  if p_scope = 'weekly' then
    -- IYYY-"W"IW-ID: segunda (ID=1) da semana ISO informada.
    p_start := (to_date(p_period_key || '-1', 'IYYY-"W"IW-ID'))::timestamp at time zone 'utc';
    p_end := p_start + interval '7 days';
    return;
  end if;

  raise exception 'scope inválido';
end;
$$;

revoke all on function public.economy_period_bounds(text, text) from public;

create or replace function public.economy_verified_mission_metric(
  p_user_id uuid,
  p_scope text,
  p_mission_id text,
  p_period_key text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_value integer := 0;
begin
  select b.p_start, b.p_end into v_start, v_end
  from public.economy_period_bounds(p_scope, p_period_key) as b;

  if p_mission_id in ('daily-three-star') then
    select count(*)::integer into v_value
    from public.economy_ledger
    where user_id = p_user_id
      and operation = 'grant_lesson_reward'
      and created_at >= v_start and created_at < v_end
      and coalesce((metadata->>'stars')::integer, 0) >= 3;
    return v_value;
  end if;

  if p_mission_id in ('weekly-lessons') then
    select count(distinct coalesce(source_id, metadata->>'lesson_id'))::integer into v_value
    from public.economy_ledger
    where user_id = p_user_id
      and operation = 'grant_lesson_reward'
      and created_at >= v_start and created_at < v_end
      and coalesce((metadata->>'stars')::integer, 0) >= 3;
    return v_value;
  end if;

  if p_mission_id in (
    'daily-immersion',
    'daily-pro-immersion',
    'weekly-immersion',
    'weekly-pro-immersion',
    'weekly-pro-story'
  ) then
    select count(*)::integer into v_value
    from public.economy_ledger
    where user_id = p_user_id
      and operation = 'grant_story_energy'
      and created_at >= v_start and created_at < v_end;
    return v_value;
  end if;

  if p_mission_id in ('daily-xp', 'weekly-xp', 'weekly-pro-xp') then
    -- XP de liga é a evidência server-side mais próxima do progresso do período.
    select coalesce(sum(amount), 0)::integer into v_value
    from public.league_xp_events
    where user_id = p_user_id
      and created_at >= v_start and created_at < v_end;
    return v_value;
  end if;

  if p_mission_id in (
    'daily-reviews',
    'daily-pro-review',
    'weekly-review-days'
  ) then
    if p_mission_id = 'weekly-review-days' then
      select count(distinct (created_at at time zone 'utc')::date)::integer into v_value
      from public.economy_ledger
      where user_id = p_user_id
        and operation = 'consume_charge'
        and created_at >= v_start and created_at < v_end
        and coalesce(metadata->>'activity_type', source_id, '') in (
          'lesson', 'module_challenge', 'extra_training', 'immersion_session'
        );
      return v_value;
    end if;

    select count(*)::integer into v_value
    from public.economy_ledger
    where user_id = p_user_id
      and operation = 'consume_charge'
      and created_at >= v_start and created_at < v_end;
    return v_value;
  end if;

  -- Missões sem evidência server-owned não podem ser resgatadas pela API.
  return 0;
end;
$$;

revoke all on function public.economy_verified_mission_metric(uuid, text, text, text) from public;
grant execute on function public.economy_verified_mission_metric(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- grant_lesson_reward: 1 Qi grant por lição (não por attempt_id)
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
  v_stars integer := greatest(1, least(3, coalesce(p_stars, 3)));
  v_lesson text := left(trim(coalesce(p_lesson_id, '')), 64);
  v_attempt text := left(trim(coalesce(p_attempt_id, '')), 64);
  v_no_skip boolean := coalesce(p_no_skip, false);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_lesson = '' or v_attempt = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;
  if length(v_attempt) < 8 then
    raise exception 'attempt_id inválido';
  end if;

  -- Catálogo conhecido (mesmo do referral): evita IDs inventados.
  if to_regclass('public.referral_eligible_lessons') is not null
     and not exists (
       select 1
       from public.referral_eligible_lessons lesson
       where lesson.lesson_id = v_lesson and lesson.enabled
     ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_lesson');
  end if;

  -- Uma recompensa de Qi por lição por conta — alinhado ao cliente local.
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

  if v_stars < 3 then
    return jsonb_build_object(
      'ok', true,
      'already_applied', false,
      'economy', public.economy_row_to_json(v_row),
      'rewards', '[]'::jsonb,
      'reason', 'below_three_stars'
    );
  end if;

  v_qi := (public.economy_constants()->>'lesson_three_star_qi')::integer;
  if v_no_skip then
    v_qi := v_qi + (public.economy_constants()->>'lesson_no_skip_qi')::integer;
  end if;
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
      'stars', v_stars,
      'no_skip', v_no_skip,
      'once_per_lesson', true
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

-- ---------------------------------------------------------------------------
-- claim_mission: ignora p_metric_value; só paga com evidência server-side
-- ---------------------------------------------------------------------------

create or replace function public.claim_mission(
  p_scope text,
  p_mission_id text,
  p_period_key text,
  p_metric_value integer default 0
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
  v_reward jsonb;
  v_goal integer;
  v_qi integer;
  v_charges integer;
  v_is_pro boolean;
  v_metric integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_scope, '') not in ('daily', 'weekly') then raise exception 'scope inválido'; end if;
  if coalesce(p_mission_id, '') = '' or coalesce(p_period_key, '') = '' then
    raise exception 'mission_id e period_key obrigatórios';
  end if;
  if not public.economy_period_key_acceptable(p_scope, p_period_key) then
    return jsonb_build_object('ok', false, 'error', 'invalid_period_key');
  end if;

  -- p_metric_value é ignorado de propósito (anti-cheat).
  v_metric := public.economy_verified_mission_metric(v_uid, p_scope, p_mission_id, p_period_key);

  v_key := left('mission:' || p_scope || ':' || p_mission_id || ':' || p_period_key, 128);
  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  v_reward := public.economy_mission_reward(p_scope, p_mission_id);
  v_goal := public.economy_mission_goal(p_scope, p_mission_id);
  if v_reward is null or v_goal is null then
    raise exception 'missão desconhecida';
  end if;
  if public.economy_mission_is_pro(p_mission_id) and not v_is_pro then
    return jsonb_build_object('ok', false, 'error', 'pro_required', 'economy', public.economy_row_to_json(v_row));
  end if;
  if v_metric < v_goal then
    return jsonb_build_object(
      'ok', false,
      'error', 'mission_incomplete',
      'verified_metric', v_metric,
      'goal', v_goal,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  v_qi := coalesce((v_reward->>'qi')::integer, 0);
  if v_is_pro and v_qi > 0 then
    v_qi := round(v_qi * (public.economy_constants()->>'pro_mission_qi_multiplier')::numeric)::integer;
  end if;
  v_charges := case when v_is_pro then 0 else coalesce((v_reward->>'charges')::integer, 0) end;

  update public.user_economy
  set
    qi = qi + v_qi,
    current_charges = least(max_charges, current_charges + v_charges),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  insert into public.user_missions (user_id, scope, mission_id, period_key, claimed, claimed_at)
  values (v_uid, p_scope, p_mission_id, p_period_key, true, now())
  on conflict (user_id, scope, mission_id, period_key)
  do update set claimed = true, claimed_at = excluded.claimed_at, updated_at = now();

  perform public.economy_insert_ledger(
    v_uid, 'claim_mission', v_qi, 'qi', p_mission_id, v_key,
    jsonb_build_object(
      'scope', p_scope,
      'period_key', p_period_key,
      'charges', v_charges,
      'verified_metric', v_metric,
      'client_metric_ignored', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'economy', public.economy_row_to_json(v_row),
    'rewards', jsonb_build_object('qi', v_qi, 'charges', v_charges),
    'verified_metric', v_metric
  );
end;
$$;

revoke all on function public.grant_lesson_reward(text, text, integer, boolean) from public;
grant execute on function public.grant_lesson_reward(text, text, integer, boolean) to authenticated;

revoke all on function public.claim_mission(text, text, text, integer) from public;
grant execute on function public.claim_mission(text, text, text, integer) to authenticated;

-- Pro também deixa rastro de atividade (sem gastar carga) para missões verificáveis.
create or replace function public.consume_charge(
  p_activity_type text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_cost integer := (public.economy_constants()->>'charge_cost')::integer;
  v_key text := left(trim(coalesce(p_idempotency_key, '')), 128);
  v_already boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_key = '' then raise exception 'idempotency_key obrigatório'; end if;
  if not public.economy_activity_consumes_charge(p_activity_type) then
    v_row := public.economy_ensure_row(v_uid);
    return jsonb_build_object('ok', true, 'already_applied', false, 'skipped', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_user_is_pro(v_uid) then
    if not public.economy_ledger_exists(v_uid, v_key) then
      perform public.economy_insert_ledger(
        v_uid, 'consume_charge', 0, 'charge', p_activity_type, v_key,
        jsonb_build_object('activity_type', p_activity_type, 'pro', true)
      );
    end if;
    return jsonb_build_object('ok', true, 'already_applied', false, 'is_pro', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  v_already := public.economy_ledger_exists(v_uid, v_key);
  if v_already then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  if v_row.current_charges < v_cost then
    return jsonb_build_object('ok', false, 'error', 'charge_exhausted', 'economy', public.economy_row_to_json(v_row));
  end if;

  update public.user_economy
  set
    current_charges = greatest(0, current_charges - v_cost),
    used_charges = used_charges + v_cost,
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'consume_charge', v_cost, 'charge', p_activity_type, v_key,
    jsonb_build_object('activity_type', p_activity_type)
  );

  return jsonb_build_object('ok', true, 'already_applied', false, 'economy', public.economy_row_to_json(v_row));
end;
$$;

revoke all on function public.consume_charge(text, text) from public;
grant execute on function public.consume_charge(text, text) to authenticated;

commit;
