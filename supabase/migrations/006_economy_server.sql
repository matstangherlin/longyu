-- Economia sensível no servidor: ledger idempotente + RPCs validadas por JWT.
-- O cliente envia intenção; o servidor calcula saldo (nunca aceita saldo final).

-- ---------------------------------------------------------------------------
-- Schema: alinhar user_economy + ledger
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_economy' and column_name = 'daily_charges'
  ) then
    alter table public.user_economy rename column daily_charges to current_charges;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_economy' and column_name = 'max_daily_charges'
  ) then
    alter table public.user_economy rename column max_daily_charges to max_charges;
  end if;
end $$;

alter table public.user_economy
  add column if not exists bonus_claims jsonb not null default '{}'::jsonb;

create table if not exists public.economy_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null,
  amount integer not null default 0,
  currency text not null default 'qi',
  source_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists economy_ledger_user_created_idx
  on public.economy_ledger (user_id, created_at desc);

create index if not exists economy_ledger_operation_day_idx
  on public.economy_ledger (user_id, operation, created_at desc);

alter table public.economy_ledger enable row level security;

create policy "economy_ledger_select_own"
  on public.economy_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Constantes (espelham src/data/economy.ts + store.ts)
-- ---------------------------------------------------------------------------

create or replace function public.economy_constants()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'daily_charges_free', 5,
    'charge_cost', 1,
    'story_energy_daily_cap', 2,
    'lesson_three_star_qi', 5,
    'lesson_no_skip_qi', 2,
    'pro_lesson_qi_bonus', 3,
    'pro_mission_qi_multiplier', 1.25,
    'pro_chest_qi_multiplier', 1.5,
    'pro_chest_rare_bonus', 0.12,
    'pro_chest_focus_pass_chance', 0.1,
    'premium_story_ids', jsonb_build_array('bom-dia-em-casa', 'hora-de-comer')
  );
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.economy_ensure_row(p_user_id uuid)
returns public.user_economy
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_economy;
  v_free integer := (public.economy_constants()->>'daily_charges_free')::integer;
begin
  insert into public.user_economy (user_id, qi, dragon_pearls, streak_shields, current_charges, max_charges, energy_day)
  values (p_user_id, 0, 0, 0, v_free, v_free, current_date)
  on conflict (user_id) do nothing;

  select * into v_row from public.user_economy where user_id = p_user_id for update;

  if v_row.energy_day < current_date then
    update public.user_economy
    set
      energy_day = current_date,
      current_charges = v_row.max_charges,
      used_charges = 0,
      updated_at = now()
    where user_id = p_user_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.economy_row_to_json(p_row public.user_economy)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'qi', p_row.qi,
    'dragon_pearls', p_row.dragon_pearls,
    'streak_shields', p_row.streak_shields,
    'current_charges', p_row.current_charges,
    'max_charges', p_row.max_charges,
    'energy_day', p_row.energy_day::text,
    'focus_pass_until', p_row.focus_pass_until
  );
$$;

create or replace function public.economy_rand01(p_seed text)
returns double precision
language sql
immutable
as $$
  select (get_byte(decode(md5(p_seed), 'hex'), 0)::double precision) / 255.0;
$$;

create or replace function public.economy_ledger_exists(p_user_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.economy_ledger
    where user_id = p_user_id and idempotency_key = p_key
  );
$$;

