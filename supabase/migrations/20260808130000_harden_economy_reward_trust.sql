-- Fecha escrita direta em tabelas de economia/inventário e endurece RPCs
-- que ainda confiavam em métricas, chaves e saldos enviados pelo cliente.

begin;

-- ---------------------------------------------------------------------------
-- A. RLS: cliente autenticado só lê; mutação só via SECURITY DEFINER
-- ---------------------------------------------------------------------------

drop policy if exists "user_economy_insert_own" on public.user_economy;
drop policy if exists "user_economy_update_own" on public.user_economy;

drop policy if exists "user_chests_insert_own" on public.user_chests;
drop policy if exists "user_chests_update_own" on public.user_chests;

drop policy if exists "user_missions_insert_own" on public.user_missions;
drop policy if exists "user_missions_update_own" on public.user_missions;

drop policy if exists "user_achievements_insert_own" on public.user_achievements;

revoke insert, update, delete on table public.user_economy from authenticated;
revoke insert, update, delete on table public.user_chests from authenticated;
revoke insert, update, delete on table public.user_missions from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
revoke insert, update, delete on table public.economy_ledger from authenticated;

revoke insert, update, delete on table public.league_memberships from authenticated;
revoke insert, update, delete on table public.league_weekly_results from authenticated;
revoke insert, update, delete on table public.league_xp_events from authenticated;

grant select on table public.user_economy to authenticated;
grant select on table public.user_chests to authenticated;
grant select on table public.user_missions to authenticated;
grant select on table public.user_achievements to authenticated;
grant select on table public.economy_ledger to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers de validação
-- ---------------------------------------------------------------------------

create or replace function public.economy_period_key_acceptable(
  p_scope text,
  p_period_key text
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_period_key, ''));
  v_today date := (timezone('utc', now()))::date;
  v_day date;
  v_current_iso text := to_char(timezone('utc', now()), 'IYYY-"W"IW');
begin
  if p_scope = 'daily' then
    if v_key !~ '^\d{4}-\d{2}-\d{2}$' then
      return false;
    end if;
    begin
      v_day := v_key::date;
    exception when others then
      return false;
    end;
    -- Aceita ontem/hoje/amanhã (fuso local do aluno vs UTC do servidor).
    return v_day between (v_today - 1) and (v_today + 1);
  end if;

  if p_scope = 'weekly' then
    if v_key !~ '^\d{4}-W\d{2}$' then
      return false;
    end if;
    -- Semana corrente ou anterior (ISO), evitando period_key arbitrários.
    return v_key = v_current_iso
      or v_key = to_char(timezone('utc', now()) - interval '7 days', 'IYYY-"W"IW');
  end if;

  return false;
end;
$$;

revoke all on function public.economy_period_key_acceptable(text, text) from public;
grant execute on function public.economy_period_key_acceptable(text, text) to service_role;

create or replace function public.league_source_key_acceptable(p_source_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    length(trim(coalesce(p_source_key, ''))) between 3 and 160
    and trim(p_source_key) ~
      '^(lesson|review|story|immersion|mission|activity|backfill:week|qi|chest|medal|achievement|journey-chest|monthly|league|qi_pack):';
$$;

revoke all on function public.league_source_key_acceptable(text) from public;
grant execute on function public.league_source_key_acceptable(text) to service_role;

-- ---------------------------------------------------------------------------
-- B. migrate_local_economy: uma vez por conta + tetos duros
-- ---------------------------------------------------------------------------

create or replace function public.migrate_local_economy(
  p_payload jsonb,
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
  v_key text := left(trim(coalesce(p_idempotency_key, '')), 128);
  v_qi integer;
  v_pearls integer;
  v_shields integer;
  v_charges integer;
  v_max integer;
  v_cap_qi constant integer := 5000;
  v_cap_pearls constant integer := 50;
  v_cap_shields constant integer := 10;
  v_cap_charges constant integer := 20;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_key = '' then raise exception 'idempotency_key obrigatório'; end if;

  v_row := public.economy_ensure_row(v_uid);

  if exists (
    select 1
    from public.economy_ledger
    where user_id = v_uid
      and operation = 'migrate_local_economy'
  ) then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row),
      'reason', 'already_migrated'
    );
  end if;

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  v_qi := least(v_cap_qi, greatest(0, coalesce((p_payload->>'qi')::integer, 0)));
  v_pearls := least(v_cap_pearls, greatest(0, coalesce((p_payload->>'dragon_pearls')::integer, 0)));
  v_shields := least(v_cap_shields, greatest(0, coalesce((p_payload->>'streak_shields')::integer, 0)));
  v_charges := least(v_cap_charges, greatest(0, coalesce((p_payload->>'current_charges')::integer, 0)));
  v_max := least(
    v_cap_charges,
    greatest(v_charges, coalesce((p_payload->>'max_charges')::integer, v_charges), v_row.max_charges)
  );

  update public.user_economy
  set
    qi = greatest(qi, v_qi),
    dragon_pearls = greatest(dragon_pearls, v_pearls),
    streak_shields = greatest(streak_shields, v_shields),
    current_charges = greatest(current_charges, least(v_max, v_charges)),
    max_charges = greatest(max_charges, v_max),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'migrate_local_economy', 0, 'migration', v_uid::text, v_key,
    jsonb_build_object(
      'migrated', true,
      'once_per_user', true,
      'capped', true
    )
  );

  return jsonb_build_object('ok', true, 'already_applied', false, 'economy', public.economy_row_to_json(v_row));
