-- 001_initial_schema.sql
-- Longyu initial schema (Fase C prep). Apply via Supabase CLI or SQL editor.
-- RLS: usuário autenticado só acessa próprias linhas (user_id = auth.uid()).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  native_language text not null default 'pt-BR',
  target_language text not null default 'zh-CN',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  completed_lessons text[] not null default '{}',
  lesson_task_progress jsonb not null default '{}',
  learned_chars text[] not null default '{}',
  learned_chunks text[] not null default '{}',
  current_lesson_id text,
  placement jsonb,
  streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active date,
  xp_total integer not null default 0,
  xp_today integer not null default 0,
  weekly_xp integer not null default 0,
  monthly_xp integer not null default 0,
  client_snapshot_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_economy (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  qi integer not null default 0,
  dragon_pearls integer not null default 0,
  streak_shields integer not null default 0,
  daily_charges integer not null default 5,
  max_daily_charges integer not null default 5,
  used_charges integer not null default 0,
  energy_day date not null default current_date,
  focus_pass_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_srs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  domain text not null,
  track text not null,
  ease numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null default now(),
  last_grade text,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id, domain, track)
);

create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,
  mission_id text not null,
  period_key text not null,
  progress jsonb not null default '{}',
  claimed boolean not null default false,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, scope, mission_id, period_key)
);

create table if not exists public.user_chests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chest_type text not null,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, chest_type)
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  reward jsonb,
  unique (user_id, achievement_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_event_id text unique,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  kind text not null,
  amount integer not null,
  currency text not null default 'brl',
  status text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_economy enable row level security;
alter table public.user_srs enable row level security;
alter table public.user_missions enable row level security;
alter table public.user_chests enable row level security;
alter table public.user_achievements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "user_progress_select_own" on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_progress_insert_own" on public.user_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "user_progress_update_own" on public.user_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_economy_select_own" on public.user_economy for select to authenticated using (auth.uid() = user_id);
create policy "user_economy_insert_own" on public.user_economy for insert to authenticated with check (auth.uid() = user_id);
create policy "user_economy_update_own" on public.user_economy for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_srs_select_own" on public.user_srs for select to authenticated using (auth.uid() = user_id);
create policy "user_srs_insert_own" on public.user_srs for insert to authenticated with check (auth.uid() = user_id);
create policy "user_srs_update_own" on public.user_srs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_missions_select_own" on public.user_missions for select to authenticated using (auth.uid() = user_id);
create policy "user_missions_insert_own" on public.user_missions for insert to authenticated with check (auth.uid() = user_id);
create policy "user_missions_update_own" on public.user_missions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_chests_select_own" on public.user_chests for select to authenticated using (auth.uid() = user_id);
create policy "user_chests_insert_own" on public.user_chests for insert to authenticated with check (auth.uid() = user_id);
create policy "user_chests_update_own" on public.user_chests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_achievements_select_own" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "user_achievements_insert_own" on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);

create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "transactions_select_own" on public.transactions for select to authenticated using (auth.uid() = user_id);


-- 002_client_snapshot.sql
-- Snapshot completo do cliente para migração gradual (Fase C).
alter table public.user_progress
  add column if not exists client_snapshot jsonb,
  add column if not exists client_snapshot_version integer not null default 1;

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);


-- 003_profile_trigger.sql
-- Cria perfil automaticamente ao registrar usuário (fallback ao upsert do cliente).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, native_language, target_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Aluno Longyu'),
    coalesce(new.raw_user_meta_data->>'native_language', 'pt-BR'),
    coalesce(new.raw_user_meta_data->>'target_language', 'zh-CN')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 004_leagues.sql