create or replace function public.economy_insert_ledger(
  p_user_id uuid,
  p_operation text,
  p_amount integer,
  p_currency text,
  p_source_id text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean := false;
begin
  insert into public.economy_ledger (
    user_id, operation, amount, currency, source_id, idempotency_key, metadata
  )
  values (
    p_user_id, p_operation, p_amount, p_currency, p_source_id, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  return v_inserted;
end;
$$;

create or replace function public.economy_mission_reward(p_scope text, p_mission_id text)
returns jsonb
language sql
immutable
as $$
  select case
    when p_scope = 'daily' and p_mission_id = 'daily-xp' then '{"xp":5,"qi":5,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-minutes' then '{"xp":5,"qi":5,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-reviews' then '{"xp":8,"qi":6,"charges":2}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-audio' then '{"xp":6,"qi":5,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-phrases' then '{"xp":8,"qi":6,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-hanzi' then '{"xp":8,"qi":6,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-fix-errors' then '{"xp":6,"qi":6,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-three-star' then '{"xp":8,"qi":8,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-immersion' then '{"xp":10,"qi":8,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-tones' then '{"xp":8,"qi":6,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-pro-fix' then '{"xp":15,"qi":18,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-pro-immersion' then '{"xp":14,"qi":16,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-pro-review' then '{"xp":12,"qi":14,"charges":0}'::jsonb
    when p_scope = 'daily' and p_mission_id = 'daily-pro-streak' then '{"xp":10,"qi":12,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-lessons' then '{"xp":40,"qi":20,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-review-days' then '{"xp":40,"qi":20,"charges":2}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-xp' then '{"xp":30,"qi":25,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-microtexts' then '{"xp":35,"qi":18,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-immersion' then '{"xp":45,"qi":22,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-xp' then '{"xp":60,"qi":45,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-immersion' then '{"xp":55,"qi":40,"charges":0}'::jsonb
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-story' then '{"xp":45,"qi":35,"charges":0}'::jsonb
    else null
  end;
$$;

create or replace function public.economy_mission_goal(p_scope text, p_mission_id text)
returns integer
language sql
immutable
as $$
  select case
    when p_scope = 'daily' and p_mission_id = 'daily-xp' then 10
    when p_scope = 'daily' and p_mission_id = 'daily-minutes' then 5
    when p_scope = 'daily' and p_mission_id = 'daily-reviews' then 10
    when p_scope = 'daily' and p_mission_id = 'daily-audio' then 8
    when p_scope = 'daily' and p_mission_id = 'daily-phrases' then 3
    when p_scope = 'daily' and p_mission_id = 'daily-hanzi' then 3
    when p_scope = 'daily' and p_mission_id = 'daily-fix-errors' then 3
    when p_scope = 'daily' and p_mission_id = 'daily-three-star' then 1
    when p_scope = 'daily' and p_mission_id = 'daily-immersion' then 1
    when p_scope = 'daily' and p_mission_id = 'daily-tones' then 8
    when p_scope = 'daily' and p_mission_id = 'daily-pro-fix' then 6
    when p_scope = 'daily' and p_mission_id = 'daily-pro-immersion' then 2
    when p_scope = 'daily' and p_mission_id = 'daily-pro-review' then 25
    when p_scope = 'daily' and p_mission_id = 'daily-pro-streak' then 3
    when p_scope = 'weekly' and p_mission_id = 'weekly-lessons' then 5
    when p_scope = 'weekly' and p_mission_id = 'weekly-review-days' then 4
    when p_scope = 'weekly' and p_mission_id = 'weekly-xp' then 250
    when p_scope = 'weekly' and p_mission_id = 'weekly-microtexts' then 3
    when p_scope = 'weekly' and p_mission_id = 'weekly-immersion' then 3
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-xp' then 400
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-immersion' then 5
    when p_scope = 'weekly' and p_mission_id = 'weekly-pro-story' then 1
    else null
  end;
$$;

create or replace function public.economy_mission_is_pro(p_mission_id text)
returns boolean
language sql
immutable
as $$
  select p_mission_id like 'daily-pro-%' or p_mission_id like 'weekly-pro-%';
$$;

create or replace function public.economy_activity_consumes_charge(p_activity_type text)
returns boolean
language sql
immutable
as $$
  select p_activity_type in (
    'lesson', 'module_challenge', 'immersion_session', 'extra_training', 'premium_preview'
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: estado atual
-- ---------------------------------------------------------------------------

create or replace function public.get_server_economy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_row := public.economy_ensure_row(v_uid);
  return jsonb_build_object(
    'ok', true,
    'is_pro', public.economy_user_is_pro(v_uid),
    'economy', public.economy_row_to_json(v_row)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: consume_charge
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: spend_qi
-- ---------------------------------------------------------------------------

create or replace function public.spend_qi(
  p_amount integer,
  p_reason text,
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
  v_amount integer := greatest(0, coalesce(p_amount, 0));
  v_key text := left(trim(coalesce(p_idempotency_key, '')), 128);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_key = '' then raise exception 'idempotency_key obrigatório'; end if;
  if v_amount <= 0 then raise exception 'amount inválido'; end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_user_is_pro(v_uid) then
    return jsonb_build_object('ok', true, 'already_applied', false, 'is_pro', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  if v_row.qi < v_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_qi', 'economy', public.economy_row_to_json(v_row));
  end if;

  update public.user_economy
  set qi = qi - v_amount, updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'spend_qi', v_amount, 'qi', left(coalesce(p_reason, ''), 64), v_key,
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 64))
  );

  return jsonb_build_object('ok', true, 'already_applied', false, 'economy', public.economy_row_to_json(v_row));
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: grant_lesson_reward
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_lesson_id, '') = '' or coalesce(p_attempt_id, '') = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;

  v_key := left('lesson-reward:' || p_lesson_id || ':' || p_attempt_id, 128);
  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row), 'rewards', '[]'::jsonb);
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
    v_uid, 'grant_lesson_reward', v_qi, 'qi', p_lesson_id, v_key,
    jsonb_build_object('lesson_id', p_lesson_id, 'attempt_id', p_attempt_id, 'stars', v_stars, 'no_skip', coalesce(p_no_skip, false))
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
-- RPC: grant_story_energy
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
  v_day text := left(trim(coalesce(p_day_key, to_char(current_date, 'YYYY-MM-DD'))), 16);
  v_story text := left(trim(coalesce(p_story_id, '')), 64);
  v_key text;
  v_cap integer := (public.economy_constants()->>'story_energy_daily_cap')::integer;
  v_granted_today integer;
  v_premium jsonb := public.economy_constants()->'premium_story_ids';
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_story = '' then raise exception 'story_id obrigatório'; end if;

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
-- RPC: claim_mission
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_scope, '') not in ('daily', 'weekly') then raise exception 'scope inválido'; end if;
  if coalesce(p_mission_id, '') = '' or coalesce(p_period_key, '') = '' then
    raise exception 'mission_id e period_key obrigatórios';
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
  if coalesce(p_metric_value, 0) < v_goal then
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
-- RPC: open_chest (sorteio determinístico por opening_id)
-- ---------------------------------------------------------------------------