end;
$$;

-- ---------------------------------------------------------------------------
-- C. claim_mission: period_key precisa ser janela recente válidaada
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
  v_metric integer := greatest(0, least(coalesce(p_metric_value, 0), 100000));
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_scope, '') not in ('daily', 'weekly') then raise exception 'scope inválido'; end if;
  if coalesce(p_mission_id, '') = '' or coalesce(p_period_key, '') = '' then
    raise exception 'mission_id e period_key obrigatórios';
  end if;
  if not public.economy_period_key_acceptable(p_scope, p_period_key) then
    return jsonb_build_object('ok', false, 'error', 'invalid_period_key');
  end if;

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
    return jsonb_build_object('ok', false, 'error', 'mission_incomplete', 'economy', public.economy_row_to_json(v_row));
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
    jsonb_build_object('scope', p_scope, 'period_key', p_period_key, 'charges', v_charges)
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'economy', public.economy_row_to_json(v_row),
    'rewards', jsonb_build_object('qi', v_qi, 'charges', v_charges)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- D. grant_story_energy: day_key precisa estar na janela ±1 dia
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_story = '' then raise exception 'story_id obrigatório'; end if;
  if not public.economy_period_key_acceptable('daily', v_day) then
    return jsonb_build_object('ok', false, 'error', 'invalid_day_key', 'granted', false);
  end if;

  if v_premium ? v_story then
    return jsonb_build_object('ok', false, 'error', 'premium_story', 'granted', false);
  end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_user_is_pro(v_uid) then
    return jsonb_build_object('ok', true, 'granted', false, 'reason', 'pro', 'economy', public.economy_row_to_json(v_row));
  end if;

  v_key := left('story-energy:' || v_day || ':' || v_story, 128);

  if public.economy_ledger_exists(v_uid, v_key) then
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

  perform public.economy_insert_ledger(
    v_uid, 'grant_story_energy', 1, 'charge', v_story, v_key,
    jsonb_build_object('story_id', v_story, 'day_key', v_day)
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

-- ---------------------------------------------------------------------------
-- E. grant_lesson_reward: limita mint diário por tentativa fabricada
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
  v_day_count integer;
  v_daily_cap constant integer := 40;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_lesson = '' or v_attempt = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;
  if length(v_attempt) < 8 then
    raise exception 'attempt_id inválido';
  end if;

  v_key := left('lesson-reward:' || v_lesson || ':' || v_attempt, 128);
  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row), 'rewards', '[]'::jsonb);
  end if;

  select count(*)::integer into v_day_count
  from public.economy_ledger
  where user_id = v_uid
    and operation = 'grant_lesson_reward'
    and created_at >= date_trunc('day', timezone('utc', now()));

  if v_day_count >= v_daily_cap then
    return jsonb_build_object(
      'ok', false,
      'error', 'daily_reward_cap',
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  if v_stars >= 3 then
    v_qi := (public.economy_constants()->>'lesson_three_star_qi')::integer;
    if coalesce(p_no_skip, false) then
      v_qi := v_qi + (public.economy_constants()->>'lesson_no_skip_qi')::integer;
    end if;
    if v_is_pro then
      v_qi := v_qi + (public.economy_constants()->>'pro_lesson_qi_bonus')::integer;
    end if;
  end if;

  if v_qi > 0 then
    update public.user_economy
    set qi = qi + v_qi, updated_at = now()
    where user_id = v_uid
    returning * into v_row;
  end if;

  perform public.economy_insert_ledger(
    v_uid, 'grant_lesson_reward', v_qi, 'qi', v_lesson, v_key,
    jsonb_build_object('lesson_id', v_lesson, 'attempt_id', v_attempt, 'stars', v_stars, 'no_skip', coalesce(p_no_skip, false))
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
-- F. add_league_weekly_xp: só aceita source_key com prefixo conhecido
-- ---------------------------------------------------------------------------

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
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.league_source_key_acceptable(v_source) then
    raise exception 'invalid source key';
  end if;

  v_amount := greatest(0, least(coalesce(p_amount, 0), 500));
  if v_amount <= 0 then
    return jsonb_build_object('added', 0, 'reason', 'zero_amount');
  end if;

  select count(*)::integer into v_day_events
  from public.league_xp_events
  where user_id = v_user_id
    and created_at >= date_trunc('day', timezone('utc', now()));

  if v_day_events >= v_daily_event_cap then
    return jsonb_build_object('added', 0, 'reason', 'daily_event_cap');
  end if;

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

    return jsonb_build_object('added', v_amount, 'weekly_xp', v_m.weekly_xp + v_amount);
  end if;

  return jsonb_build_object('added', 0, 'reason', 'duplicate_source');
end;
$$;

-- ---------------------------------------------------------------------------
-- G. claim_league_week_reward: também concede o baú no inventário servidor
-- ---------------------------------------------------------------------------

create or replace function public.claim_league_week_reward(p_week_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.league_weekly_results;
  v_qi integer;
  v_is_pro boolean := false;
  v_pro_bonus constant integer := 15;
  v_chest text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.league_weekly_results
  where user_id = v_user_id and week_key = p_week_key
  for update;

  if not found then
    raise exception 'result not found';
  end if;

  if v_row.reward_claimed then
    return jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  end if;

  select exists (
    select 1 from public.subscriptions s
    where s.user_id = v_user_id
      and s.status in ('active', 'trialing')
  ) into v_is_pro;

  v_qi := v_row.reward_qi + case when v_is_pro then v_pro_bonus else 0 end;
  v_chest := nullif(trim(coalesce(v_row.reward_chest_type, '')), '');

  update public.league_weekly_results
  set reward_claimed = true
  where id = v_row.id;

  update public.user_economy
  set qi = qi + v_qi, updated_at = now()
  where user_id = v_user_id;

  if v_chest is not null then
    insert into public.user_chests (user_id, chest_type, quantity)
    values (v_user_id, v_chest, 1)
    on conflict (user_id, chest_type)
    do update set quantity = public.user_chests.quantity + 1, updated_at = now();
  end if;

  return jsonb_build_object(
    'claimed', true,
    'qi', v_qi,
    'chest_type', v_chest,
    'is_pro_bonus', v_is_pro
  );
end;
$$;

revoke all on function public.migrate_local_economy(jsonb, text) from public;
grant execute on function public.migrate_local_economy(jsonb, text) to authenticated;

revoke all on function public.claim_mission(text, text, text, integer) from public;
grant execute on function public.claim_mission(text, text, text, integer) to authenticated;

revoke all on function public.grant_story_energy(text, text) from public;
grant execute on function public.grant_story_energy(text, text) to authenticated;

revoke all on function public.grant_lesson_reward(text, text, integer, boolean) from public;
grant execute on function public.grant_lesson_reward(text, text, integer, boolean) to authenticated;

revoke all on function public.add_league_weekly_xp(integer, text) from public;
grant execute on function public.add_league_weekly_xp(integer, text) to authenticated;

revoke all on function public.claim_league_week_reward(text) from public;
grant execute on function public.claim_league_week_reward(text) to authenticated;

commit;