-- Ligas semanais Longyu: divisões, membros, histórico e RPC controlada de XP.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.league_tiers (
  id text primary key,
  name text not null,
  order_index integer not null unique,
  icon text not null default 'trophy',
  color text not null,
  description text not null default '',
  level_min integer not null default 0,
  level_max integer not null default 999,
  promotion_count integer not null default 5,
  relegation_count integer not null default 5,
  reward_qi integer not null default 25,
  reward_chest_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.league_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  league_tier_id text not null references public.league_tiers(id),
  current_week_key text not null,
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  rank_position integer,
  promoted_last_week boolean not null default false,
  relegated_last_week boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists league_memberships_tier_week_idx
  on public.league_memberships (league_tier_id, current_week_key, weekly_xp desc);

create table if not exists public.league_weekly_results (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_tier_id text not null references public.league_tiers(id),
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  final_rank integer not null check (final_rank > 0),
  movement text not null check (movement in ('promoted', 'stayed', 'demoted')),
  reward_claimed boolean not null default false,
  reward_qi integer not null default 0,
  reward_chest_type text,
  created_at timestamptz not null default now(),
  unique (week_key, user_id)
);

create index if not exists league_weekly_results_user_idx
  on public.league_weekly_results (user_id, created_at desc);

-- Idempotência: uma fonte de XP não pode contar duas vezes na mesma semana.
create table if not exists public.league_xp_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_key text not null,
  source_key text not null,
  amount integer not null check (amount > 0 and amount <= 500),
  created_at timestamptz not null default now(),
  primary key (user_id, source_key)
);

-- ---------------------------------------------------------------------------
-- Seed: 7 divisões
-- ---------------------------------------------------------------------------

insert into public.league_tiers (
  id, name, order_index, icon, color, description,
  level_min, level_max, promotion_count, relegation_count, reward_qi, reward_chest_type
) values
  ('bronze', 'Liga Bronze', 1, 'shield', '#8B6914',
   'Primeiros passos. Aprenda o ritmo semanal.', 0, 4, 5, 5, 25, null),
  ('prata', 'Liga Prata', 2, 'star', '#9AA3AF',
   'Consistência básica na jornada.', 5, 14, 5, 5, 40, null),
  ('ouro', 'Liga Ouro', 3, 'star', '#C6971E',
   'Estudo regular em vários dias.', 15, 29, 5, 5, 60, null),
  ('jade', 'Liga Jade', 4, 'gem', '#2F855A',
   'Ritmo forte e revisão frequente.', 30, 49, 5, 5, 80, 'small'),
  ('dragao', 'Liga Dragão', 5, 'dragon', '#B7791F',
   'Divisão avançada para quem estuda todo dia.', 50, 74, 5, 5, 100, 'small'),
  ('mestre', 'Liga Mestre', 6, 'crown', '#6B46C1',
   'Elite semanal. Poucos chegam aqui.', 75, 99, 5, 5, 120, 'dragon'),
  ('celestial', 'Liga Celestial', 7, 'sun', '#E53E3E',
   'O topo. Mantenha a coroa.', 100, 999, 0, 5, 150, 'dragon')
on conflict (id) do update set
  name = excluded.name,
  order_index = excluded.order_index,
  icon = excluded.icon,
  color = excluded.color,
  description = excluded.description,
  level_min = excluded.level_min,
  level_max = excluded.level_max,
  promotion_count = excluded.promotion_count,
  relegation_count = excluded.relegation_count,
  reward_qi = excluded.reward_qi,
  reward_chest_type = excluded.reward_chest_type;

-- ---------------------------------------------------------------------------
-- Helpers (semana ISO alinhada ao cliente: YYYY-Www)
-- ---------------------------------------------------------------------------

create or replace function public.iso_week_key(p_at timestamptz default now())
returns text
language sql
stable
as $$
  select to_char(timezone('UTC', p_at), 'IYYY-"W"IW');
$$;

create or replace function public.week_ends_at(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('week', timezone('UTC', p_at) + interval '1 day') + interval '6 days'
  ) at time zone 'UTC';
$$;

-- ---------------------------------------------------------------------------
-- Recalcular posições dentro de uma divisão/semana
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_league_ranks(
  p_tier_id text,
  p_week_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select
      user_id,
      row_number() over (
        order by weekly_xp desc, updated_at asc, user_id asc
      )::integer as rn
    from public.league_memberships
    where league_tier_id = p_tier_id
      and current_week_key = p_week_key
  )
  update public.league_memberships m
  set rank_position = r.rn,
      updated_at = now()
  from ranked r
  where m.user_id = r.user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Garantir membership na liga (Bronze por padrão)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_league_membership(p_user_id uuid default auth.uid())
returns public.league_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := public.iso_week_key();
  v_row public.league_memberships;
