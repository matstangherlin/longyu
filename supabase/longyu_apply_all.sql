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


-- 006_economy_server.sql
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


-- 007_internal_test_pro.sql
-- Contas internas de QA com Pro sem Stripe.
-- Mantém a regra de produção: preview local não libera Pro; só servidor.

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) in ('teste@longyu.app')
  )
  or exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke all on function public.economy_user_is_pro(uuid) from public;
grant execute on function public.economy_user_is_pro(uuid) to authenticated;


-- 008_server_entitlement_rpc.sql
-- RPC autoritativo de Pro: assinatura real + contas internas de QA.
-- O cliente chama com JWT; não depende de preview local.

create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_is_pro boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none');
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email in ('teste@longyu.app') then
    v_is_pro := true;
  elsif exists (
    select 1
    from public.subscriptions s
    where s.user_id = v_uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    v_is_pro := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'is_pro', v_is_pro,
    'source', case when v_is_pro then 'server' else 'none' end
  );
end;
$$;

revoke all on function public.get_server_entitlement() from public;
grant execute on function public.get_server_entitlement() to authenticated;

-- Garante assinatura Pro da conta de QA (idempotente).
insert into public.subscriptions (
  user_id,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  updated_at
)
select
  u.id,
  'active',
  'internal_test_longyu_pro',
  now(),
  '2030-01-01T00:00:00+00'::timestamptz,
  false,
  now()
from auth.users u
where lower(u.email) = lower('teste@longyu.app')
on conflict (stripe_subscription_id) do update
set
  user_id = excluded.user_id,
  status = 'active',
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = false,
  updated_at = now();