create or replace function public.open_chest(
  p_chest_type text,
  p_opening_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_key text := left('chest:' || trim(coalesce(p_opening_id, '')), 128);
  v_type text := left(trim(coalesce(p_chest_type, '')), 32);
  v_qty integer;
  v_pick double precision;
  v_qi integer := 0;
  v_rewards jsonb := '[]'::jsonb;
  v_is_pro boolean;
  v_boost numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_key = 'chest:' or v_type = '' then raise exception 'parâmetros inválidos'; end if;

  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);
  v_boost := case when v_is_pro then (public.economy_constants()->>'pro_chest_qi_multiplier')::numeric else 1 end;

  if public.economy_ledger_exists(v_uid, v_key) then
    select metadata->'rewards' into v_rewards
    from public.economy_ledger
    where user_id = v_uid and idempotency_key = v_key;
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row), 'rewards', coalesce(v_rewards, '[]'::jsonb));
  end if;

  select quantity into v_qty
  from public.user_chests
  where user_id = v_uid and chest_type = v_type
  for update;

  if coalesce(v_qty, 0) <= 0 then
    return jsonb_build_object('ok', false, 'error', 'no_chest', 'economy', public.economy_row_to_json(v_row));
  end if;

  update public.user_chests
  set quantity = quantity - 1, updated_at = now()
  where user_id = v_uid and chest_type = v_type;

  v_pick := public.economy_rand01(v_key || ':pick');

  if v_type = 'small' then
    if v_pick < 0.45 then
      v_qi := round((20 + floor(public.economy_rand01(v_key || ':qi') * 31)) * v_boost)::integer;
      v_rewards := jsonb_build_array(jsonb_build_object('kind', 'qi', 'amount', v_qi));
      update public.user_economy set qi = qi + v_qi, updated_at = now() where user_id = v_uid returning * into v_row;
    elsif v_pick < 0.8 then
      v_rewards := jsonb_build_array(jsonb_build_object('kind', 'xp', 'amount', 5 + floor(public.economy_rand01(v_key || ':xp') * 11)::integer));
    elsif v_pick < 0.92 then
      update public.user_economy set current_charges = least(max_charges, current_charges + 1), updated_at = now() where user_id = v_uid returning * into v_row;
      v_rewards := jsonb_build_array(jsonb_build_object('kind', 'charge', 'amount', 1));
    else
      update public.user_economy set streak_shields = streak_shields + 1, updated_at = now() where user_id = v_uid returning * into v_row;
      v_rewards := jsonb_build_array(jsonb_build_object('kind', 'shield', 'amount', 1));
    end if;
  elsif v_type = 'dragon' then
    v_qi := round((80 + floor(public.economy_rand01(v_key || ':qi') * 71)) * v_boost)::integer;
    update public.user_economy set qi = qi + v_qi, updated_at = now() where user_id = v_uid returning * into v_row;
    v_rewards := jsonb_build_array(jsonb_build_object('kind', 'qi', 'amount', v_qi));
  elsif v_type = 'monthly' then
    v_qi := round((200 + floor(public.economy_rand01(v_key || ':qi') * 101)) * v_boost)::integer;
    update public.user_economy
    set qi = qi + v_qi, streak_shields = streak_shields + 1, updated_at = now()
    where user_id = v_uid returning * into v_row;
    v_rewards := jsonb_build_array(
      jsonb_build_object('kind', 'qi', 'amount', v_qi),
      jsonb_build_object('kind', 'shield', 'amount', 1)
    );
  else
    raise exception 'tipo de baú inválido';
  end if;

  perform public.economy_insert_ledger(
    v_uid, 'open_chest', 1, 'chest', v_type, v_key,
    jsonb_build_object('chest_type', v_type, 'rewards', v_rewards)
  );

  return jsonb_build_object('ok', true, 'already_applied', false, 'economy', public.economy_row_to_json(v_row), 'rewards', v_rewards);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: migrate_local_economy (uma vez por conta)
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_key = '' then raise exception 'idempotency_key obrigatório'; end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object('ok', true, 'already_applied', true, 'economy', public.economy_row_to_json(v_row));
  end if;

  v_qi := greatest(0, coalesce((p_payload->>'qi')::integer, 0));
  v_pearls := greatest(0, coalesce((p_payload->>'dragon_pearls')::integer, 0));
  v_shields := greatest(0, coalesce((p_payload->>'streak_shields')::integer, 0));
  v_charges := greatest(0, coalesce((p_payload->>'current_charges')::integer, 0));
  v_max := greatest(v_charges, coalesce((p_payload->>'max_charges')::integer, v_charges), v_row.max_charges);

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
    jsonb_build_object('migrated', true)
  );

  return jsonb_build_object('ok', true, 'already_applied', false, 'economy', public.economy_row_to_json(v_row));
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: criar user_economy no signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free integer := (public.economy_constants()->>'daily_charges_free')::integer;
begin
  insert into public.profiles (id, name, native_language, target_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Aluno Longyu'),
    coalesce(new.raw_user_meta_data->>'native_language', 'pt-BR'),
    coalesce(new.raw_user_meta_data->>'target_language', 'zh-CN')
  )
  on conflict (id) do nothing;

  insert into public.user_economy (user_id, qi, dragon_pearls, streak_shields, current_charges, max_charges, energy_day)
  values (new.id, 0, 0, 0, v_free, v_free, current_date)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.economy_constants() from public;
revoke all on function public.economy_user_is_pro(uuid) from public;
revoke all on function public.economy_ensure_row(uuid) from public;
revoke all on function public.get_server_economy() from public;
revoke all on function public.consume_charge(text, text) from public;
revoke all on function public.spend_qi(integer, text, text) from public;
revoke all on function public.grant_lesson_reward(text, text, integer, boolean) from public;
revoke all on function public.grant_story_energy(text, text) from public;
revoke all on function public.claim_mission(text, text, text, integer) from public;
revoke all on function public.open_chest(text, text) from public;
revoke all on function public.migrate_local_economy(jsonb, text) from public;

grant execute on function public.get_server_economy() to authenticated;
grant execute on function public.consume_charge(text, text) to authenticated;
grant execute on function public.spend_qi(integer, text, text) to authenticated;
grant execute on function public.grant_lesson_reward(text, text, integer, boolean) to authenticated;
grant execute on function public.grant_story_energy(text, text) to authenticated;
grant execute on function public.claim_mission(text, text, text, integer) to authenticated;
grant execute on function public.open_chest(text, text) to authenticated;
grant execute on function public.migrate_local_economy(jsonb, text) to authenticated;