begin
  if p_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.league_memberships
  where user_id = p_user_id;

  if not found then
    insert into public.league_memberships (
      user_id, league_tier_id, current_week_key, weekly_xp
    ) values (
      p_user_id, 'bronze', v_week, 0
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalizar semana anterior e aplicar promoção/rebaixamento
-- ---------------------------------------------------------------------------

create or replace function public.finalize_league_week_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := public.iso_week_key();
  v_m public.league_memberships;
  v_tier public.league_tiers;
  v_total integer;
  v_rank integer;
  v_movement text := 'stayed';
  v_next_tier text;
  v_reward_qi integer;
  v_reward_chest text;
begin
  select * into v_m from public.league_memberships where user_id = p_user_id;
  if not found or v_m.current_week_key = v_week then
    return;
  end if;

  select * into v_tier from public.league_tiers where id = v_m.league_tier_id;

  perform public.recalculate_league_ranks(v_m.league_tier_id, v_m.current_week_key);

  select count(*)::integer, coalesce(max(rank_position), 1)
  into v_total, v_rank
  from public.league_memberships
  where league_tier_id = v_m.league_tier_id
    and current_week_key = v_m.current_week_key;

  select rank_position into v_rank
  from public.league_memberships
  where user_id = p_user_id;

  v_rank := coalesce(v_rank, v_total);

  if v_tier.promotion_count > 0
     and v_rank <= v_tier.promotion_count
     and v_tier.order_index < (select max(order_index) from public.league_tiers) then
    v_movement := 'promoted';
    select id into v_next_tier
    from public.league_tiers
    where order_index = v_tier.order_index + 1;
  elsif v_rank > v_total - v_tier.relegation_count
        and v_tier.order_index > (select min(order_index) from public.league_tiers) then
    v_movement := 'demoted';
    select id into v_next_tier
    from public.league_tiers
    where order_index = v_tier.order_index - 1;
  else
    v_next_tier := v_m.league_tier_id;
  end if;

  v_reward_qi := v_tier.reward_qi;
  v_reward_chest := v_tier.reward_chest_type;

  insert into public.league_weekly_results (
    week_key, user_id, league_tier_id, weekly_xp, final_rank,
    movement, reward_qi, reward_chest_type
  ) values (
    v_m.current_week_key, p_user_id, v_m.league_tier_id,
    v_m.weekly_xp, v_rank, v_movement, v_reward_qi, v_reward_chest
  )
  on conflict (week_key, user_id) do nothing;

  update public.league_memberships
  set
    league_tier_id = v_next_tier,
    current_week_key = v_week,
    weekly_xp = 0,
    rank_position = null,
    promoted_last_week = (v_movement = 'promoted'),
    relegated_last_week = (v_movement = 'demoted'),
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sincronizar semana (chamado ao abrir Ligas ou ganhar XP)
-- ---------------------------------------------------------------------------

create or replace function public.sync_league_week(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.league_memberships;
  v_week text := public.iso_week_key();
begin
  if p_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.ensure_league_membership(p_user_id);
  perform public.finalize_league_week_for_user(p_user_id);

  select * into v_m from public.league_memberships where user_id = p_user_id;

  if v_m.current_week_key <> v_week then
    update public.league_memberships
    set current_week_key = v_week, weekly_xp = 0, rank_position = null, updated_at = now()
    where user_id = p_user_id;
    select * into v_m from public.league_memberships where user_id = p_user_id;
  end if;

  perform public.recalculate_league_ranks(v_m.league_tier_id, v_m.current_week_key);

  return jsonb_build_object(
    'week_key', v_m.current_week_key,
    'tier_id', v_m.league_tier_id,
    'weekly_xp', v_m.weekly_xp,
    'rank_position', (
      select rank_position from public.league_memberships where user_id = p_user_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Adicionar XP semanal (controlado, idempotente)
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
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_source_key is null or length(trim(p_source_key)) < 3 then
    raise exception 'invalid source key';
  end if;

  v_amount := greatest(0, least(coalesce(p_amount, 0), 500));
  if v_amount <= 0 then
    return jsonb_build_object('added', 0, 'reason', 'zero_amount');
  end if;

  perform public.sync_league_week(v_user_id);

  select * into v_m from public.league_memberships where user_id = v_user_id;

  if v_m.weekly_xp >= v_weekly_cap then
    return jsonb_build_object('added', 0, 'reason', 'weekly_cap');
  end if;

  v_amount := least(v_amount, v_weekly_cap - v_m.weekly_xp);

  insert into public.league_xp_events (user_id, week_key, source_key, amount)
  values (v_user_id, v_week, trim(p_source_key), v_amount)
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
-- Ranking público da liga do usuário (sem email)
-- ---------------------------------------------------------------------------

create or replace function public.get_league_standings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_m public.league_memberships;
  v_tier public.league_tiers;
  v_week text;
  v_standings jsonb;
  v_last_week jsonb;
  v_history jsonb;
  v_is_pro boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.sync_league_week(v_user_id);

  select * into v_m from public.league_memberships where user_id = v_user_id;
  select * into v_tier from public.league_tiers where id = v_m.league_tier_id;
  v_week := v_m.current_week_key;

  select exists (
    select 1 from public.subscriptions s
    where s.user_id = v_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) into v_is_pro;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.rank nulls last), '[]'::jsonb)
  into v_standings
  from (
    select
      m.user_id,
      coalesce(nullif(trim(p.name), ''), 'Aluno') as display_name,
      left(coalesce(nullif(trim(p.name), ''), 'A'), 1) as avatar_letter,
      m.weekly_xp,
      m.rank_position as rank,
      coalesce(up.streak, 0) as streak,
      (m.user_id = v_user_id) as is_me,
      exists (
        select 1 from public.subscriptions sub
        where sub.user_id = m.user_id
          and sub.status in ('active', 'trialing')
          and (sub.current_period_end is null or sub.current_period_end > now())
      ) as is_pro
    from public.league_memberships m
    join public.profiles p on p.id = m.user_id
    left join public.user_progress up on up.user_id = m.user_id
    where m.league_tier_id = v_m.league_tier_id
      and m.current_week_key = v_week
    order by m.rank_position nulls last, m.weekly_xp desc, m.user_id
    limit 30
  ) t;

  select jsonb_build_object(
    'week_key', r.week_key,
    'tier_id', r.league_tier_id,
    'weekly_xp', r.weekly_xp,
    'final_rank', r.final_rank,
    'movement', r.movement,
    'reward_claimed', r.reward_claimed,
    'reward_qi', r.reward_qi,
    'reward_chest_type', r.reward_chest_type
  )
  into v_last_week
  from public.league_weekly_results r
  where r.user_id = v_user_id
  order by r.created_at desc
  limit 1;

  if v_is_pro then
    select coalesce(jsonb_agg(jsonb_build_object(
      'week_key', r.week_key,
      'tier_id', r.league_tier_id,
      'weekly_xp', r.weekly_xp,
      'final_rank', r.final_rank,
      'movement', r.movement,
      'reward_claimed', r.reward_claimed
    ) order by r.created_at desc), '[]'::jsonb)
    into v_history
    from (
      select * from public.league_weekly_results
      where user_id = v_user_id
      order by created_at desc
      limit 12
    ) r;
  end if;

  return jsonb_build_object(
    'mode', 'live',
    'week_key', v_week,
    'reset_at', public.week_ends_at(),
    'tier', jsonb_build_object(
      'id', v_tier.id,
      'name', v_tier.name,
      'icon', v_tier.icon,
      'color', v_tier.color,
      'description', v_tier.description,
      'promotion_count', v_tier.promotion_count,
      'relegation_count', v_tier.relegation_count,
      'reward_qi', v_tier.reward_qi,
      'reward_chest_type', v_tier.reward_chest_type,
      'order_index', v_tier.order_index
    ),
    'membership', jsonb_build_object(
      'weekly_xp', v_m.weekly_xp,
      'rank_position', v_m.rank_position,
      'promoted_last_week', v_m.promoted_last_week,
      'relegated_last_week', v_m.relegated_last_week,
      'is_pro', v_is_pro
    ),
    'standings', v_standings,
    'last_week', v_last_week,
    'pro_history', case when v_is_pro then v_history else null end
  );
end;
$$;

-- Reivindicar recompensa da semana passada
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

  update public.league_weekly_results
  set reward_claimed = true
  where id = v_row.id;

  update public.user_economy
  set qi = qi + v_qi, updated_at = now()
  where user_id = v_user_id;

  return jsonb_build_object(
    'claimed', true,
    'qi', v_qi,
    'chest_type', v_row.reward_chest_type,
    'is_pro_bonus', v_is_pro
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.league_tiers enable row level security;
alter table public.league_memberships enable row level security;
alter table public.league_weekly_results enable row level security;
alter table public.league_xp_events enable row level security;

-- Tiers: leitura pública para usuários autenticados
drop policy if exists "league_tiers_select_authenticated" on public.league_tiers;
create policy "league_tiers_select_authenticated"
  on public.league_tiers for select to authenticated using (true);

-- Memberships: leitura do próprio registro + colegas da mesma divisão/semana
drop policy if exists "league_memberships_select_peers" on public.league_memberships;
create policy "league_memberships_select_peers"
  on public.league_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or (
      league_tier_id = (select league_tier_id from public.league_memberships where user_id = auth.uid())
      and current_week_key = (select current_week_key from public.league_memberships where user_id = auth.uid())
    )
  );

-- Sem INSERT/UPDATE/DELETE direto pelo cliente — apenas RPC security definer

drop policy if exists "league_weekly_results_select_own" on public.league_weekly_results;
create policy "league_weekly_results_select_own"
  on public.league_weekly_results for select to authenticated
  using (user_id = auth.uid());

-- league_xp_events: sem políticas = bloqueado para cliente (só RPC)

-- Grants para RPC
grant execute on function public.sync_league_week(uuid) to authenticated;
grant execute on function public.add_league_weekly_xp(integer, text) to authenticated;
grant execute on function public.get_league_standings() to authenticated;
grant execute on function public.claim_league_week_reward(text) to authenticated;
grant execute on function public.ensure_league_membership(uuid) to authenticated;

revoke all on function public.recalculate_league_ranks(text, text) from public;
revoke all on function public.finalize_league_week_for_user(uuid) from public;

-- Novos usuários entram automaticamente na Liga Bronze.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, native_language, target_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Aluno Longyu'),
    coalesce(new.raw_user_meta_data->>'native_language', 'pt-BR'),
    coalesce(new.raw_user_meta_data->>'target_language', 'zh-CN')
  )
  on conflict (id) do nothing;

  insert into public.league_memberships (user_id, league_tier_id, current_week_key, weekly_xp)
  values (new.id, 'bronze', public.iso_week_key(), 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários já cadastrados entram na Liga Bronze (sem duplicar).
insert into public.league_memberships (user_id, league_tier_id, current_week_key, weekly_xp)
select
  p.id,
  'bronze',
  public.iso_week_key(),
  greatest(0, coalesce(up.weekly_xp, 0))
from public.profiles p
left join public.user_progress up on up.user_id = p.id
on conflict (user_id) do nothing;


-- 005_feedback_reports.sql
-- Feedback interno: relatos de beta salvos no Supabase com RLS.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in (
    'bug',
    'conteúdo incorreto',
    'dificuldade pedagógica',
    'design',
    'sugestão',
    'conta/sync',
    'pagamento',
    'outro'
  )),
  severity text not null check (severity in ('baixa', 'média', 'alta', 'bloqueadora')),
  message text not null check (char_length(trim(message)) between 10 and 4000),
  expected_behavior text check (expected_behavior is null or char_length(trim(expected_behavior)) <= 2000),
  route text not null default '',
  lesson_id text,
  step_id text,
  app_version text not null default '',
  build_sha text not null default '',
  browser text not null default '',
  platform text not null default '',
  viewport text not null default '',
  status text not null default 'novo' check (status in (
    'novo',
    'analisando',
    'reproduzido',
    'corrigido',
    'não reproduzido',
    'encerrado'
  )),
  admin_notes text,
  submitter_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_reports_user_id_idx on public.feedback_reports (user_id);
create index if not exists feedback_reports_status_idx on public.feedback_reports (status);
create index if not exists feedback_reports_created_at_idx on public.feedback_reports (created_at desc);
create index if not exists feedback_reports_submitter_hash_idx on public.feedback_reports (submitter_hash, created_at desc)
  where user_id is null;

create or replace function public.touch_feedback_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_reports_set_updated_at on public.feedback_reports;
create trigger feedback_reports_set_updated_at
  before update on public.feedback_reports
  for each row execute function public.touch_feedback_reports_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.feedback_reports enable row level security;

-- Usuário autenticado insere apenas relatos próprios.
create policy "feedback_reports_insert_own"
  on public.feedback_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Usuário comum não lê relatos (nem os próprios) — confirmação vem do retorno do insert.
-- Somente admin lista e atualiza.
create policy "feedback_reports_select_admin"
  on public.feedback_reports
  for select
  to authenticated
  using (public.is_admin());

create policy "feedback_reports_update_admin"
  on public.feedback_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 006_app_error_reports.sql
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

