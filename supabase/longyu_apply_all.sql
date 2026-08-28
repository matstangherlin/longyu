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


-- 005_social.sql
-- Social: follows, public profiles, activity feed (Fase social leve).

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_key text,
  add column if not exists league_tier text not null default 'jade',
  add column if not exists public_weekly_xp integer not null default 0,
  add column if not exists public_streak integer not null default 0,
  add column if not exists show_in_search boolean not null default true;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_follower_idx on public.user_follows (follower_id);
create index if not exists user_follows_following_idx on public.user_follows (following_id);

create table if not exists public.social_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('lesson_complete', 'league_up', 'streak', 'achievement')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists social_activity_events_user_created_idx
  on public.social_activity_events (user_id, created_at desc);

-- Espelha stats públicos a partir do snapshot do cliente (sem expor o snapshot).
create or replace function public.sync_profile_public_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  progress jsonb;
begin
  if new.client_snapshot is null then
    return new;
  end if;

  progress := new.client_snapshot -> 'progress';

  update public.profiles
  set
    name = coalesce(nullif(trim(new.client_snapshot -> 'account' ->> 'name'), ''), name),
    league_tier = coalesce(nullif(progress ->> 'leagueTier', ''), league_tier),
    public_weekly_xp = greatest(0, coalesce((progress ->> 'weeklyXp')::integer, public_weekly_xp)),
    public_streak = greatest(0, coalesce((progress ->> 'streak')::integer, public_streak)),
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_public_stats on public.user_progress;
create trigger trg_sync_profile_public_stats
  after insert or update of client_snapshot on public.user_progress
  for each row
  execute function public.sync_profile_public_stats();

create or replace view public.public_profiles
with (security_invoker = true) as
select
  p.id as user_id,
  p.name as display_name,
  p.username,
  p.avatar_key,
  p.league_tier,
  p.public_weekly_xp as weekly_xp,
  p.public_streak as streak,
  p.created_at as joined_at,
  p.show_in_search
from public.profiles p
where p.username is not null;

-- Busca segura: só campos públicos; respeita privacidade de busca.
create or replace function public.search_public_profiles(search_query text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_key text,
  league_tier text,
  weekly_xp integer,
  streak integer,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid)
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_key,
    p.league_tier,
    p.weekly_xp,
    p.streak,
    p.joined_at
  from public.public_profiles p
  cross join me
  where
    p.user_id <> me.uid
    and (
      p.show_in_search = true
      or exists (
        select 1 from public.user_follows f
        where f.follower_id = me.uid and f.following_id = p.user_id
      )
    )
    and (
      p.username ilike '%' || trim(search_query) || '%'
      or p.display_name ilike '%' || trim(search_query) || '%'
    )
  order by p.weekly_xp desc, p.display_name asc
  limit 24;
$$;

create or replace function public.get_public_profile_by_username(target_username text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_key text,
  league_tier text,
  weekly_xp integer,
  streak integer,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_key,
    p.league_tier,
    p.weekly_xp,
    p.streak,
    p.joined_at
  from public.public_profiles p
  where lower(p.username) = lower(trim(target_username))
  limit 1;
$$;

alter table public.user_follows enable row level security;
alter table public.social_activity_events enable row level security;

drop policy if exists "profiles_select_social" on public.profiles;
create policy "profiles_select_social"
on public.profiles for select
to authenticated
using (
  auth.uid() = id
  or (
    username is not null
    and (
      show_in_search = true
      or exists (
        select 1 from public.user_follows f
        where f.follower_id = auth.uid() and f.following_id = profiles.id
      )
      or exists (
        select 1 from public.user_follows f
        where f.following_id = auth.uid() and f.follower_id = profiles.id
      )
    )
  )
);

create policy "user_follows_select_own"
on public.user_follows for select
to authenticated
using (follower_id = auth.uid() or following_id = auth.uid());

create policy "user_follows_insert_own"
on public.user_follows for insert
to authenticated
with check (follower_id = auth.uid() and following_id <> auth.uid());

create policy "user_follows_delete_own"
on public.user_follows for delete
to authenticated
using (follower_id = auth.uid());

create policy "social_activity_insert_own"
on public.social_activity_events for insert
to authenticated
with check (user_id = auth.uid());

create policy "social_activity_select_friends"
on public.social_activity_events for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_follows f
    where f.follower_id = auth.uid() and f.following_id = social_activity_events.user_id
  )
);

grant select on public.public_profiles to authenticated;
grant execute on function public.search_public_profiles(text) to authenticated;
grant execute on function public.get_public_profile_by_username(text) to authenticated;


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


-- 009_profile_admin.sql
-- Perfil expandido + visão admin para consultar usuários e plano Pro.
-- A view admin_user_overview não é exposta via API (sem grant para anon/authenticated).

alter table public.profiles
  add column if not exists country text,
  add column if not exists signup_source text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists phone text;

comment on column public.profiles.country is 'País informado no cadastro.';
comment on column public.profiles.signup_source is 'Como o usuário conheceu o Longyu.';
comment on column public.profiles.marketing_opt_in is 'Opt-in para emails de novidades/ofertas.';

create or replace view public.admin_user_overview
with (security_invoker = true) as
select
  u.id as user_id,
  u.email,
  u.created_at as conta_criada_em,
  u.last_sign_in_at as ultimo_login_em,
  p.name,
  p.birth_date,
  case
    when p.birth_date is not null then extract(year from age(p.birth_date::timestamp))::integer
    else null
  end as idade_aprox,
  p.country,
  p.signup_source,
  p.marketing_opt_in,
  p.onboarding_completed,
  p.native_language,
  p.target_language,
  s.status as assinatura_status,
  s.stripe_subscription_id,
  s.current_period_end as pro_valido_ate,
  s.cancel_at_period_end,
  case
    when lower(u.email) = 'teste@longyu.app' then 'pro_interno'
    when s.status = 'trialing' then 'trial'
    when s.status = 'active' then 'pro'
    when s.status = 'canceled' and s.current_period_end > now() then 'pro_cancelando'
    else 'gratuito'
  end as plano_label,
  coalesce(up.xp_total, 0) as xp_total,
  coalesce(cardinality(up.completed_lessons), 0) as licoes_concluidas,
  coalesce(up.streak, 0) as streak
from auth.users u
left join public.profiles p on p.id = u.id
left join lateral (
  select status, stripe_subscription_id, current_period_end, cancel_at_period_end
  from public.subscriptions
  where user_id = u.id
  order by updated_at desc
  limit 1
) s on true
left join public.user_progress up on up.user_id = u.id
order by u.created_at desc;

revoke all on public.admin_user_overview from anon, authenticated;
revoke all on public.admin_user_overview from public;

comment on view public.admin_user_overview is
  'Visão operacional: usuários, perfil, plano e progresso. Consulte no SQL Editor do Supabase (não exposta à API pública).';

-- Consulta rápida sugerida no SQL Editor:
-- select email, name, plano_label, idade_aprox, country, xp_total, licoes_concluidas from public.admin_user_overview;


-- 010_beta_feedback.sql
-- Beta feedback + eventos pedagógicos (Longyu beta).
-- Inserção via RPCs com rate-limit; usuário só lê o próprio feedback;
-- status/admin_note só via is_beta_admin().

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------

create table if not exists public.beta_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.beta_admins enable row level security;

create policy "beta_admins_select_self"
  on public.beta_admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.beta_admins a
    where a.user_id = auth.uid()
  )
  or exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) in (
        'teste@longyu.app',
        'admin@longyu.app',
        'matheus.stangherlin@hotmail.com',
        'minemoostraa@gmail.com'
      )
  );
$$;

revoke all on function public.is_beta_admin() from public;
grant execute on function public.is_beta_admin() to authenticated, anon;

-- Seed operacional (idempotente): promove e-mails internos se a conta existir.
insert into public.beta_admins (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) in (
  'teste@longyu.app',
  'admin@longyu.app',
  'matheus.stangherlin@hotmail.com',
  'minemoostraa@gmail.com'
)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_profile_id text,
  category text not null,
  message text not null,
  route text not null default '',
  lesson_id text,
  exercise_kind text,
  exercise_index integer,
  app_version text not null default '',
  browser text not null default '',
  viewport text not null default '',
  created_at timestamptz not null default now(),
  status text not null default 'new',
  admin_note text,
  client_dedupe_key text,
  constraint beta_feedback_category_check check (
    category in (
      'erro_conteudo',
      'traducao',
      'pinyin',
      'audio',
      'imagem',
      'exercicio_confuso',
      'erro_tecnico',
      'sugestao',
      'outro'
    )
  ),
  constraint beta_feedback_status_check check (
    status in ('new', 'investigating', 'resolved', 'wontfix', 'duplicate')
  ),
  constraint beta_feedback_message_len check (char_length(message) between 3 and 4000),
  constraint beta_feedback_identity_check check (
    user_id is not null or (local_profile_id is not null and length(local_profile_id) > 0)
  )
);

create unique index if not exists beta_feedback_dedupe_uidx
  on public.beta_feedback (client_dedupe_key)
  where client_dedupe_key is not null;

create index if not exists beta_feedback_created_idx
  on public.beta_feedback (created_at desc);

create index if not exists beta_feedback_status_idx
  on public.beta_feedback (status, created_at desc);

create index if not exists beta_feedback_lesson_idx
  on public.beta_feedback (lesson_id, created_at desc);

create index if not exists beta_feedback_category_idx
  on public.beta_feedback (category, created_at desc);

create index if not exists beta_feedback_user_idx
  on public.beta_feedback (user_id, created_at desc);

alter table public.beta_feedback enable row level security;

create policy "beta_feedback_select_own"
  on public.beta_feedback
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_beta_admin());

-- Inserts/updates de status passam pelas RPCs (security definer).
-- Sem policy de insert/update direto: usuário não altera status/admin_note.

-- ---------------------------------------------------------------------------
-- Pedagogy events
-- ---------------------------------------------------------------------------

create table if not exists public.beta_pedagogy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_profile_id text,
  event_type text not null,
  lesson_id text,
  exercise_kind text,
  exercise_index integer,
  route text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  client_dedupe_key text,
  constraint beta_pedagogy_event_type_check check (
    event_type in (
      'lesson_started',
      'lesson_completed',
      'exercise_answered',
      'exercise_mistake',
      'exercise_skipped',
      'conversation_completed',
      'image_exercise_answered',
      'lesson_abandoned'
    )
  )
);

create unique index if not exists beta_pedagogy_events_dedupe_uidx
  on public.beta_pedagogy_events (client_dedupe_key)
  where client_dedupe_key is not null;

create index if not exists beta_pedagogy_events_type_idx
  on public.beta_pedagogy_events (event_type, created_at desc);

create index if not exists beta_pedagogy_events_lesson_idx
  on public.beta_pedagogy_events (lesson_id, event_type, created_at desc);

alter table public.beta_pedagogy_events enable row level security;

create policy "beta_pedagogy_events_select_admin"
  on public.beta_pedagogy_events
  for select
  to authenticated
  using (public.is_beta_admin());

-- ---------------------------------------------------------------------------
-- Rate limit helper
-- ---------------------------------------------------------------------------

create or replace function public.beta_feedback_rate_limited(
  p_user_id uuid,
  p_local_profile_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  recent_minute integer;
  recent_hour integer;
begin
  select count(*) into recent_minute
  from public.beta_feedback f
  where f.created_at > now() - interval '60 seconds'
    and (
      (p_user_id is not null and f.user_id = p_user_id)
      or (p_local_profile_id is not null and f.local_profile_id = p_local_profile_id)
    );

  if recent_minute >= 1 then
    return true;
  end if;

  select count(*) into recent_hour
  from public.beta_feedback f
  where f.created_at > now() - interval '1 hour'
    and (
      (p_user_id is not null and f.user_id = p_user_id)
      or (p_local_profile_id is not null and f.local_profile_id = p_local_profile_id)
    );

  return recent_hour >= 8;
end;
$$;

revoke all on function public.beta_feedback_rate_limited(uuid, text) from public;
grant execute on function public.beta_feedback_rate_limited(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Submit feedback RPC
-- ---------------------------------------------------------------------------

create or replace function public.submit_beta_feedback(
  p_category text,
  p_message text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_app_version text default '',
  p_browser text default '',
  p_viewport text default '',
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_id uuid;
  v_msg text := trim(coalesce(p_message, ''));
  v_cat text := trim(coalesce(p_category, ''));
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_cat not in (
    'erro_conteudo', 'traducao', 'pinyin', 'audio', 'imagem',
    'exercicio_confuso', 'erro_tecnico', 'sugestao', 'outro'
  ) then
    raise exception 'invalid_category';
  end if;

  if char_length(v_msg) < 3 or char_length(v_msg) > 4000 then
    raise exception 'invalid_message';
  end if;

  -- Nunca aceitar payloads que pareçam vazar segredos.
  if v_msg ~* '(password|senha|token|apikey|api_key|service_role|localStorage|supabase)' then
    raise exception 'forbidden_content';
  end if;

  if public.beta_feedback_rate_limited(v_uid, v_local) then
    raise exception 'rate_limited';
  end if;

  if p_client_dedupe_key is not null then
    select id into v_id
    from public.beta_feedback
    where client_dedupe_key = p_client_dedupe_key
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.beta_feedback (
    user_id,
    local_profile_id,
    category,
    message,
    route,
    lesson_id,
    exercise_kind,
    exercise_index,
    app_version,
    browser,
    viewport,
    status,
    client_dedupe_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_cat,
    v_msg,
    left(coalesce(p_route, ''), 300),
    nullif(left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    left(coalesce(p_app_version, ''), 40),
    left(coalesce(p_browser, ''), 240),
    left(coalesce(p_viewport, ''), 40),
    'new',
    nullif(p_client_dedupe_key, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) from public;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Pedagogy event RPC
-- ---------------------------------------------------------------------------

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_type not in (
    'lesson_started', 'lesson_completed', 'exercise_answered', 'exercise_mistake',
    'exercise_skipped', 'conversation_completed', 'image_exercise_answered', 'lesson_abandoned'
  ) then
    raise exception 'invalid_event_type';
  end if;

  -- Remove chaves sensíveis se o cliente enviar por engano.
  v_meta := v_meta - array[
    'password', 'senha', 'token', 'access_token', 'refresh_token',
    'apiKey', 'api_key', 'service_role', 'localStorage', 'freeTextAnswer', 'answerText'
  ];

  if p_client_dedupe_key is not null then
    select id into v_id
    from public.beta_pedagogy_events
    where client_dedupe_key = p_client_dedupe_key
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    nullif(left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    left(coalesce(p_route, ''), 300),
    v_meta,
    nullif(p_client_dedupe_key, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) from public;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Admin update RPC (status + note only)
-- ---------------------------------------------------------------------------

create or replace function public.update_beta_feedback_admin(
  p_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_beta_admin() then
    raise exception 'not_admin';
  end if;

  if p_status not in ('new', 'investigating', 'resolved', 'wontfix', 'duplicate') then
    raise exception 'invalid_status';
  end if;

  update public.beta_feedback
  set
    status = p_status,
    admin_note = case
      when p_admin_note is null then admin_note
      else left(trim(p_admin_note), 2000)
    end
  where id = p_id;

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.update_beta_feedback_admin(uuid, text, text) from public;
grant execute on function public.update_beta_feedback_admin(uuid, text, text) to authenticated;

comment on table public.beta_feedback is
  'Feedback beta: inserção via submit_beta_feedback; status/admin_note só admin.';
comment on table public.beta_pedagogy_events is
  'Eventos pedagógicos agregáveis; sem respostas livres.';


-- 011_pedagogy_analytics_consent.sql
-- Consentimento de analytics pedagógicos no perfil (não só localStorage).
-- Default false: o aluno precisa escolher explicitamente.

alter table public.profiles
  add column if not exists pedagogy_analytics_consent boolean not null default false,
  add column if not exists pedagogy_analytics_consented_at timestamptz,
  add column if not exists pedagogy_analytics_revoked_at timestamptz;

comment on column public.profiles.pedagogy_analytics_consent is
  'Opt-in para eventos pedagógicos anônimos de melhoria do curso.';
comment on column public.profiles.pedagogy_analytics_consented_at is
  'Quando o aluno permitiu dados de melhoria pela última vez.';
comment on column public.profiles.pedagogy_analytics_revoked_at is
  'Quando o aluno revogou o consentimento pela última vez.';

-- Aluno autenticado pode atualizar só o próprio consentimento (já há policy de update own).
-- Garante default false em linhas antigas sem a coluna.
update public.profiles
set pedagogy_analytics_consent = false
where pedagogy_analytics_consent is distinct from true
  and pedagogy_analytics_consented_at is null;


-- 012_pedagogy_consent_rpc_gate.sql
-- Completa o opt-in pedagógico no servidor:
-- 1) RPC rejeita insert se o usuário autenticado não consentiu
-- 2) Allowlist de event_type alinhada ao cliente (conversation_*)
-- 3) Visão admin inclui consentimento

-- ---------------------------------------------------------------------------
-- Allowlist de tipos (alinha com PEDAGOGY_EVENT_TYPES no app)
-- ---------------------------------------------------------------------------

alter table public.beta_pedagogy_events
  drop constraint if exists beta_pedagogy_event_type_check;

alter table public.beta_pedagogy_events
  add constraint beta_pedagogy_event_type_check check (
    event_type in (
      'lesson_started',
      'lesson_completed',
      'exercise_answered',
      'exercise_mistake',
      'exercise_skipped',
      'conversation_shown',
      'conversation_completed',
      'conversation_repeated',
      'conversation_error',
      'image_exercise_answered',
      'lesson_abandoned'
    )
  );

-- ---------------------------------------------------------------------------
-- RPC com gate de consentimento (usuário autenticado)
-- Anônimos com local_profile_id seguem confiando no cliente (sem perfil).
-- ---------------------------------------------------------------------------

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_consent boolean;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  -- Autenticado: só grava com opt-in explícito no perfil.
  if v_uid is not null then
    select coalesce(p.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles p
    where p.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'image_exercise_answered',
    'lesson_abandoned'
  ) then
    raise exception 'invalid_event_type';
  end if;

  -- Remove chaves sensíveis se o cliente enviar por engano.
  v_meta := v_meta - array[
    'password', 'senha', 'token', 'access_token', 'refresh_token',
    'apiKey', 'api_key', 'service_role', 'localStorage', 'freeTextAnswer',
    'answerText', 'answer', 'typedAnswer', 'freeText', 'responseText', 'userInput'
  ];

  if p_client_dedupe_key is not null then
    select id into v_id
    from public.beta_pedagogy_events
    where client_dedupe_key = p_client_dedupe_key
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    nullif(left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    left(coalesce(p_route, ''), 300),
    v_meta,
    nullif(p_client_dedupe_key, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) from public;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) to authenticated, anon;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) is
  'Insere evento pedagógico. Usuário autenticado exige profiles.pedagogy_analytics_consent = true.';

-- ---------------------------------------------------------------------------
-- Admin overview: colunas de consentimento
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE VIEW cannot rename columns (42P16). Fresh replay must drop first.

drop view if exists public.admin_user_overview;

create view public.admin_user_overview
with (security_invoker = true) as
select
  u.id as user_id,
  u.email,
  u.created_at as conta_criada_em,
  u.last_sign_in_at as ultimo_login_em,
  p.name,
  p.birth_date,
  case
    when p.birth_date is not null then extract(year from age(p.birth_date::timestamp))::integer
    else null
  end as idade_aprox,
  p.country,
  p.signup_source,
  p.marketing_opt_in,
  p.pedagogy_analytics_consent,
  p.pedagogy_analytics_consented_at,
  p.pedagogy_analytics_revoked_at,
  p.onboarding_completed,
  p.native_language,
  p.target_language,
  s.status as assinatura_status,
  s.stripe_subscription_id,
  s.current_period_end as pro_valido_ate,
  s.cancel_at_period_end,
  case
    when lower(u.email) = 'teste@longyu.app' then 'pro_interno'
    when s.status = 'trialing' then 'trial'
    when s.status = 'active' then 'pro'
    when s.status = 'canceled' and s.current_period_end > now() then 'pro_cancelando'
    else 'gratuito'
  end as plano_label,
  coalesce(up.xp_total, 0) as xp_total,
  coalesce(cardinality(up.completed_lessons), 0) as licoes_concluidas,
  coalesce(up.streak, 0) as streak
from auth.users u
left join public.profiles p on p.id = u.id
left join lateral (
  select status, stripe_subscription_id, current_period_end, cancel_at_period_end
  from public.subscriptions
  where user_id = u.id
  order by updated_at desc
  limit 1
) s on true
left join public.user_progress up on up.user_id = u.id
order by u.created_at desc;

revoke all on public.admin_user_overview from anon, authenticated;
revoke all on public.admin_user_overview from public;


-- 013_pedagogy_rpc_hardening.sql
-- Hardening de beta_pedagogy_events / submit_beta_pedagogy_event
-- Rate limit, whitelist de metadata, tamanhos, identidade anônima complementar,
-- retenção 90 dias. Não armazena IP.

-- ---------------------------------------------------------------------------
-- Colunas auxiliares (sem IP)
-- ---------------------------------------------------------------------------

alter table public.beta_pedagogy_events
  add column if not exists client_context_digest text,
  add column if not exists rate_bucket_key text;

comment on column public.beta_pedagogy_events.client_context_digest is
  'Hash curto do user-agent resumido + dia UTC (sem IP). Ajuda rate limit anônimo.';
comment on column public.beta_pedagogy_events.rate_bucket_key is
  'Chave de rate limit do dia (perfil/user + digest). Rotaciona diariamente.';

create index if not exists beta_pedagogy_events_user_created_idx
  on public.beta_pedagogy_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists beta_pedagogy_events_local_created_idx
  on public.beta_pedagogy_events (local_profile_id, created_at desc)
  where local_profile_id is not null;

create index if not exists beta_pedagogy_events_digest_created_idx
  on public.beta_pedagogy_events (client_context_digest, created_at desc)
  where client_context_digest is not null;

create index if not exists beta_pedagogy_events_bucket_created_idx
  on public.beta_pedagogy_events (rate_bucket_key, created_at desc)
  where rate_bucket_key is not null;

create index if not exists beta_pedagogy_events_type_lesson_created_idx
  on public.beta_pedagogy_events (event_type, lesson_id, created_at desc);

-- Sessão anônima opcional (token opaco; só hash no banco; rotaciona ~24h)
create table if not exists public.beta_pedagogy_anon_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_context_digest text not null,
  day_bucket date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  last_seen_at timestamptz not null default now(),
  constraint beta_pedagogy_anon_sessions_digest_len check (
    char_length(client_context_digest) between 8 and 64
  )
);

create index if not exists beta_pedagogy_anon_sessions_expires_idx
  on public.beta_pedagogy_anon_sessions (expires_at);

alter table public.beta_pedagogy_anon_sessions enable row level security;
-- Sem policies de select/insert para roles comuns: só via RPCs security definer.

-- Métricas agregadas (sobrevivem à limpeza de eventos brutos)
create table if not exists public.beta_pedagogy_daily_metrics (
  day date not null,
  event_type text not null,
  lesson_id text not null default '',
  event_count integer not null default 0,
  primary key (day, event_type, lesson_id)
);

alter table public.beta_pedagogy_daily_metrics enable row level security;

create policy "beta_pedagogy_daily_metrics_select_admin"
  on public.beta_pedagogy_daily_metrics
  for select
  to authenticated
  using (public.is_beta_admin());

-- ---------------------------------------------------------------------------
-- Helpers: digest / identity match (md5 nativo; sem IP)
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_context_digest(p_client_context text)
returns text
language plpgsql
stable
as $$
declare
  v_raw text := nullif(left(trim(coalesce(p_client_context, '')), 120), '');
  v_day text := ((timezone('utc', now()))::date)::text;
begin
  if v_raw is null then
    return null;
  end if;
  -- Rotação diária UTC: o mesmo UA vira bucket novo a cada dia.
  return md5(v_raw || '|longyu-pedagogy|' || v_day);
end;
$$;

revoke all on function public.beta_pedagogy_context_digest(text) from public;

create or replace function public.beta_pedagogy_rate_bucket_key(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text
)
returns text
language sql
stable
as $$
  select left(
    md5(
      coalesce(p_user_id::text, '') || '|' ||
      coalesce(nullif(trim(coalesce(p_local_profile_id, '')), ''), '') || '|' ||
      coalesce(p_context_digest, '') || '|' ||
      ((timezone('utc', now()))::date)::text
    ),
    32
  );
$$;

revoke all on function public.beta_pedagogy_rate_bucket_key(uuid, text, text) from public;

create or replace function public.beta_pedagogy_identity_match(
  p_row_user_id uuid,
  p_row_local text,
  p_row_digest text,
  p_row_bucket text,
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text,
  p_bucket text
)
returns boolean
language sql
immutable
as $$
  select
    (p_user_id is not null and p_row_user_id = p_user_id)
    or (
      p_user_id is null and p_local_profile_id is not null
      and p_row_local is not null and p_row_local = p_local_profile_id
    )
    or (
      p_user_id is null and p_context_digest is not null
      and p_row_digest is not null and p_row_digest = p_context_digest
    )
    or (
      p_bucket is not null and p_row_bucket is not null and p_row_bucket = p_bucket
    );
$$;

revoke all on function public.beta_pedagogy_identity_match(
  uuid, text, text, text, uuid, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- 1) Rate limit geral
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_event_rate_limited(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_digest text := nullif(trim(coalesce(p_context_digest, '')), '');
  v_bucket text := public.beta_pedagogy_rate_bucket_key(p_user_id, v_local, v_digest);
  v_minute_limit integer := case when p_user_id is not null then 120 else 60 end;
  v_day_limit integer := case when p_user_id is not null then 3000 else 1000 end;
  recent_minute integer;
  recent_day integer;
  digest_minute integer;
  digest_day integer;
begin
  select count(*) into recent_minute
  from public.beta_pedagogy_events e
  where e.created_at > now() - interval '60 seconds'
    and public.beta_pedagogy_identity_match(
      e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
      p_user_id, v_local, v_digest, v_bucket
    );

  if recent_minute >= v_minute_limit then
    return true;
  end if;

  select count(*) into recent_day
  from public.beta_pedagogy_events e
  where e.created_at > now() - interval '1 day'
    and public.beta_pedagogy_identity_match(
      e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
      p_user_id, v_local, v_digest, v_bucket
    );

  if recent_day >= v_day_limit then
    return true;
  end if;

  -- Anônimo: limite extra só pelo digest (mitiga troca de local_profile_id).
  if p_user_id is null and v_digest is not null then
    select count(*) into digest_minute
    from public.beta_pedagogy_events e
    where e.created_at > now() - interval '60 seconds'
      and e.client_context_digest = v_digest;

    if digest_minute >= 60 then
      return true;
    end if;

    select count(*) into digest_day
    from public.beta_pedagogy_events e
    where e.created_at > now() - interval '1 day'
      and e.client_context_digest = v_digest;

    if digest_day >= 1000 then
      return true;
    end if;
  end if;

  return false;
end;
$$;

revoke all on function public.beta_pedagogy_event_rate_limited(uuid, text, text) from public;
grant execute on function public.beta_pedagogy_event_rate_limited(uuid, text, text) to authenticated, anon;

-- Compat: assinatura (uuid, text) pedida no brief
create or replace function public.beta_pedagogy_event_rate_limited(
  p_user_id uuid,
  p_local_profile_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.beta_pedagogy_event_rate_limited(p_user_id, p_local_profile_id, null::text);
$$;

revoke all on function public.beta_pedagogy_event_rate_limited(uuid, text) from public;
grant execute on function public.beta_pedagogy_event_rate_limited(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2) Rate limit por tipo de evento
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_event_type_rate_limited(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text,
  p_event_type text,
  p_lesson_id text,
  p_scene_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_digest text := nullif(trim(coalesce(p_context_digest, '')), '');
  v_bucket text := public.beta_pedagogy_rate_bucket_key(p_user_id, v_local, v_digest);
  v_lesson text := nullif(trim(coalesce(p_lesson_id, '')), '');
  v_scene text := nullif(trim(coalesce(p_scene_id, '')), '');
  v_count integer;
begin
  if p_event_type = 'lesson_started' and v_lesson is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'lesson_started'
      and e.lesson_id = v_lesson
      and e.created_at > now() - interval '60 seconds'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 5;
  end if;

  if p_event_type = 'exercise_answered' then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'exercise_answered'
      and e.created_at > now() - interval '60 seconds'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 30;
  end if;

  if p_event_type = 'lesson_completed' and v_lesson is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'lesson_completed'
      and e.lesson_id = v_lesson
      and e.created_at > now() - interval '1 hour'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 3;
  end if;

  if p_event_type = 'conversation_completed' and v_scene is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'conversation_completed'
      and e.created_at > now() - interval '1 hour'
      and e.metadata->>'sceneId' = v_scene
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 10;
  end if;

  return false;
end;
$$;

revoke all on function public.beta_pedagogy_event_type_rate_limited(
  uuid, text, text, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- 3) Whitelist de metadata (só escalares; sem objetos aninhados)
-- ---------------------------------------------------------------------------

create or replace function public.sanitize_pedagogy_metadata(
  p_event_type text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_text text;
  v_num numeric;
begin
  if jsonb_typeof(v_in) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  v_allowed := case p_event_type
    when 'lesson_started' then array['appVersion']
    when 'lesson_completed' then array['appVersion', 'stars', 'reason']
    when 'lesson_abandoned' then array['appVersion', 'reason']
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
    ]
    else array['appVersion']
  end;

  for v_key, v_val in select key, value from jsonb_each(v_in)
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if jsonb_typeof(v_val) = 'string' then
      v_text := left(coalesce(v_val #>> '{}', ''), 80);
      v_out := v_out || jsonb_build_object(v_key, v_text);
    elsif jsonb_typeof(v_val) = 'number' then
      v_num := (v_val #>> '{}')::numeric;
      if v_num > 1e12 or v_num < -1e12 then
        continue;
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_num);
    elsif jsonb_typeof(v_val) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (v_val #>> '{}')::boolean);
    elsif jsonb_typeof(v_val) = 'null' then
      continue;
    else
      -- objeto/array aninhado: descartar
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- Sessão anônima (opcional)
-- ---------------------------------------------------------------------------

create or replace function public.issue_beta_pedagogy_anon_session(
  p_client_context text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_hash text := md5(v_token);
  recent integer;
begin
  if auth.uid() is not null then
    raise exception 'anon_session_for_anonymous_only';
  end if;

  if v_digest is null then
    raise exception 'client_context_required';
  end if;

  select count(*) into recent
  from public.beta_pedagogy_anon_sessions s
  where s.client_context_digest = v_digest
    and s.created_at > now() - interval '10 minutes';

  if recent >= 3 then
    raise exception 'rate_limited';
  end if;

  insert into public.beta_pedagogy_anon_sessions (
    token_hash, client_context_digest, day_bucket
  ) values (
    v_hash, v_digest, (timezone('utc', now()))::date
  );

  return v_token;
end;
$$;

revoke all on function public.issue_beta_pedagogy_anon_session(text) from public;
grant execute on function public.issue_beta_pedagogy_anon_session(text) to anon;

create or replace function public.beta_pedagogy_touch_anon_session(
  p_token text,
  p_context_digest text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_ok boolean := false;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    return false;
  end if;

  v_hash := md5(trim(p_token));

  update public.beta_pedagogy_anon_sessions s
  set last_seen_at = now()
  where s.token_hash = v_hash
    and s.expires_at > now()
    and (p_context_digest is null or s.client_context_digest = p_context_digest)
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.beta_pedagogy_touch_anon_session(text, text) from public;

-- ---------------------------------------------------------------------------
-- 6) Retenção: agregar + apagar brutos > 90 dias; limpar sessões
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_beta_pedagogy_events(
  p_retain_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_retain_days, 1));
  v_deleted integer := 0;
begin
  -- Sem grant a anon/authenticated: executar no SQL Editor / cron (owner/service_role).

  insert into public.beta_pedagogy_daily_metrics as m (day, event_type, lesson_id, event_count)
  select
    (timezone('utc', e.created_at))::date as day,
    e.event_type,
    coalesce(e.lesson_id, ''),
    count(*)::integer
  from public.beta_pedagogy_events e
  where e.created_at < v_cutoff
  group by 1, 2, 3
  on conflict (day, event_type, lesson_id)
  do update set event_count = m.event_count + excluded.event_count;

  delete from public.beta_pedagogy_events
  where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.beta_pedagogy_anon_sessions
  where expires_at < now() - interval '7 days';

  return v_deleted;
end;
$$;

revoke all on function public.cleanup_beta_pedagogy_events(integer) from public;
-- Sem grant a anon/authenticated: rodar no SQL Editor / cron service_role.

comment on function public.cleanup_beta_pedagogy_events(integer) is
  'Agrega eventos brutos em beta_pedagogy_daily_metrics e apaga brutos além de N dias (default 90). Feedback manual não é tocado.';

-- ---------------------------------------------------------------------------
-- RPC principal (substitui overload anterior)
-- ---------------------------------------------------------------------------

drop function if exists public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
);

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_session_ok boolean := false;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  -- Anônimo: pedimos contexto (UA resumido) para rate limit complementar.
  -- Ainda aceita sem contexto na beta, mas o digest_limit só aplica com digest.
  if v_uid is null and nullif(trim(coalesce(p_anon_session_token, '')), '') is not null then
    v_session_ok := public.beta_pedagogy_touch_anon_session(p_anon_session_token, v_digest);
    if not v_session_ok then
      raise exception 'invalid_anon_session';
    end if;
  end if;

  if v_uid is not null then
    select coalesce(p.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles p
    where p.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'image_exercise_answered',
    'lesson_abandoned'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest);

  if v_dedupe is not null then
    select id into v_id
    from public.beta_pedagogy_events
    where client_dedupe_key = v_dedupe
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
    raise exception 'rate_limited';
  end if;

  if public.beta_pedagogy_event_type_rate_limited(
    v_uid, v_local, v_digest, v_type, v_lesson, v_scene
  ) then
    raise exception 'event_rate_limited';
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to authenticated, anon;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Insere evento pedagógico com consent (auth), rate limit, whitelist de metadata e digest anônimo (sem IP).';


-- 014_subscription_event_ordering.sql
-- Ordenação e idempotência de eventos de assinatura Stripe.
--
-- Problema: o webhook fazia upsert incondicional na tabela subscriptions, então
-- um evento ANTIGO entregue fora de ordem (comum no Stripe) podia reverter um
-- estado NOVO — por exemplo, um customer.subscription.updated atrasado (active)
-- sobrescrevendo um customer.subscription.deleted já processado (canceled),
-- deixando Pro ligado indevidamente.
--
-- Solução: guardamos o timestamp do evento (event.created, em segundos) e só
-- aplicamos a escrita se o evento recebido for igual ou mais novo que o último
-- já persistido. A checagem é ATÔMICA (ON CONFLICT ... WHERE), sem janela de
-- corrida entre leitura e escrita. Reprocessar o MESMO evento é idempotente
-- (mesmos dados, event.created igual → aplica de novo sem efeito colateral).

alter table public.subscriptions
  add column if not exists stripe_event_created bigint;

-- Aplica um evento de assinatura respeitando a ordem por event.created.
-- Chamada apenas pelo webhook (service role) — nunca pelo cliente.
create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  if p_subscription_id is null then
    return jsonb_build_object('ok', false, 'applied', false, 'reason', 'missing_subscription_id');
  end if;

  -- Sem user_id conhecido (ex.: updated/deleted de assinatura que nunca passou
  -- por checkout aqui): só atualiza uma linha existente, nunca cria órfã.
  if p_user_id is null then
    update public.subscriptions s
    set
      stripe_customer_id = coalesce(p_customer_id, s.stripe_customer_id),
      status = p_status,
      price_id = coalesce(p_price_id, s.price_id),
      current_period_start = coalesce(p_current_period_start, s.current_period_start),
      current_period_end = coalesce(p_current_period_end, s.current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
      stripe_event_created = p_event_created,
      updated_at = now()
    where s.stripe_subscription_id = p_subscription_id
      and (s.stripe_event_created is null or p_event_created >= s.stripe_event_created);
    get diagnostics v_row_count = row_count;
    return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
      case when v_row_count > 0 then 'updated' else 'stale_or_missing' end);
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    stripe_event_created, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_status, p_price_id,
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created, now()
  )
  on conflict (stripe_subscription_id) do update set
    user_id = coalesce(excluded.user_id, public.subscriptions.user_id),
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    status = excluded.status,
    price_id = coalesce(excluded.price_id, public.subscriptions.price_id),
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_created = excluded.stripe_event_created,
    updated_at = now()
  where public.subscriptions.stripe_event_created is null
     or excluded.stripe_event_created >= public.subscriptions.stripe_event_created;

  get diagnostics v_row_count = row_count;
  return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
    case when v_row_count > 0 then 'upserted' else 'stale' end);
end;
$$;

revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) from public;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) to service_role;


-- 015_fix_apply_subscription_event_rowcount.sql
-- Corrige apply_subscription_event: GET DIAGNOSTICS row_count é integer,
-- não boolean. A versão anterior quebrava o ramo updated/deleted sem user_id
-- (boolean > integer).

create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  if p_subscription_id is null then
    return jsonb_build_object('ok', false, 'applied', false, 'reason', 'missing_subscription_id');
  end if;

  if p_user_id is null then
    update public.subscriptions s
    set
      stripe_customer_id = coalesce(p_customer_id, s.stripe_customer_id),
      status = p_status,
      price_id = coalesce(p_price_id, s.price_id),
      current_period_start = coalesce(p_current_period_start, s.current_period_start),
      current_period_end = coalesce(p_current_period_end, s.current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
      stripe_event_created = p_event_created,
      updated_at = now()
    where s.stripe_subscription_id = p_subscription_id
      and (s.stripe_event_created is null or p_event_created >= s.stripe_event_created);
    get diagnostics v_row_count = row_count;
    return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
      case when v_row_count > 0 then 'updated' else 'stale_or_missing' end);
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    stripe_event_created, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_status, p_price_id,
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created, now()
  )
  on conflict (stripe_subscription_id) do update set
    user_id = coalesce(excluded.user_id, public.subscriptions.user_id),
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    status = excluded.status,
    price_id = coalesce(excluded.price_id, public.subscriptions.price_id),
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_created = excluded.stripe_event_created,
    updated_at = now()
  where public.subscriptions.stripe_event_created is null
     or excluded.stripe_event_created >= public.subscriptions.stripe_event_created;

  get diagnostics v_row_count = row_count;
  return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
    case when v_row_count > 0 then 'upserted' else 'stale' end);
end;
$$;

revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) from public;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) to service_role;


-- 016_fix_leagues_cohort_finalize.sql
-- Corrige ligas semanais:
-- 1) finalização por coorte (todos da divisão/semana juntos)
-- 2) reset_at alinhado ao fim da semana ISO (próxima segunda 00:00 UTC)
-- 3) handle_new_user volta a criar membership na Liga Bronze
-- 4) garante membership para perfis existentes sem liga

-- ---------------------------------------------------------------------------
-- Fim da semana ISO: segunda seguinte 00:00 UTC (fim exclusivo)
-- ---------------------------------------------------------------------------

create or replace function public.week_ends_at(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('week', timezone('UTC', p_at)) + interval '7 days'
  ) at time zone 'UTC';
$$;

-- ---------------------------------------------------------------------------
-- Finaliza uma coorte inteira (tier + week_key) e rola todos para a semana atual
-- ---------------------------------------------------------------------------

create or replace function public.finalize_league_cohort(
  p_tier_id text,
  p_week_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := public.iso_week_key();
  v_tier public.league_tiers;
  v_total integer;
  v_member record;
  v_rank integer;
  v_movement text;
  v_next_tier text;
  v_count integer := 0;
begin
  if p_tier_id is null or p_week_key is null or p_week_key >= v_week then
    return 0;
  end if;

  select * into v_tier from public.league_tiers where id = p_tier_id;
  if not found then
    return 0;
  end if;

  -- Trava a coorte para evitar finalizações concorrentes inconsistentes.
  perform 1
  from public.league_memberships
  where league_tier_id = p_tier_id
    and current_week_key = p_week_key
  for update;

  select count(*)::integer into v_total
  from public.league_memberships
  where league_tier_id = p_tier_id
    and current_week_key = p_week_key;

  if coalesce(v_total, 0) = 0 then
    return 0;
  end if;

  perform public.recalculate_league_ranks(p_tier_id, p_week_key);

  for v_member in
    select *
    from public.league_memberships
    where league_tier_id = p_tier_id
      and current_week_key = p_week_key
    order by rank_position nulls last, weekly_xp desc, updated_at asc, user_id asc
  loop
    v_rank := coalesce(v_member.rank_position, v_total);
    v_movement := 'stayed';
    v_next_tier := v_member.league_tier_id;

    if v_tier.promotion_count > 0
       and v_rank <= v_tier.promotion_count
       and v_tier.order_index < (select max(order_index) from public.league_tiers) then
      v_movement := 'promoted';
      select id into v_next_tier
      from public.league_tiers
      where order_index = v_tier.order_index + 1;
    elsif v_tier.relegation_count > 0
          and v_rank > greatest(0, v_total - v_tier.relegation_count)
          and v_tier.order_index > (select min(order_index) from public.league_tiers) then
      v_movement := 'demoted';
      select id into v_next_tier
      from public.league_tiers
      where order_index = v_tier.order_index - 1;
    end if;

    insert into public.league_weekly_results (
      week_key, user_id, league_tier_id, weekly_xp, final_rank,
      movement, reward_qi, reward_chest_type
    ) values (
      p_week_key,
      v_member.user_id,
      p_tier_id,
      v_member.weekly_xp,
      v_rank,
      v_movement,
      v_tier.reward_qi,
      v_tier.reward_chest_type
    )
    on conflict (week_key, user_id) do nothing;

    update public.league_memberships
    set
      league_tier_id = coalesce(v_next_tier, p_tier_id),
      current_week_key = v_week,
      weekly_xp = 0,
      rank_position = null,
      promoted_last_week = (v_movement = 'promoted'),
      relegated_last_week = (v_movement = 'demoted'),
      updated_at = now()
    where user_id = v_member.user_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finaliza todas as coortes atrasadas (qualquer divisão/semana)
-- ---------------------------------------------------------------------------

create or replace function public.finalize_stale_league_cohorts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := public.iso_week_key();
  v_cohort record;
  v_total integer := 0;
begin
  for v_cohort in
    select league_tier_id, current_week_key
    from public.league_memberships
    where current_week_key <> v_week
    group by league_tier_id, current_week_key
    order by current_week_key asc, league_tier_id asc
  loop
    v_total := v_total + public.finalize_league_cohort(
      v_cohort.league_tier_id,
      v_cohort.current_week_key
    );
  end loop;

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Por usuário: agora dispara finalização de coorte (não só o próprio registro)
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
begin
  select * into v_m from public.league_memberships where user_id = p_user_id;
  if not found or v_m.current_week_key = v_week then
    return;
  end if;

  -- Finaliza a coorte inteira do usuário + qualquer outra atrasada.
  perform public.finalize_stale_league_cohorts();
end;
$$;

-- ---------------------------------------------------------------------------
-- sync_league_week: garante membership, finaliza coortes e recalcula ranks
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
  perform public.finalize_stale_league_cohorts();

  select * into v_m from public.league_memberships where user_id = p_user_id;

  if v_m.current_week_key <> v_week then
    update public.league_memberships
    set current_week_key = v_week,
        weekly_xp = 0,
        rank_position = null,
        updated_at = now()
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
-- Novos usuários: perfil + economia + Liga Bronze
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free integer := 5;
begin
  begin
    v_free := (public.economy_constants()->>'daily_charges_free')::integer;
  exception when others then
    v_free := 5;
  end;

  insert into public.profiles (id, name, native_language, target_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Aluno Longyu'),
    coalesce(new.raw_user_meta_data->>'native_language', 'pt-BR'),
    coalesce(new.raw_user_meta_data->>'target_language', 'zh-CN')
  )
  on conflict (id) do nothing;

  insert into public.user_economy (
    user_id, qi, dragon_pearls, streak_shields, current_charges, max_charges, energy_day
  )
  values (new.id, 0, 0, 0, v_free, v_free, current_date)
  on conflict (user_id) do nothing;

  insert into public.league_memberships (user_id, league_tier_id, current_week_key, weekly_xp)
  values (new.id, 'bronze', public.iso_week_key(), 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants / revoke helpers internos
-- ---------------------------------------------------------------------------

grant execute on function public.sync_league_week(uuid) to authenticated;
grant execute on function public.add_league_weekly_xp(integer, text) to authenticated;
grant execute on function public.get_league_standings() to authenticated;
grant execute on function public.claim_league_week_reward(text) to authenticated;
grant execute on function public.ensure_league_membership(uuid) to authenticated;

revoke all on function public.finalize_league_cohort(text, text) from public;
revoke all on function public.finalize_stale_league_cohorts() from public;
revoke all on function public.finalize_league_week_for_user(uuid) from public;
revoke all on function public.recalculate_league_ranks(text, text) from public;

-- ---------------------------------------------------------------------------
-- Backfill: perfis sem membership entram na Bronze da semana atual
-- ---------------------------------------------------------------------------

insert into public.league_memberships (user_id, league_tier_id, current_week_key, weekly_xp)
select
  p.id,
  'bronze',
  public.iso_week_key(),
  greatest(0, coalesce(up.weekly_xp, 0))
from public.profiles p
left join public.user_progress up on up.user_id = p.id
where not exists (
  select 1 from public.league_memberships m where m.user_id = p.id
)
on conflict (user_id) do nothing;

-- Rola coortes atrasadas imediatamente (produção já tinha membros em W28–W31).
select public.finalize_stale_league_cohorts();


-- 017_referrals.sql
-- Programa de indicação (MVP beta): código único, atribuição no cadastro,
-- qualificação server-side e Pro via entitlement_grants (sem tocar Stripe).

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────
-- Tabelas
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index if not exists referral_codes_code_idx on public.referral_codes (lower(code));

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'qualified', 'rewarded', 'rejected', 'under_review')),
  attributed_at timestamptz not null default now(),
  qualified_at timestamptz,
  rejected_at timestamptz,
  invitee_email_hash text,
  risk_flags jsonb not null default '[]'::jsonb,
  constraint referrals_no_self check (inviter_id <> invitee_id)
);

create index if not exists referrals_inviter_idx on public.referrals (inviter_id, status);
create unique index if not exists referrals_invitee_email_hash_rewarded_idx
  on public.referrals (invitee_email_hash)
  where status in ('qualified', 'rewarded') and invitee_email_hash is not null;

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referrals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_days integer not null default 7 check (reward_days > 0),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'active', 'expired', 'cancelled')),
  available_at timestamptz not null default now(),
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referral_rewards_user_idx on public.referral_rewards (user_id, status);

create table if not exists public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('referral', 'promotion', 'support_adjustment', 'beta_reward')),
  source_id uuid,
  duration_days integer not null check (duration_days > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists entitlement_grants_user_active_idx
  on public.entitlement_grants (user_id, status, ends_at);

-- Bloqueia recompensa duplicada por e-mail após exclusão/recriação de conta.
create table if not exists public.referral_email_blocks (
  email_hash text primary key,
  first_invitee_id uuid,
  blocked_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.entitlement_grants enable row level security;
alter table public.referral_email_blocks enable row level security;

create policy "referral_codes_select_own"
  on public.referral_codes for select to authenticated
  using (auth.uid() = user_id);

create policy "referrals_select_involved"
  on public.referrals for select to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

create policy "referral_rewards_select_own"
  on public.referral_rewards for select to authenticated
  using (auth.uid() = user_id);

create policy "entitlement_grants_select_own"
  on public.entitlement_grants for select to authenticated
  using (auth.uid() = user_id);

-- referral_email_blocks: somente service_role (sem policy para authenticated)

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers internos
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public._referral_random_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out_code text := 'DRAGAO';
  i int;
begin
  for i in 1..6 loop
    out_code := out_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return out_code;
end;
$$;

create or replace function public._user_email_hash(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(digest(lower(coalesce(u.email, '')), 'sha256'), 'hex')
  from auth.users u
  where u.id = p_user_id;
$$;

create or replace function public._user_stripe_pro_active(p_user_id uuid)
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

create or replace function public._user_stripe_pro_period_end(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(s.current_period_end)
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing', 'canceled')
    and (s.current_period_end is null or s.current_period_end > now());
$$;

create or replace function public._user_active_grant_end(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(g.ends_at)
  from public.entitlement_grants g
  where g.user_id = p_user_id
    and g.status = 'active'
    and (g.ends_at is null or g.ends_at > now());
$$;

create or replace function public.user_has_entitlement_grant(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlement_grants g
    where g.user_id = p_user_id
      and g.status = 'active'
      and (g.starts_at is null or g.starts_at <= now())
      and (g.ends_at is null or g.ends_at > now())
  );
$$;

create or replace function public._referral_progress_from_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  snap jsonb;
  progress jsonb;
  lessons jsonb;
  activity jsonb;
  lesson_count int := 0;
  active_days int := 0;
  day_key text;
  day_rec jsonb;
begin
  select up.client_snapshot into snap
  from public.user_progress up
  where up.user_id = p_user_id;

  if snap is null then
    select coalesce(array_length(up.completed_lessons, 1), 0) into lesson_count
    from public.user_progress up
    where up.user_id = p_user_id;
    return jsonb_build_object('lesson_count', coalesce(lesson_count, 0), 'active_days', 0);
  end if;

  progress := snap -> 'progress';
  if progress is null then
    progress := snap -> 'snapshot' -> 'progress';
  end if;

  lessons := progress -> 'completedLessons';
  if lessons is not null and jsonb_typeof(lessons) = 'array' then
    lesson_count := jsonb_array_length(lessons);
  end if;

  activity := progress -> 'activityByDay';
  if activity is not null and jsonb_typeof(activity) = 'object' then
    for day_key, day_rec in select * from jsonb_each(activity) loop
      if coalesce((day_rec ->> 'tasks')::int, 0) > 0
         or coalesce((day_rec ->> 'xp')::int, 0) > 0 then
        active_days := active_days + 1;
      end if;
    end loop;
  end if;

  -- Fallback: last_active + updated_at como segundo dia se streak indica retorno.
  if active_days < 2 then
    declare
      last_active date;
      updated_day date;
    begin
      select up.last_active, (up.updated_at at time zone 'utc')::date
        into last_active, updated_day
      from public.user_progress up
      where up.user_id = p_user_id;
      if last_active is not null then active_days := greatest(active_days, 1); end if;
      if updated_day is not null and (last_active is null or updated_day <> last_active) then
        active_days := active_days + 1;
      end if;
    end;
  end if;

  return jsonb_build_object(
    'lesson_count', lesson_count,
    'active_days', active_days
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs públicos
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.ensure_referral_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_row public.referral_codes%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.referral_codes where user_id = v_uid;
  if found then
    return jsonb_build_object('ok', true, 'code', v_row.code);
  end if;

  loop
    v_code := public._referral_random_code();
    exit when not exists (select 1 from public.referral_codes where code = v_code);
  end loop;

  insert into public.referral_codes (user_id, code)
  values (v_uid, v_code)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'code', v_row.code);
end;
$$;

create or replace function public.attribute_referral(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_code_row public.referral_codes%rowtype;
  v_email_hash text;
  v_existing public.referrals%rowtype;
  v_new_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'code_missing');
  end if;

  select * into v_existing from public.referrals where invitee_id = v_uid;
  if found then
    return jsonb_build_object('ok', true, 'status', v_existing.status, 'already_attributed', true);
  end if;

  select * into v_code_row
  from public.referral_codes rc
  where lower(rc.code) = lower(v_code)
    and rc.disabled_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'code_not_found');
  end if;

  if v_code_row.user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'self_referral');
  end if;

  v_email_hash := public._user_email_hash(v_uid);

  if exists (select 1 from public.referral_email_blocks where email_hash = v_email_hash) then
    return jsonb_build_object('ok', false, 'error', 'email_blocked');
  end if;

  if exists (
    select 1 from public.referrals r
    where r.invitee_email_hash = v_email_hash
      and r.status in ('qualified', 'rewarded')
  ) then
    return jsonb_build_object('ok', false, 'error', 'email_already_rewarded');
  end if;

  insert into public.referrals (inviter_id, invitee_id, referral_code_id, invitee_email_hash)
  values (v_code_row.user_id, v_uid, v_code_row.id, v_email_hash)
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'referral_id', v_new_id, 'status', 'pending');
end;
$$;

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals%rowtype;
  u record;
  stats jsonb;
  lesson_count int;
  active_days int;
  flags jsonb := '[]'::jsonb;
begin
  select * into r from public.referrals where id = p_referral_id for update;
  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  select u.id, u.created_at, u.email_confirmed_at
    into u
  from auth.users u
  where u.id = r.invitee_id;

  if u.email_confirmed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;

  if u.created_at > now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_new');
  end if;

  if u.created_at < now() - interval '14 days' then
    update public.referrals
      set status = 'rejected', rejected_at = now(), risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_progress_from_snapshot(r.invitee_id);
  lesson_count := coalesce((stats ->> 'lesson_count')::int, 0);
  active_days := coalesce((stats ->> 'active_days')::int, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'qualified', true);
end;
$$;

create or replace function public._referral_grant_reward(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals%rowtype;
  rewards_30d int;
  pending_days int;
  reward_id uuid;
  grant_id uuid;
  start_at timestamptz;
  end_at timestamptz;
  stripe_end timestamptz;
  grant_end timestamptz;
  queue_start timestamptz;
  reward_status text;
  grant_status text;
begin
  select * into r from public.referrals where id = p_referral_id for update;
  if not found or r.status <> 'qualified' then
    return jsonb_build_object('ok', false, 'reason', 'not_qualified');
  end if;

  if exists (select 1 from public.referral_rewards where referral_id = r.id) then
    return jsonb_build_object('ok', false, 'reason', 'already_rewarded');
  end if;

  select count(*) into rewards_30d
  from public.referral_rewards rr
  where rr.user_id = r.inviter_id
    and rr.created_at >= now() - interval '30 days';

  if rewards_30d >= 8 then
    update public.referrals set status = 'under_review', risk_flags = risk_flags || '["monthly_cap"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'monthly_cap');
  end if;

  select coalesce(sum(rr.reward_days), 0) into pending_days
  from public.referral_rewards rr
  where rr.user_id = r.inviter_id
    and rr.status in ('pending', 'available');

  if pending_days + 7 > 84 then
    update public.referrals set status = 'under_review', risk_flags = risk_flags || '["accumulated_cap"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'accumulated_cap');
  end if;

  stripe_end := public._user_stripe_pro_period_end(r.inviter_id);
  grant_end := public._user_active_grant_end(r.inviter_id);
  queue_start := greatest(coalesce(stripe_end, now()), coalesce(grant_end, now()), now());

  if public._user_stripe_pro_active(r.inviter_id) or (grant_end is not null and grant_end > now()) then
    start_at := queue_start;
    end_at := queue_start + interval '7 days';
    reward_status := 'available';
    grant_status := 'pending';
  else
    start_at := now();
    end_at := now() + interval '7 days';
    reward_status := 'active';
    grant_status := 'active';
  end if;

  insert into public.referral_rewards (
    referral_id, user_id, reward_days, status, available_at, activated_at, expires_at
  )
  values (
    r.id, r.inviter_id, 7, reward_status, queue_start,
    case when reward_status = 'active' then now() else null end,
    case when reward_status = 'active' then end_at else null end
  )
  returning id into reward_id;

  insert into public.entitlement_grants (
    user_id, source, source_id, duration_days, starts_at, ends_at, status
  )
  values (
    r.inviter_id, 'referral', reward_id, 7, start_at, end_at, grant_status
  )
  returning id into grant_id;

  update public.referrals set status = 'rewarded' where id = r.id;

  if r.invitee_email_hash is not null then
    insert into public.referral_email_blocks (email_hash, first_invitee_id)
    values (r.invitee_email_hash, r.invitee_id)
    on conflict (email_hash) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'reward_id', reward_id,
    'grant_id', grant_id,
    'queued', reward_status = 'available'
  );
end;
$$;

create or replace function public.process_referral_pipeline()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  inv_ref public.referrals%rowtype;
  qual jsonb;
  grant_res jsonb;
  activated int := 0;
  g record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- 1) Convite onde EU sou o convidado: tentar qualificar.
  select * into inv_ref from public.referrals where invitee_id = v_uid limit 1;
  if found and inv_ref.status in ('pending', 'under_review') then
    qual := public._referral_try_qualify(inv_ref.id);
    if (qual ->> 'qualified')::boolean is true then
      grant_res := public._referral_grant_reward(inv_ref.id);
    end if;
  end if;

  -- 2) Convites onde EU sou indicador: qualificar pendentes.
  for inv_ref in
    select * from public.referrals
    where inviter_id = v_uid and status in ('pending', 'under_review')
  loop
    qual := public._referral_try_qualify(inv_ref.id);
    if (qual ->> 'qualified')::boolean is true then
      perform public._referral_grant_reward(inv_ref.id);
    end if;
  end loop;

  -- 3) Ativar grants pendentes cujo período chegou.
  for g in
    select eg.*
    from public.entitlement_grants eg
    where eg.user_id = v_uid
      and eg.status = 'pending'
      and eg.starts_at <= now()
  loop
    update public.entitlement_grants
    set status = 'active', starts_at = now(), ends_at = now() + (g.duration_days || ' days')::interval
    where id = g.id;

    update public.referral_rewards rr
    set status = 'active', activated_at = now(), expires_at = now() + (g.duration_days || ' days')::interval
    where rr.id = g.source_id and rr.user_id = v_uid;

    activated := activated + 1;
  end loop;

  -- 4) Expirar grants ativos vencidos.
  update public.entitlement_grants
  set status = 'expired'
  where user_id = v_uid and status = 'active' and ends_at is not null and ends_at <= now();

  update public.referral_rewards rr
  set status = 'expired'
  where rr.user_id = v_uid and rr.status = 'active' and rr.expires_at is not null and rr.expires_at <= now();

  return jsonb_build_object('ok', true, 'activated', activated);
end;
$$;

create or replace function public.get_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  sent int;
  pending int;
  qualified int;
  rewarded int;
  bonus_days int;
  invitees jsonb := '[]'::jsonb;
  row_rec record;
  stats jsonb;
  lesson_count int;
  active_days int;
  status_label text;
  u_created timestamptz;
  email_ok boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  perform public.ensure_referral_code();
  select code into v_code from public.referral_codes where user_id = v_uid;

  select count(*) into sent from public.referrals where inviter_id = v_uid;
  select count(*) into pending from public.referrals where inviter_id = v_uid and status = 'pending';
  select count(*) into qualified from public.referrals where inviter_id = v_uid and status = 'qualified';
  select count(*) into rewarded from public.referrals where inviter_id = v_uid and status = 'rewarded';

  select coalesce(sum(rr.reward_days), 0) into bonus_days
  from public.referral_rewards rr
  where rr.user_id = v_uid and rr.status in ('pending', 'available', 'active');

  for row_rec in
    select r.*, p.name as invitee_name
    from public.referrals r
    join public.profiles p on p.id = r.invitee_id
    where r.inviter_id = v_uid
    order by r.attributed_at desc
    limit 50
  loop
    status_label := case row_rec.status
      when 'rewarded' then 'Recompensa concedida'
      when 'qualified' then 'Convite qualificado'
      when 'rejected' then 'Não qualificado'
      when 'under_review' then 'Em análise'
      else 'Aguardando atividade'
    end;

    if row_rec.status = 'pending' then
      stats := public._referral_progress_from_snapshot(row_rec.invitee_id);
      lesson_count := coalesce((stats ->> 'lesson_count')::int, 0);
      active_days := coalesce((stats ->> 'active_days')::int, 0);
      select u.created_at, (u.email_confirmed_at is not null)
        into u_created, email_ok
      from auth.users u where u.id = row_rec.invitee_id;

      if not email_ok then
        status_label := 'Precisa confirmar e-mail';
      elsif u_created > now() - interval '48 hours' then
        status_label := 'Conta em período de espera (48h)';
      elsif lesson_count < 3 then
        status_label := format('Faltam %s lição(ões)', 3 - lesson_count);
      elsif active_days < 2 then
        status_label := 'Precisa voltar em outro dia';
      else
        status_label := 'Quase qualificado — validando…';
      end if;
    end if;

    invitees := invitees || jsonb_build_array(jsonb_build_object(
      'id', row_rec.id,
      'name', coalesce(row_rec.invitee_name, 'Convidado'),
      'status', row_rec.status,
      'status_label', status_label,
      'attributed_at', row_rec.attributed_at
    ));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'stats', jsonb_build_object(
      'sent', sent,
      'pending', pending,
      'qualified', qualified,
      'rewarded', rewarded,
      'bonus_days', bonus_days
    ),
    'invitees', invitees
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Entitlement: Stripe OU grant ativo
-- ─────────────────────────────────────────────────────────────────────────

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
  v_source text := 'none';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none');
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email in ('teste@longyu.app') then
  elsif public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'stripe';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'grant';
  end if;

  if v_email in ('teste@longyu.app') then
    v_is_pro := true;
    v_source := 'server';
  end if;

  return jsonb_build_object('ok', true, 'is_pro', v_is_pro, 'source', v_source);
end;
$$;

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
  or public._user_stripe_pro_active(p_user_id)
  or public.user_has_entitlement_grant(p_user_id);
$$;

revoke all on function public.ensure_referral_code() from public;
grant execute on function public.ensure_referral_code() to authenticated;

revoke all on function public.attribute_referral(text) from public;
grant execute on function public.attribute_referral(text) to authenticated;

revoke all on function public.process_referral_pipeline() from public;
grant execute on function public.process_referral_pipeline() to authenticated;

revoke all on function public.get_referral_dashboard() from public;
grant execute on function public.get_referral_dashboard() to authenticated;

revoke all on function public.user_has_entitlement_grant(uuid) from public;
grant execute on function public.user_has_entitlement_grant(uuid) to authenticated;


-- 018_signup_rate_limits.sql
-- Signup abuse controls for Edge Function create-account.
-- Rate limits persist in Postgres (não dependem de memória da Edge).

create table if not exists public.signup_rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists signup_rate_events_bucket_created_idx
  on public.signup_rate_events (bucket, created_at desc);

alter table public.signup_rate_events enable row level security;
-- Sem policies para authenticated/anon: só service_role (bypass RLS).

create or replace function public.check_and_record_signup_rate(
  p_ip_hash text,
  p_email_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_bucket text;
  email_bucket text;
  combo_bucket text;
  ip_15 int;
  ip_24h int;
  email_1h int;
  combo_15 int;
begin
  if p_ip_hash is null or length(trim(p_ip_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_ip');
  end if;
  if p_email_hash is null or length(trim(p_email_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_email');
  end if;

  ip_bucket := 'ip:' || trim(p_ip_hash);
  email_bucket := 'email:' || trim(p_email_hash);
  combo_bucket := 'combo:' || trim(p_ip_hash) || ':' || trim(p_email_hash);

  select count(*) into ip_15
  from public.signup_rate_events
  where bucket = ip_bucket and created_at > now() - interval '15 minutes';

  if ip_15 >= 5 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_15m');
  end if;

  select count(*) into ip_24h
  from public.signup_rate_events
  where bucket = ip_bucket and created_at > now() - interval '24 hours';

  if ip_24h >= 15 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_24h');
  end if;

  select count(*) into email_1h
  from public.signup_rate_events
  where bucket = email_bucket and created_at > now() - interval '1 hour';

  if email_1h >= 3 then
    return jsonb_build_object('allowed', false, 'reason', 'email_1h');
  end if;

  select count(*) into combo_15
  from public.signup_rate_events
  where bucket = combo_bucket and created_at > now() - interval '15 minutes';

  if combo_15 >= 2 then
    return jsonb_build_object('allowed', false, 'reason', 'combo_15m');
  end if;

  insert into public.signup_rate_events (bucket)
  values (ip_bucket), (email_bucket), (combo_bucket);

  -- Limpeza leve de eventos antigos (mantém a tabela pequena).
  delete from public.signup_rate_events
  where created_at < now() - interval '48 hours';

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_and_record_signup_rate(text, text) from public;
grant execute on function public.check_and_record_signup_rate(text, text) to service_role;
-- Somente service_role (Edge create-account). Sem grant a anon/authenticated.

comment on function public.check_and_record_signup_rate(text, text) is
  'Rate limit de cadastro: IP 5/15m + 15/24h; email 3/1h; combo 2/15m. Só service_role.';

-- Limpeza cuidadosa de contas nunca confirmadas (dry-run por padrão).
create or replace function public.admin_cleanup_unconfirmed_signups(
  p_older_than interval default interval '14 days',
  p_dry_run boolean default true,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ids uuid[];
  v_count int := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    p_limit := 100;
  end if;

  select coalesce(array_agg(u.id), '{}') into v_ids
  from (
    select u.id
    from auth.users u
    left join public.user_progress up on up.user_id = u.id
    left join public.subscriptions s on s.user_id = u.id
    left join public.referrals r on r.invitee_id = u.id or r.inviter_id = u.id
    where u.email_confirmed_at is null
      and u.created_at < now() - p_older_than
      and coalesce(array_length(up.completed_lessons, 1), 0) = 0
      and s.user_id is null
      and r.id is null
    order by u.created_at asc
    limit p_limit
  ) u;

  v_count := coalesce(array_length(v_ids, 1), 0);

  if p_dry_run or v_count = 0 then
    return jsonb_build_object(
      'ok', true,
      'dry_run', p_dry_run,
      'eligible', v_count,
      'deleted', 0,
      'ids', to_jsonb(v_ids)
    );
  end if;

  delete from auth.users where id = any(v_ids);

  return jsonb_build_object(
    'ok', true,
    'dry_run', false,
    'eligible', v_count,
    'deleted', v_count,
    'ids', to_jsonb(v_ids)
  );
end;
$$;

revoke all on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) from public;
grant execute on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) to service_role;

comment on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) is
  'Remove contas não confirmadas antigas sem progresso/assinatura/referral. Dry-run default. Só service_role.';


-- 019_turnstile_vault_secret.sql
-- Turnstile secret lookup for Edge create-account (service_role only).
-- O valor do secret NÃO fica neste arquivo — inserir via Vault:
--   select vault.create_secret('<secret>', 'TURNSTILE_SECRET_KEY', 'Cloudflare Turnstile');
-- Preferencialmente também: supabase secrets set TURNSTILE_SECRET_KEY=...

create or replace function public._edge_get_turnstile_secret()
returns text
language sql
security definer
set search_path = vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'TURNSTILE_SECRET_KEY'
  limit 1;
$$;

revoke all on function public._edge_get_turnstile_secret() from public;
grant execute on function public._edge_get_turnstile_secret() to service_role;

comment on function public._edge_get_turnstile_secret() is
  'Retorna secret Turnstile do Vault para a Edge create-account. Só service_role.';


-- 020_signup_cleanup_job.sql
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


-- 021_ensure_own_profile.sql
-- Perfil próprio via RPC (SECURITY DEFINER): evita falha de RLS no upsert
-- quando o cliente tem sessão mas políticas de INSERT/UPDATE/SELECT
-- interagem mal com on conflict (ex.: pós-confirmação / login).

create or replace function public.ensure_own_profile(
  p_name text default null,
  p_birth_date date default null,
  p_country text default null,
  p_signup_source text default null,
  p_marketing_opt_in boolean default null,
  p_onboarding_completed boolean default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.profiles as p (
    id,
    name,
    birth_date,
    country,
    signup_source,
    marketing_opt_in,
    onboarding_completed,
    native_language,
    target_language,
    updated_at
  )
  values (
    uid,
    coalesce(nullif(trim(p_name), ''), 'Aluno Longyu'),
    p_birth_date,
    nullif(trim(coalesce(p_country, '')), ''),
    nullif(trim(coalesce(p_signup_source, '')), ''),
    coalesce(p_marketing_opt_in, false),
    coalesce(p_onboarding_completed, true),
    'pt-BR',
    'zh-CN',
    now()
  )
  on conflict (id) do update set
    name = coalesce(nullif(trim(excluded.name), ''), p.name),
    birth_date = coalesce(excluded.birth_date, p.birth_date),
    country = coalesce(excluded.country, p.country),
    signup_source = coalesce(excluded.signup_source, p.signup_source),
    marketing_opt_in = coalesce(p_marketing_opt_in, p.marketing_opt_in),
    onboarding_completed = coalesce(p_onboarding_completed, p.onboarding_completed),
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.ensure_own_profile(text, date, text, text, boolean, boolean) from public;
grant execute on function public.ensure_own_profile(text, date, text, text, boolean, boolean) to authenticated;

comment on function public.ensure_own_profile(text, date, text, text, boolean, boolean) is
  'Upsert do perfil do usuário autenticado (security definer). Usado no login/pós-confirmação.';


-- 022_fix_referral_try_qualify.sql
-- Corrige SELECT INTO em _referral_try_qualify: alias `u` colidia com a
-- variável record `u`, fazendo o SELECT não atribuir e estourar
-- "record u is not assigned yet" (bloqueava qualify → grant no pipeline).

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count int;
  active_days int;
  flags jsonb := '[]'::jsonb;
begin
  select * into r from public.referrals where id = p_referral_id for update;
  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  select au.id, au.created_at, au.email_confirmed_at
    into invitee_user
  from auth.users au
  where au.id = r.invitee_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invitee_missing');
  end if;

  if invitee_user.email_confirmed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;

  if invitee_user.created_at > now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_new');
  end if;

  if invitee_user.created_at < now() - interval '14 days' then
    update public.referrals
      set status = 'rejected', rejected_at = now(), risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_progress_from_snapshot(r.invitee_id);
  lesson_count := coalesce((stats ->> 'lesson_count')::int, 0);
  active_days := coalesce((stats ->> 'active_days')::int, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'qualified', true);
end;
$$;


-- 20260808064852_harden_function_privileges.sql
-- Deny-by-default para funcoes expostas pela Data API.
-- Supabase concede EXECUTE a PUBLIC/anon/authenticated por default; revogar
-- somente de PUBLIC nao remove grants explicitos dos papeis da API.
begin;

revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- A conta QA historica nao pode ser administradora. Mantemos os operadores
-- existentes por e-mail como fallback ate a migracao completa para beta_admins.
delete from public.beta_admins a
using auth.users u
where a.user_id = u.id
  and lower(u.email) = 'teste@longyu.app';

create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.beta_admins a where a.user_id = auth.uid()
  )
  or exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) in (
        'admin@longyu.app',
        'matheus.stangherlin@hotmail.com',
        'minemoostraa@gmail.com'
      )
  );
$$;

-- Compatibilidade: o frontend ainda envia o proprio UUID. O servidor valida
-- que o alvo e o usuario autenticado antes de executar como definer.
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
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
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
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  perform public.ensure_league_membership(p_user_id);
  perform public.finalize_stale_league_cohorts();

  select * into v_m from public.league_memberships where user_id = p_user_id;

  if v_m.current_week_key <> v_week then
    update public.league_memberships
    set current_week_key = v_week,
        weekly_xp = 0,
        rank_position = null,
        updated_at = now()
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

-- Endpoints anonimos intencionais. Cada um limita e valida o payload.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.issue_beta_pedagogy_anon_session(text)',
    'public.submit_beta_feedback(text,text,text,text,text,integer,text,text,text,text,text)',
    'public.submit_beta_pedagogy_event(text,text,text,text,integer,jsonb,text,text,text,text)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('grant execute on function %s to anon', signature);
    end if;
  end loop;
end;
$$;

-- API autenticada do produto. Helpers internos, triggers, Vault, cleanup e
-- webhooks permanecem inacessiveis a anon/authenticated.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.search_public_profiles(text)',
    'public.get_public_profile_by_username(text)',
    'public.get_public_profiles_by_ids(uuid[])',
    'public.ensure_referral_code()',
    'public.attribute_referral(text)',
    'public.process_referral_pipeline()',
    'public.get_referral_dashboard()',
    'public.get_server_entitlement()',
    'public.get_server_economy()',
    'public.consume_charge(text,text)',
    'public.spend_qi(integer,text,text)',
    'public.grant_lesson_reward(text,text,integer,boolean)',
    'public.grant_story_energy(text,text)',
    'public.claim_mission(text,text,text,integer)',
    'public.open_chest(text,text)',
    'public.migrate_local_economy(jsonb,text)',
    'public.ensure_league_membership(uuid)',
    'public.sync_league_week(uuid)',
    'public.add_league_weekly_xp(integer,text)',
    'public.get_league_standings()',
    'public.claim_league_week_reward(text)',
    'public.submit_beta_feedback(text,text,text,text,text,integer,text,text,text,text,text)',
    'public.submit_beta_pedagogy_event(text,text,text,text,integer,jsonb,text,text,text,text)',
    'public.update_beta_feedback_admin(uuid,text,text)',
    'public.is_beta_admin()',
    'public.ensure_own_profile(text,date,text,text,boolean,boolean)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('grant execute on function %s to authenticated', signature);
    end if;
  end loop;
end;
$$;

commit;


-- 20260808070849_secure_social_profile_boundary.sql
-- Perfis de conta permanecem privados. Toda leitura entre usuarios passa por
-- RPCs com colunas publicas enumeradas e regras explicitas de visibilidade.
begin;

drop policy if exists "profiles_select_social" on public.profiles;

-- A view historica e curada, mas uma leitura direta nao consegue distinguir
-- busca publica de relacao social. Os RPCs abaixo sao a unica API cross-user.
do $$
begin
  if to_regclass('public.public_profiles') is not null then
    execute 'revoke all privileges on table public.public_profiles from public, anon, authenticated';
  end if;
end;
$$;

-- Producao ainda pode nao ter o modulo social. Nesse caso a migration fecha a
-- policy perigosa (se existir) e nao ativa funcionalidade nova por acidente.
do $migration$
begin
  if to_regclass('public.user_follows') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'show_in_search'
     ) then
    execute $function$
      create or replace function public.search_public_profiles(search_query text)
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and p.id <> auth.uid()
          and p.username is not null
          and length(trim(coalesce(search_query, ''))) between 2 and 48
          and (
            p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where f.follower_id = auth.uid()
                and f.following_id = p.id
            )
          )
          and (
            p.username ilike '%' || trim(search_query) || '%'
            or p.name ilike '%' || trim(search_query) || '%'
          )
        order by p.public_weekly_xp desc, p.name asc
        limit 24
      $body$;
    $function$;

    execute $function$
      create or replace function public.get_public_profile_by_username(target_username text)
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and p.username is not null
          and lower(p.username) = lower(trim(coalesce(target_username, '')))
          and (
            p.id = auth.uid()
            or p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where (f.follower_id = auth.uid() and f.following_id = p.id)
                 or (f.following_id = auth.uid() and f.follower_id = p.id)
            )
          )
        limit 1
      $body$;
    $function$;

    execute $function$
      create or replace function public.get_public_profiles_by_ids(target_user_ids uuid[])
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and coalesce(cardinality(target_user_ids), 0) between 1 and 100
          and p.id = any(target_user_ids)
          and p.username is not null
          and (
            p.id = auth.uid()
            or p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where (f.follower_id = auth.uid() and f.following_id = p.id)
                 or (f.following_id = auth.uid() and f.follower_id = p.id)
            )
          )
        order by p.name asc
      $body$;
    $function$;
  end if;
end;
$migration$;

do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.search_public_profiles(text)',
    'public.get_public_profile_by_username(text)',
    'public.get_public_profiles_by_ids(uuid[])'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        signature
      );
      execute format('grant execute on function %s to authenticated', signature);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;


-- 20260808073233_erase_account_personal_data.sql
-- LGPD: a exclusão do usuário deve apagar dados pessoais antes que FKs com
-- ON DELETE SET NULL os transformem em registros órfãos não rastreáveis.
-- O trigger participa da mesma transação do hard delete em auth.users: qualquer
-- falha aborta a exclusão inteira, em vez de deixar uma remoção parcial.

create or replace function public.erase_account_personal_data_before_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_hash text;
begin
  if old.email is not null then
    v_email_hash := pg_catalog.encode(
      extensions.digest(pg_catalog.lower(old.email), 'sha256'),
      'hex'
    );
  end if;

  delete from public.beta_feedback
  where user_id = old.id;

  delete from public.beta_pedagogy_events
  where user_id = old.id;

  -- Bloqueios por hash deixam de ser vinculáveis ao e-mail que pediu exclusão.
  delete from public.referral_email_blocks
  where first_invitee_id = old.id
     or (v_email_hash is not null and email_hash = v_email_hash);

  -- O histórico financeiro mínimo é mantido para reconciliação, sem vínculo
  -- com a conta, IDs de objetos Stripe ou payloads que possam conter PII.
  update public.transactions
  set user_id = null,
      stripe_checkout_session_id = null,
      stripe_payment_intent_id = null,
      stripe_invoice_id = null,
      stripe_subscription_id = null,
      metadata = '{"retentionPurpose":"billing_reconciliation"}'::jsonb
  where user_id = old.id;

  return old;
end;
$$;

revoke all on function public.erase_account_personal_data_before_auth_delete() from public;
revoke all on function public.erase_account_personal_data_before_auth_delete() from anon, authenticated;

drop trigger if exists longyu_erase_personal_data_before_auth_delete on auth.users;
create trigger longyu_erase_personal_data_before_auth_delete
before delete on auth.users
for each row
execute function public.erase_account_personal_data_before_auth_delete();

comment on function public.erase_account_personal_data_before_auth_delete() is
  'Apaga feedback, telemetria e hashes de referral e anonimiza o ledger financeiro antes do hard delete de auth.users.';


-- 20260808081000_harden_anonymous_ingestion.sql
-- Trusted anonymous ingestion capabilities for beta feedback and pedagogy events.
-- Anonymous rate limits must never depend only on identifiers supplied by the browser.

begin;

create table if not exists public.beta_anon_ingestion_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  rate_bucket_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  last_seen_at timestamptz not null default now(),
  constraint beta_anon_ingestion_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint beta_anon_ingestion_rate_bucket_check
    check (rate_bucket_key ~ '^[0-9a-f]{64}$')
);

create index if not exists beta_anon_ingestion_sessions_bucket_idx
  on public.beta_anon_ingestion_sessions (rate_bucket_key, created_at desc);

create index if not exists beta_anon_ingestion_sessions_expiry_idx
  on public.beta_anon_ingestion_sessions (expires_at);

alter table public.beta_anon_ingestion_sessions enable row level security;

create table if not exists public.beta_anon_ingestion_quota_counters (
  rate_bucket_key text not null,
  quota_scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  primary key (rate_bucket_key, quota_scope, window_started_at),
  constraint beta_anon_ingestion_quota_bucket_check
    check (rate_bucket_key = '__global__' or rate_bucket_key ~ '^[0-9a-f]{64}$'),
  constraint beta_anon_ingestion_quota_scope_check
    check (char_length(quota_scope) between 1 and 100),
  constraint beta_anon_ingestion_quota_count_check
    check (request_count >= 0)
);

create index if not exists beta_anon_ingestion_quota_expiry_idx
  on public.beta_anon_ingestion_quota_counters (expires_at);

alter table public.beta_anon_ingestion_quota_counters enable row level security;

alter table public.beta_feedback
  add column if not exists anon_session_id uuid
    references public.beta_anon_ingestion_sessions(id) on delete set null,
  add column if not exists rate_bucket_key text;

create index if not exists beta_feedback_anon_session_idx
  on public.beta_feedback (anon_session_id, created_at desc)
  where anon_session_id is not null;

create index if not exists beta_feedback_rate_bucket_idx
  on public.beta_feedback (rate_bucket_key, created_at desc)
  where rate_bucket_key is not null;

alter table public.beta_pedagogy_events
  add column if not exists anon_session_id uuid
    references public.beta_anon_ingestion_sessions(id) on delete set null;

create index if not exists beta_pedagogy_events_anon_session_idx
  on public.beta_pedagogy_events (anon_session_id, created_at desc)
  where anon_session_id is not null;

comment on table public.beta_anon_ingestion_sessions is
  'Bearer capabilities emitted only by the trusted Edge Function. Stores no raw IP.';
comment on column public.beta_anon_ingestion_sessions.rate_bucket_key is
  'Daily HMAC bucket derived from trusted edge network metadata; not reversible without the server secret.';
comment on table public.beta_anon_ingestion_quota_counters is
  'Atomic per-origin and global anonymous ingestion counters.';

-- Atomically consumes both an origin quota and its global ceiling. An exception
-- rolls back both increments, so parallel requests cannot race past the limit.
create or replace function public.beta_anon_consume_ingestion_quota(
  p_rate_bucket_key text,
  p_scope text,
  p_window_seconds integer,
  p_origin_limit integer,
  p_global_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket text := pg_catalog.lower(trim(coalesce(p_rate_bucket_key, '')));
  v_scope text := pg_catalog.left(trim(coalesce(p_scope, '')), 100);
  v_window timestamptz;
  v_expires timestamptz;
  v_count integer;
begin
  if v_bucket !~ '^[0-9a-f]{64}$'
     or v_scope = ''
     or p_window_seconds < 1
     or p_origin_limit < 1
     or p_global_limit < p_origin_limit then
    raise exception 'invalid_quota_configuration';
  end if;

  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(
      extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds
    ) * p_window_seconds
  );
  v_expires := v_window + pg_catalog.make_interval(secs => p_window_seconds * 2);

  insert into public.beta_anon_ingestion_quota_counters as counters (
    rate_bucket_key, quota_scope, window_started_at, request_count, expires_at
  ) values (
    v_bucket, v_scope, v_window, 1, v_expires
  )
  on conflict (rate_bucket_key, quota_scope, window_started_at)
  do update set
    request_count = counters.request_count + 1,
    expires_at = greatest(counters.expires_at, excluded.expires_at)
  where counters.request_count < p_origin_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'rate_limited';
  end if;

  v_count := null;
  insert into public.beta_anon_ingestion_quota_counters as counters (
    rate_bucket_key, quota_scope, window_started_at, request_count, expires_at
  ) values (
    '__global__', v_scope, v_window, 1, v_expires
  )
  on conflict (rate_bucket_key, quota_scope, window_started_at)
  do update set
    request_count = counters.request_count + 1,
    expires_at = greatest(counters.expires_at, excluded.expires_at)
  where counters.request_count < p_global_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'global_rate_limited';
  end if;
end;
$$;

revoke all on function public.beta_anon_consume_ingestion_quota(
  text, text, integer, integer, integer
) from public, anon, authenticated;

-- Called by the Edge Function with service_role after it derives an HMAC bucket
-- from the trusted proxy IP. Browser-controlled IDs never reach this argument.
create or replace function public.issue_beta_anon_ingestion_session(
  p_rate_bucket_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket text := pg_catalog.lower(trim(coalesce(p_rate_bucket_key, '')));
  v_token text := pg_catalog.replace(
    pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text,
    '-',
    ''
  );
begin
  if v_bucket !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_bucket';
  end if;

  perform public.beta_anon_consume_ingestion_quota(
    v_bucket, 'session_hour', 3600, 3, 500
  );
  perform public.beta_anon_consume_ingestion_quota(
    v_bucket, 'session_day', 86400, 6, 5000
  );

  insert into public.beta_anon_ingestion_sessions (
    token_hash, rate_bucket_key
  ) values (
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_bucket
  );

  return v_token;
end;
$$;

revoke all on function public.issue_beta_anon_ingestion_session(text)
  from public, anon, authenticated;
grant execute on function public.issue_beta_anon_ingestion_session(text) to service_role;

create or replace function public.beta_anon_resolve_ingestion_session(
  p_token text
)
returns table (session_id uuid, rate_bucket_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := trim(coalesce(p_token, ''));
begin
  if pg_catalog.length(v_token) <> 64 then
    raise exception 'invalid_anon_session';
  end if;

  return query
  update public.beta_anon_ingestion_sessions as sessions
  set last_seen_at = pg_catalog.now()
  where sessions.token_hash = pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex')
    and sessions.expires_at > pg_catalog.now()
  returning sessions.id, sessions.rate_bucket_key;

  if not found then
    raise exception 'invalid_anon_session';
  end if;
end;
$$;

revoke all on function public.beta_anon_resolve_ingestion_session(text)
  from public, anon, authenticated;

create or replace function public.beta_submit_feedback_core(
  p_category text,
  p_message text,
  p_route text,
  p_lesson_id text,
  p_exercise_kind text,
  p_exercise_index integer,
  p_app_version text,
  p_browser text,
  p_viewport text,
  p_local_profile_id text,
  p_client_dedupe_key text,
  p_anon_session_id uuid,
  p_trusted_rate_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(
    pg_catalog.left(trim(coalesce(p_local_profile_id, '')), 80),
    ''
  );
  v_dedupe text := nullif(
    pg_catalog.left(trim(coalesce(p_client_dedupe_key, '')), 220),
    ''
  );
  v_id uuid;
  v_msg text := trim(coalesce(p_message, ''));
  v_cat text := trim(coalesce(p_category, ''));
begin
  if v_uid is null and (v_local is null or p_anon_session_id is null) then
    raise exception 'anon_session_required';
  end if;

  if v_cat not in (
    'erro_conteudo', 'traducao', 'pinyin', 'audio', 'imagem',
    'exercicio_confuso', 'erro_tecnico', 'sugestao', 'outro'
  ) then
    raise exception 'invalid_category';
  end if;

  if char_length(v_msg) < 3 or char_length(v_msg) > 4000 then
    raise exception 'invalid_message';
  end if;

  if v_msg ~* '(password|senha|token|apikey|api_key|service_role|localStorage|supabase)' then
    raise exception 'forbidden_content';
  end if;

  if v_dedupe is not null then
    select feedback.id into v_id
    from public.beta_feedback as feedback
    where feedback.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and feedback.user_id = v_uid)
        or (
          v_uid is null
          and feedback.anon_session_id = p_anon_session_id
        )
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      p_trusted_rate_key, 'feedback_minute', 60, 1, 60
    );
    perform public.beta_anon_consume_ingestion_quota(
      p_trusted_rate_key, 'feedback_hour', 3600, 8, 1000
    );
  elsif public.beta_feedback_rate_limited(v_uid, null) then
    raise exception 'rate_limited';
  end if;

  insert into public.beta_feedback (
    user_id,
    local_profile_id,
    category,
    message,
    route,
    lesson_id,
    exercise_kind,
    exercise_index,
    app_version,
    browser,
    viewport,
    status,
    client_dedupe_key,
    anon_session_id,
    rate_bucket_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_cat,
    v_msg,
    pg_catalog.left(coalesce(p_route, ''), 300),
    nullif(pg_catalog.left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(pg_catalog.left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    pg_catalog.left(coalesce(p_app_version, ''), 40),
    pg_catalog.left(coalesce(p_browser, ''), 240),
    pg_catalog.left(coalesce(p_viewport, ''), 40),
    'new',
    v_dedupe,
    case when v_uid is null then p_anon_session_id else null end,
    case when v_uid is null then p_trusted_rate_key else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.beta_submit_feedback_core(
  text, text, text, text, text, integer, text, text, text, text, text, uuid, text
) from public, anon, authenticated;

-- Legacy signature stays available only to authenticated users. This closes the
-- direct anonymous path that trusted only local_profile_id.
create or replace function public.submit_beta_feedback(
  p_category text,
  p_message text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_app_version text default '',
  p_browser text default '',
  p_viewport text default '',
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'anon_session_required';
  end if;

  return public.beta_submit_feedback_core(
    p_category, p_message, p_route, p_lesson_id, p_exercise_kind,
    p_exercise_index, p_app_version, p_browser, p_viewport,
    p_local_profile_id, p_client_dedupe_key, null, null
  );
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) to authenticated;

-- Token-aware signature used by the current client. Authenticated users may pass
-- NULL because their JWT is already a trusted identity.
create or replace function public.submit_beta_feedback(
  p_category text,
  p_message text,
  p_anon_session_token text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_app_version text default '',
  p_browser text default '',
  p_viewport text default '',
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_rate_bucket text;
begin
  if auth.uid() is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_rate_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  end if;

  return public.beta_submit_feedback_core(
    p_category, p_message, p_route, p_lesson_id, p_exercise_kind,
    p_exercise_index, p_app_version, p_browser, p_viewport,
    p_local_profile_id, p_client_dedupe_key, v_session_id, v_rate_bucket
  );
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, text, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, text, integer, text, text, text, text, text
) to anon, authenticated;

-- Replace the pedagogy endpoint in place: existing authenticated clients remain
-- compatible, while anonymous calls now require the trusted Edge capability.
create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_trusted_bucket text;
  v_session_id uuid;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_type_minute_limit integer;
  v_type_day_limit integer;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_uid is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_trusted_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  else
    select coalesce(profiles.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles as profiles
    where profiles.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'image_exercise_answered',
    'lesson_abandoned'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := case
    when v_uid is null then v_trusted_bucket
    else public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest)
  end;

  if v_dedupe is not null then
    select events.id into v_id
    from public.beta_pedagogy_events as events
    where events.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and events.user_id = v_uid)
        or (v_uid is null and events.anon_session_id = v_session_id)
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_minute', 60, 60, 600
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_day', 86400, 1000, 100000
    );

    v_type_minute_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 15
      when v_type like 'conversation_%' then 30
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' then 600
      else 1000
    end;

    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_minute:' || v_type,
      60,
      v_type_minute_limit,
      v_type_minute_limit * 1000
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_day:' || v_type,
      86400,
      v_type_day_limit,
      v_type_day_limit * 1000
    );
  else
    if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
      raise exception 'rate_limited';
    end if;

    if public.beta_pedagogy_event_type_rate_limited(
      v_uid, v_local, v_digest, v_type, v_lesson, v_scene
    ) then
      raise exception 'event_rate_limited';
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key,
    anon_session_id
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket,
    case when v_uid is null then v_session_id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;

-- The legacy browser-controlled issuer is no longer an anonymous endpoint.
revoke execute on function public.issue_beta_pedagogy_anon_session(text)
  from public, anon, authenticated;

create or replace function public.cleanup_beta_pedagogy_events(
  p_retain_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_retain_days, 1));
  v_deleted integer := 0;
begin
  insert into public.beta_pedagogy_daily_metrics as metrics (
    day, event_type, lesson_id, event_count
  )
  select
    (timezone('utc', events.created_at))::date,
    events.event_type,
    coalesce(events.lesson_id, ''),
    count(*)::integer
  from public.beta_pedagogy_events as events
  where events.created_at < v_cutoff
  group by 1, 2, 3
  on conflict (day, event_type, lesson_id)
  do update set event_count = metrics.event_count + excluded.event_count;

  delete from public.beta_pedagogy_events where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.beta_pedagogy_anon_sessions
  where expires_at < now() - interval '7 days';

  delete from public.beta_anon_ingestion_sessions
  where expires_at < now() - interval '7 days';

  delete from public.beta_anon_ingestion_quota_counters
  where expires_at < now() - interval '1 day';

  return v_deleted;
end;
$$;

revoke all on function public.cleanup_beta_pedagogy_events(integer)
  from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;


-- 20260808093000_harden_referral_qualification.sql
-- Referral rewards must never be derived from client-writable progress JSON.
-- A lesson counts only after an authenticated, server-timed attempt for a
-- catalogued lesson is completed. The browser can request an attempt, but it
-- cannot choose the start/completion timestamps or write the evidence tables.

create table if not exists public.referral_eligible_lessons (
  lesson_id text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_eligible_lesson_id_check
    check (lesson_id = trim(lesson_id) and char_length(lesson_id) between 1 and 80)
);

insert into public.referral_eligible_lessons (lesson_id)
select lesson_id
from unnest(array[
  'p1-o-que-e-mandarim', 'p1-o-que-e-pinyin', 'p1-o-que-e-tom',
  'p1-o-que-e-hanzi', 'p1-primeiros-hanzi', 'p1-engine-2-lab',
  'l1', 'l2', 'l3', 'l1-rev', 'l4', 'p1-ate-logo',
  'p1-primeira-conversa', 'p1-qingwen-cortesia', 'l2-rev',
  'p2-ma-primeiro-tom', 'p2-ma-segundo-tom', 'p2-ma-terceiro-tom',
  'p2-ma-quarto-tom', 'p2-comparar-tom-1-4', 'p2-comparar-tom-2-3',
  'l5', 'l6', 'l3-rev', 'l7', 'l8', 'l8-compare', 'l8-shi',
  'p2-tons-nihao', 'p2-tons-xiexie', 'p2-sons-brasileiros',
  'p2-numeros-1-5', 'l4-rev', 'l9', 'l9-tudo-bem', 'l9-qual-nome',
  'l10', 'p3-wohenhao', 'p3-wobuhui-shuo-zhongwen',
  'p3-qing-zai-shuo-yibian', 'l11', 'l11-falo-pouco', 'l12', 'l13',
  'l13-dialogo-ola', 'l13-dialogo-nome', 'p3-ordem-das-palavras',
  'l5-rev', 'l14', 'p4-num-123', 'p4-num-45', 'p4-num-678',
  'p4-num-910', 'p4-char-mu', 'p4-char-ren', 'p4-char-kou',
  'p4-char-ri', 'p4-char-yue', 'p4-char-shan', 'p4-char-shui',
  'p4-char-tian', 'p4-char-huo', 'p4-char-da', 'p4-char-xiao',
  'p4-char-zhong', 'p4-char-bu', 'p4-char-shi', 'p4-char-wo',
  'p4-char-ni', 'l14-numeros-visuais', 'l14-pecas-natureza',
  'l14-frase-minima', 'l14-char-rev', 'l15', 'l6-rev', 'l16', 'l17',
  'l18', 'l7-rev', 'p4-checkpoint-fundamentos', 'p5-mu-mu-lin',
  'p5-mu-mu-mu-sen', 'p5-ri-yue-ming', 'p5-ren-mu-xiu',
  'p5-nv-zi-hao', 'p5-ren-ren-cong', 'p5-ren-ren-ren-zhong',
  'p5-nv-ma-mae', 'p5-kou-ma-pergunta', 'l19-logica-madeira',
  'l19-logica-luz', 'l19-logica-pessoas', 'l19-logica-ma',
  'l19-logica-rev', 'l19', 'l20', 'l8-rev', 'l21', 'l22', 'l23',
  'l9-rev', 'l24', 'l25', 'l26', 'l26b', 'l27', 'l28',
  'p6-rotina-trabalho', 'p6-cidade-lugares', 'p6-saude', 'p6-horarios',
  'p6-natureza', 'p6-clima', 'p6-direcoes', 'p6-compras', 'l10-rev',
  'l29', 'l30', 'l11-rev', 'p7-imersao-mercado', 'p7-imersao-estacao',
  'p7-imersao-casa-amigo'
]::text[]) as catalog(lesson_id)
on conflict (lesson_id) do update set enabled = true;

create table if not exists public.referral_lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.referral_eligible_lessons(lesson_id),
  started_at timestamptz not null default now(),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint referral_lesson_session_window_check check (
    not_before > started_at
    and expires_at > not_before
    and (completed_at is null or completed_at >= not_before)
  )
);

create unique index if not exists referral_lesson_sessions_active_uidx
  on public.referral_lesson_sessions (user_id, lesson_id)
  where completed_at is null;

create index if not exists referral_lesson_sessions_user_started_idx
  on public.referral_lesson_sessions (user_id, started_at desc);

create index if not exists referral_lesson_sessions_lesson_idx
  on public.referral_lesson_sessions (lesson_id);

create table if not exists public.referral_verified_lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.referral_eligible_lessons(lesson_id),
  source_session_id uuid not null unique references public.referral_lesson_sessions(id) on delete restrict,
  completed_at timestamptz not null,
  primary key (user_id, lesson_id)
);

create index if not exists referral_verified_completion_user_time_idx
  on public.referral_verified_lesson_completions (user_id, completed_at desc);

create index if not exists referral_verified_completion_lesson_idx
  on public.referral_verified_lesson_completions (lesson_id);

alter table public.referral_eligible_lessons enable row level security;
alter table public.referral_lesson_sessions enable row level security;
alter table public.referral_verified_lesson_completions enable row level security;

-- No table policy is intentional: all mutation and reads cross the narrow RPCs.
revoke all on table public.referral_eligible_lessons from public, anon, authenticated;
revoke all on table public.referral_lesson_sessions from public, anon, authenticated;
revoke all on table public.referral_verified_lesson_completions from public, anon, authenticated;

create or replace function public.start_referral_lesson_session(p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson text := left(trim(coalesce(p_lesson_id, '')), 80);
  v_existing public.referral_lesson_sessions%rowtype;
  v_started_today integer;
  v_day_start timestamptz := (timezone('utc', now())::date at time zone 'utc');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_lesson = '' or not exists (
    select 1
    from public.referral_eligible_lessons lesson
    where lesson.lesson_id = v_lesson and lesson.enabled
  ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_lesson');
  end if;

  -- Serialize starts for one user/day so the daily ceiling is race-safe.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text || '|' || v_day_start::text, 0)
  );

  if exists (
    select 1
    from public.referral_verified_lesson_completions completion
    where completion.user_id = v_uid and completion.lesson_id = v_lesson
  ) then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;

  delete from public.referral_lesson_sessions session
  where session.user_id = v_uid
    and session.lesson_id = v_lesson
    and session.completed_at is null
    and session.expires_at <= now();

  select session.* into v_existing
  from public.referral_lesson_sessions session
  where session.user_id = v_uid
    and session.lesson_id = v_lesson
    and session.completed_at is null
    and session.expires_at > now()
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'session_id', v_existing.id,
      'not_before', v_existing.not_before,
      'expires_at', v_existing.expires_at,
      'reused', true
    );
  end if;

  select count(*)::integer into v_started_today
  from public.referral_lesson_sessions session
  where session.user_id = v_uid and session.started_at >= v_day_start;

  if v_started_today >= 24 then
    return jsonb_build_object('ok', false, 'error', 'daily_limit');
  end if;

  insert into public.referral_lesson_sessions (
    user_id, lesson_id, not_before, expires_at
  ) values (
    v_uid, v_lesson, now() + interval '45 seconds', now() + interval '4 hours'
  ) returning * into v_existing;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_existing.id,
    'not_before', v_existing.not_before,
    'expires_at', v_existing.expires_at,
    'reused', false
  );
end;
$$;

create or replace function public.complete_referral_lesson_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.referral_lesson_sessions%rowtype;
  v_inserted integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select session.* into v_session
  from public.referral_lesson_sessions session
  where session.id = p_session_id and session.user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;
  if v_session.completed_at is not null then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'session_expired');
  end if;
  if v_session.not_before > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_soon',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_session.not_before - now())))::integer)
    );
  end if;

  insert into public.referral_verified_lesson_completions (
    user_id, lesson_id, source_session_id, completed_at
  ) values (
    v_uid, v_session.lesson_id, v_session.id, now()
  ) on conflict (user_id, lesson_id) do nothing;
  get diagnostics v_inserted = row_count;

  update public.referral_lesson_sessions
  set completed_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'verified', v_inserted = 1,
    'already_completed', v_inserted = 0
  );
end;
$$;

create or replace function public._referral_verified_progress(
  p_user_id uuid,
  p_since timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lesson_count', count(distinct completion.lesson_id)::integer,
    'active_days', count(distinct (timezone('utc', completion.completed_at))::date)::integer
  )
  from public.referral_verified_lesson_completions completion
  join public.referral_eligible_lessons lesson
    on lesson.lesson_id = completion.lesson_id and lesson.enabled
  where completion.user_id = p_user_id
    and completion.completed_at >= p_since;
$$;

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count integer;
  active_days integer;
  flags jsonb := '[]'::jsonb;
begin
  select * into r
  from public.referrals referral
  where referral.id = p_referral_id
  for update;

  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  select account.id, account.created_at, account.email_confirmed_at
  into invitee_user
  from auth.users account
  where account.id = r.invitee_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invitee_missing');
  end if;
  if invitee_user.email_confirmed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;
  if invitee_user.created_at > now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_new');
  end if;
  if invitee_user.created_at < now() - interval '14 days' then
    update public.referrals
    set status = 'rejected',
        rejected_at = now(),
        risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_verified_progress(r.invitee_id, r.attributed_at);
  lesson_count := coalesce((stats ->> 'lesson_count')::integer, 0);
  active_days := coalesce((stats ->> 'active_days')::integer, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'qualified', true);
end;
$$;

revoke all on function public.start_referral_lesson_session(text)
  from public, anon, authenticated;
grant execute on function public.start_referral_lesson_session(text) to authenticated;

revoke all on function public.complete_referral_lesson_session(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_referral_lesson_session(uuid) to authenticated;

revoke all on function public._referral_verified_progress(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public._referral_verified_progress(uuid, timestamptz) to service_role;

revoke all on function public._referral_try_qualify(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_try_qualify(uuid) to service_role;

comment on table public.referral_verified_lesson_completions is
  'Server-timed evidence used for referral qualification; never written through table APIs.';
comment on function public.start_referral_lesson_session(text) is
  'Starts a bounded authenticated referral-learning attestation for a catalogued lesson.';
comment on function public.complete_referral_lesson_session(uuid) is
  'Completes an owned, unexpired and sufficiently aged lesson attestation.';


-- 20260808130000_harden_economy_reward_trust.sql
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


-- 20260808130100_harden_subscription_event_ordering.sql
-- Ordenação composta de eventos Stripe + cancelamento terminal no mesmo segundo.

begin;

alter table public.subscriptions
  add column if not exists stripe_event_id text;

comment on column public.subscriptions.stripe_event_id is
  'Último Stripe event.id aplicado; desempata eventos com o mesmo event.created.';

drop function if exists public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
);

create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created bigint,
  p_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions;
  v_row_count integer := 0;
  v_event_id text := nullif(trim(coalesce(p_event_id, '')), '');
  v_is_newer boolean := false;
  v_same_event boolean := false;
begin
  if p_subscription_id is null then
    return jsonb_build_object('ok', false, 'applied', false, 'reason', 'missing_subscription_id');
  end if;

  select * into v_row
  from public.subscriptions s
  where s.stripe_subscription_id = p_subscription_id
  for update;

  if found then
    v_same_event :=
      v_event_id is not null
      and v_row.stripe_event_id is not null
      and v_event_id = v_row.stripe_event_id;

    v_is_newer :=
      v_row.stripe_event_created is null
      or p_event_created > v_row.stripe_event_created
      or (
        p_event_created = v_row.stripe_event_created
        and v_event_id is not null
        and (
          v_row.stripe_event_id is null
          or v_event_id > v_row.stripe_event_id
        )
      );

    -- Idempotência: o mesmo event.id pode ser reprocessado sem mudar a ordem.
    if v_same_event then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'duplicate_event');
    end if;

    -- Cancelamento terminal no mesmo segundo: um active/trialing atrasado
    -- com created <= ao canceled persistido não pode ressuscitar Pro.
    if v_row.status = 'canceled'
       and coalesce(p_status, '') is distinct from 'canceled'
       and p_event_created <= coalesce(v_row.stripe_event_created, -1) then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'terminal_canceled');
    end if;

    if not v_is_newer then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'stale');
    end if;
  end if;

  if p_user_id is null then
    if not found then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'stale_or_missing');
    end if;

    update public.subscriptions s
    set
      stripe_customer_id = coalesce(p_customer_id, s.stripe_customer_id),
      status = p_status,
      price_id = coalesce(p_price_id, s.price_id),
      current_period_start = coalesce(p_current_period_start, s.current_period_start),
      current_period_end = coalesce(p_current_period_end, s.current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
      stripe_event_created = p_event_created,
      stripe_event_id = coalesce(v_event_id, s.stripe_event_id),
      updated_at = now()
    where s.stripe_subscription_id = p_subscription_id;

    get diagnostics v_row_count = row_count;
    return jsonb_build_object(
      'ok', true,
      'applied', v_row_count > 0,
      'reason', case when v_row_count > 0 then 'updated' else 'stale_or_missing' end
    );
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    stripe_event_created, stripe_event_id, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_status, p_price_id,
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created, v_event_id, now()
  )
  on conflict (stripe_subscription_id) do update set
    user_id = coalesce(excluded.user_id, public.subscriptions.user_id),
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    status = excluded.status,
    price_id = coalesce(excluded.price_id, public.subscriptions.price_id),
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_created = excluded.stripe_event_created,
    stripe_event_id = coalesce(excluded.stripe_event_id, public.subscriptions.stripe_event_id),
    updated_at = now();

  get diagnostics v_row_count = row_count;
  return jsonb_build_object(
    'ok', true,
    'applied', v_row_count > 0,
    'reason', case when v_row_count > 0 then 'upserted' else 'stale' end
  );
end;
$$;

revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text
) from public;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text
) to service_role;

commit;


-- 20260808130200_admin_roles_user_id.sql
-- Admin passa a ser só beta_admins(user_id). Pro de QA deixa de depender de
-- short-circuit por e-mail nas RPCs e usa a assinatura interna já seedada.

begin;

-- Operadores conhecidos → tabela de papéis por user_id (se a conta existir).
insert into public.beta_admins (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) in (
  'admin@longyu.app',
  'matheus.stangherlin@hotmail.com',
  'minemoostraa@gmail.com'
)
on conflict (user_id) do update
set email = excluded.email;

-- QA nunca é admin.
delete from public.beta_admins a
using auth.users u
where a.user_id = u.id
  and lower(u.email) = 'teste@longyu.app';

create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.beta_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_beta_admin() from public;
grant execute on function public.is_beta_admin() to authenticated;

-- Pro: Stripe ativo OU grant ativo. Sem short-circuit por e-mail.
create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_pro boolean := false;
  v_source text := 'none';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none');
  end if;

  if public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'stripe';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'grant';
  end if;

  return jsonb_build_object('ok', true, 'is_pro', v_is_pro, 'source', v_source);
end;
$$;

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._user_stripe_pro_active(p_user_id)
      or public.user_has_entitlement_grant(p_user_id);
$$;

revoke all on function public.get_server_entitlement() from public;
grant execute on function public.get_server_entitlement() to authenticated;

revoke all on function public.economy_user_is_pro(uuid) from public;
grant execute on function public.economy_user_is_pro(uuid) to authenticated;

-- Garante a assinatura interna da conta QA (resolve e-mail → user_id uma vez).
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

commit;


-- 20260808140000_economy_anti_cheat_qi.sql
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


-- 20260808150000_abuse_controls_ip_email_snapshot.sql
-- Fecha farming de Pro por plus-addressing, limpa grant anon de is_beta_admin,
-- e limita abuso de snapshot/liga pública declarada pelo cliente.

begin;

create or replace function public.canonicalize_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_email, '')));
  local_part text;
  domain text;
  at_pos integer;
begin
  if v = '' then
    return '';
  end if;

  at_pos := position('@' in v);
  if at_pos < 2 then
    return v;
  end if;

  local_part := left(v, at_pos - 1);
  domain := substring(v from at_pos + 1);

  if position('+' in local_part) > 0 then
    local_part := split_part(local_part, '+', 1);
  end if;

  if domain = 'googlemail.com' then
    domain := 'gmail.com';
  end if;

  if domain = 'gmail.com' then
    local_part := replace(local_part, '.', '');
  end if;

  return local_part || '@' || domain;
end;
$$;

revoke all on function public.canonicalize_email(text) from public;
grant execute on function public.canonicalize_email(text) to authenticated, service_role;

create or replace function public._user_email_hash(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(
    digest(public.canonicalize_email(coalesce(u.email, '')), 'sha256'),
    'hex'
  )
  from auth.users u
  where u.id = p_user_id;
$$;

revoke all on function public._user_email_hash(uuid) from public;
grant execute on function public._user_email_hash(uuid) to service_role;

-- is_beta_admin: só authenticated (remove resíduo de grant a anon).
revoke all on function public.is_beta_admin() from public, anon, authenticated;
grant execute on function public.is_beta_admin() to authenticated;

-- Stats sociais / snapshot: limites de abuso de armazenamento e valores.
alter table public.profiles
  drop constraint if exists profiles_league_tier_allowed;

alter table public.profiles
  add constraint profiles_league_tier_allowed
  check (
    league_tier is null
    or league_tier in ('bronze', 'prata', 'ouro', 'jade', 'dragao', 'mestre', 'celestial')
  );

alter table public.profiles
  drop constraint if exists profiles_name_length;

alter table public.profiles
  add constraint profiles_name_length
  check (name is null or char_length(name) <= 80);

alter table public.user_progress
  drop constraint if exists user_progress_client_snapshot_size;

alter table public.user_progress
  add constraint user_progress_client_snapshot_size
  check (
    client_snapshot is null
    or octet_length(client_snapshot::text) <= 262144
  );

-- Trigger social: não copia league_tier/nome inválidos.
create or replace function public.sync_profile_public_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  progress jsonb;
  v_name text;
  v_tier text;
  v_weekly integer;
  v_streak integer;
begin
  if new.client_snapshot is null then
    return new;
  end if;

  progress := new.client_snapshot -> 'progress';
  v_name := nullif(trim(new.client_snapshot -> 'account' ->> 'name'), '');
  if v_name is not null then
    v_name := left(v_name, 80);
  end if;

  v_tier := nullif(trim(progress ->> 'leagueTier'), '');
  if v_tier is not null
     and v_tier not in ('bronze', 'prata', 'ouro', 'jade', 'dragao', 'mestre', 'celestial') then
    v_tier := null;
  end if;

  begin
    v_weekly := greatest(0, least(coalesce((progress ->> 'weeklyXp')::integer, 0), 5000));
  exception when others then
    v_weekly := null;
  end;

  begin
    v_streak := greatest(0, least(coalesce((progress ->> 'streak')::integer, 0), 3650));
  exception when others then
    v_streak := null;
  end;

  update public.profiles
  set
    name = coalesce(v_name, name),
    league_tier = coalesce(v_tier, league_tier),
    public_weekly_xp = coalesce(v_weekly, public_weekly_xp),
    public_streak = coalesce(v_streak, public_streak),
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

commit;


-- 20260808160000_revoke_economy_user_is_pro_client.sql
-- Residual abuse hardening: clients must not probe arbitrary UUIDs for Pro status.
-- economy_user_is_pro is an internal SECURITY DEFINER helper used by league RPCs
-- and Stripe/economy paths. Authenticated was re-granted EXECUTE in
-- 20260808130200_admin_roles_user_id.sql; revoke client roles again.
--
-- Peer Pro badges in get_league_standings remain a product surface (scoped),
-- not a free UUID oracle.

REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM authenticated;

-- Defense in depth: entitlement grant helper must stay service-role only.
DO $$
BEGIN
  IF to_regprocedure('public.user_has_entitlement_grant(uuid, text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM authenticated';
  END IF;
END $$;


-- 20260808170000_harden_client_reward_claims.sql
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


-- 20260809160306_require_referral_reward_review.sql
-- Referral learning evidence is still produced by an untrusted browser flow.
-- It may nominate a referral for review, but only an independent service-role
-- decision may cross the paid-entitlement boundary.

begin;

create table if not exists public.referral_qualification_reviews (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  review_note text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  grant_result jsonb,
  reviewed_at timestamptz not null default now(),
  constraint referral_qualification_review_note_check
    check (char_length(review_note) between 10 and 500)
);

create index if not exists referral_qualification_reviews_referral_time_idx
  on public.referral_qualification_reviews (referral_id, reviewed_at desc);

alter table public.referral_qualification_reviews enable row level security;

-- No table policy is intentional. Review history is operational security data.
revoke all on table public.referral_qualification_reviews
  from public, anon, authenticated;

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count integer;
  active_days integer;
  flags jsonb := '[]'::jsonb;
begin
  select * into r
  from public.referrals referral
  where referral.id = p_referral_id
  for update;

  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  -- Once queued, authenticated pipeline retries must remain unable to approve,
  -- grant or reject the referral while an independent review is outstanding.
  if r.status = 'under_review'
     and r.risk_flags @> '["learning_attestation_review"]'::jsonb then
    return jsonb_build_object(
      'ok', true,
      'qualified', false,
      'review_required', true
    );
  end if;

  select account.id, account.created_at, account.email_confirmed_at
  into invitee_user
  from auth.users account
  where account.id = r.invitee_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invitee_missing');
  end if;
  if invitee_user.email_confirmed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;
  if invitee_user.created_at > now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_new');
  end if;
  if invitee_user.created_at < now() - interval '14 days' then
    update public.referrals
    set status = 'rejected',
        rejected_at = now(),
        risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_verified_progress(r.invitee_id, r.attributed_at);
  lesson_count := coalesce((stats ->> 'lesson_count')::integer, 0);
  active_days := coalesce((stats ->> 'active_days')::integer, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'under_review',
      qualified_at = coalesce(qualified_at, now()),
      risk_flags = case
        when risk_flags @> '["learning_attestation_review"]'::jsonb then risk_flags
        else risk_flags || '["learning_attestation_review"]'::jsonb
      end
  where id = r.id;

  return jsonb_build_object(
    'ok', true,
    'qualified', false,
    'review_required', true,
    'lesson_count', lesson_count,
    'active_days', active_days
  );
end;
$$;

create or replace function public.review_referral_qualification(
  p_referral_id uuid,
  p_approved boolean,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count integer;
  active_days integer;
  v_note text := left(trim(coalesce(p_note, '')), 500);
  v_grant jsonb;
begin
  if p_approved is null then
    return jsonb_build_object('ok', false, 'error', 'decision_required');
  end if;
  if char_length(v_note) < 10 then
    return jsonb_build_object('ok', false, 'error', 'review_note_required');
  end if;

  select * into r
  from public.referrals referral
  where referral.id = p_referral_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'referral_not_found');
  end if;
  if r.status = 'rewarded' then
    return jsonb_build_object('ok', true, 'already_rewarded', true);
  end if;
  if r.status <> 'under_review'
     or not (r.risk_flags @> '["learning_attestation_review"]'::jsonb)
     or r.qualified_at is null then
    return jsonb_build_object('ok', false, 'error', 'review_not_required');
  end if;

  stats := public._referral_verified_progress(r.invitee_id, r.attributed_at);
  lesson_count := coalesce((stats ->> 'lesson_count')::integer, 0);
  active_days := coalesce((stats ->> 'active_days')::integer, 0);

  select account.id, account.email_confirmed_at
  into invitee_user
  from auth.users account
  where account.id = r.invitee_id;

  if not found or invitee_user.email_confirmed_at is null
     or lesson_count < 3 or active_days < 2 then
    return jsonb_build_object(
      'ok', false,
      'error', 'eligibility_changed',
      'lesson_count', lesson_count,
      'active_days', active_days
    );
  end if;

  if not p_approved then
    insert into public.referral_qualification_reviews (
      referral_id, decision, review_note, reviewer_id, eligibility_snapshot
    ) values (
      r.id,
      'rejected',
      v_note,
      auth.uid(),
      jsonb_build_object('lesson_count', lesson_count, 'active_days', active_days)
    );

    update public.referrals
    set status = 'rejected',
        rejected_at = now(),
        risk_flags = risk_flags - 'learning_attestation_review'
    where id = r.id;

    return jsonb_build_object('ok', true, 'approved', false, 'rejected', true);
  end if;

  update public.referrals
  set status = 'qualified',
      risk_flags = risk_flags - 'learning_attestation_review'
  where id = r.id;

  v_grant := public._referral_grant_reward(r.id);

  insert into public.referral_qualification_reviews (
    referral_id, decision, review_note, reviewer_id,
    eligibility_snapshot, grant_result
  ) values (
    r.id,
    'approved',
    v_note,
    auth.uid(),
    jsonb_build_object('lesson_count', lesson_count, 'active_days', active_days),
    v_grant
  );

  if coalesce((v_grant ->> 'ok')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'grant_blocked', 'grant_result', v_grant);
  end if;

  return jsonb_build_object('ok', true, 'approved', true, 'grant_result', v_grant);
end;
$$;

-- The browser-callable pipeline may refresh progress and activate grants that
-- were already created by trusted code, but it never calls the reward sink.
create or replace function public.process_referral_pipeline()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  inv_ref public.referrals%rowtype;
  qual jsonb;
  activated integer := 0;
  queued_reviews integer := 0;
  g record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into inv_ref
  from public.referrals referral
  where referral.invitee_id = v_uid
  limit 1;

  if found and inv_ref.status in ('pending', 'under_review') then
    qual := public._referral_try_qualify(inv_ref.id);
    if coalesce((qual ->> 'review_required')::boolean, false) then
      queued_reviews := queued_reviews + 1;
    end if;
  end if;

  for inv_ref in
    select *
    from public.referrals referral
    where referral.inviter_id = v_uid
      and referral.status in ('pending', 'under_review')
    order by referral.id
  loop
    qual := public._referral_try_qualify(inv_ref.id);
    if coalesce((qual ->> 'review_required')::boolean, false) then
      queued_reviews := queued_reviews + 1;
    end if;
  end loop;

  for g in
    select grant_row.*
    from public.entitlement_grants grant_row
    where grant_row.user_id = v_uid
      and grant_row.status = 'pending'
      and grant_row.starts_at <= now()
    order by grant_row.id
    for update
  loop
    update public.entitlement_grants
    set status = 'active',
        starts_at = now(),
        ends_at = now() + (g.duration_days || ' days')::interval
    where id = g.id and status = 'pending';

    if found then
      update public.referral_rewards reward
      set status = 'active',
          activated_at = now(),
          expires_at = now() + (g.duration_days || ' days')::interval
      where reward.id = g.source_id and reward.user_id = v_uid;

      activated := activated + 1;
    end if;
  end loop;

  update public.entitlement_grants
  set status = 'expired'
  where user_id = v_uid
    and status = 'active'
    and ends_at is not null
    and ends_at <= now();

  update public.referral_rewards reward
  set status = 'expired'
  where reward.user_id = v_uid
    and reward.status = 'active'
    and reward.expires_at is not null
    and reward.expires_at <= now();

  return jsonb_build_object(
    'ok', true,
    'activated', activated,
    'queued_reviews', queued_reviews
  );
end;
$$;

-- Preserve and queue any legacy qualified row that has not yet reached the
-- reward sink. Already rewarded referrals and active grants are untouched.
update public.referrals referral
set status = 'under_review',
    risk_flags = case
      when referral.risk_flags @> '["learning_attestation_review"]'::jsonb
        then referral.risk_flags
      else referral.risk_flags || '["learning_attestation_review"]'::jsonb
    end
where referral.status = 'qualified'
  and not exists (
    select 1
    from public.referral_rewards reward
    where reward.referral_id = referral.id
  );

revoke all on function public._referral_try_qualify(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_try_qualify(uuid) to service_role;

revoke all on function public._referral_grant_reward(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_grant_reward(uuid) to service_role;

revoke all on function public.review_referral_qualification(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.review_referral_qualification(uuid, boolean, text)
  to service_role;

revoke all on function public.process_referral_pipeline()
  from public, anon, authenticated;
grant execute on function public.process_referral_pipeline() to authenticated;

comment on table public.referral_qualification_reviews is
  'Append-only audit of independent decisions before referral rewards cross into paid entitlements.';
comment on function public.review_referral_qualification(uuid, boolean, text) is
  'Service-role-only approval or rejection for a referral queued by untrusted learning evidence.';

commit;


-- 20260809161134_index_referral_review_reviewer.sql
create index if not exists referral_qualification_reviews_reviewer_idx
  on public.referral_qualification_reviews (reviewer_id)
  where reviewer_id is not null;


-- 20260810170000_beta_experience_telemetry.sql
-- Beta Experience Hardening: amplia whitelist de metadados pedagógicos e
-- aceita eventos que o app já emitia (pós-conversa) + unrecognized_answer.
-- Metadados usam wallClockMs / toneHintUses / audioManualPlays (nomes honestos).
-- Sem texto de resposta livre — só enums, contagens e hash SHA-256 da forma.

create or replace function public.sanitize_pedagogy_metadata(
  p_event_type text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_text text;
  v_num numeric;
begin
  if jsonb_typeof(v_in) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  v_allowed := case p_event_type
    when 'lesson_started' then array['appVersion']
    when 'lesson_completed' then array[
      'appVersion', 'stars', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays',
      'folegoSkips', 'stepIndex', 'mistakes'
    ]
    when 'lesson_abandoned' then array[
      'appVersion', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays', 'stepIndex'
    ]
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'unrecognized', 'answerNormHash', 'answerLen', 'hasCjk'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage', 'via']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'post_conversation_shown' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount'
    ]
    when 'post_conversation_completed' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount', 'correct'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
    ]
    when 'unrecognized_answer' then array[
      'appVersion', 'answerNormHash', 'answerLen', 'expectedLen', 'hasCjk'
    ]
    else array['appVersion']
  end;

  for v_key, v_val in select key, value from jsonb_each(v_in)
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if jsonb_typeof(v_val) = 'string' then
      v_text := left(coalesce(v_val #>> '{}', ''), 80);
      v_out := v_out || jsonb_build_object(v_key, v_text);
    elsif jsonb_typeof(v_val) = 'number' then
      v_num := (v_val #>> '{}')::numeric;
      if v_num > 1e12 or v_num < -1e12 then
        continue;
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_num);
    elsif jsonb_typeof(v_val) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (v_val #>> '{}')::boolean);
    elsif jsonb_typeof(v_val) = 'null' then
      continue;
    else
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

-- Espelha a submit de 20260808081000 com allowlist ampliada (pós-conversa +
-- unrecognized_answer). Mantém quotas, colunas e assinaturas de rate-limit.
create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_trusted_bucket text;
  v_session_id uuid;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_type_minute_limit integer;
  v_type_day_limit integer;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_uid is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_trusted_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  else
    select coalesce(profiles.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles as profiles
    where profiles.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'post_conversation_shown',
    'post_conversation_completed',
    'image_exercise_answered',
    'lesson_abandoned',
    'unrecognized_answer'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := case
    when v_uid is null then v_trusted_bucket
    else public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest)
  end;

  if v_dedupe is not null then
    select events.id into v_id
    from public.beta_pedagogy_events as events
    where events.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and events.user_id = v_uid)
        or (v_uid is null and events.anon_session_id = v_session_id)
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_minute', 60, 60, 600
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_day', 86400, 1000, 100000
    );

    v_type_minute_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 15
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 30
      when v_type = 'unrecognized_answer' then 30
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 600
      when v_type = 'unrecognized_answer' then 400
      else 1000
    end;

    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_minute:' || v_type,
      60,
      v_type_minute_limit,
      v_type_minute_limit * 1000
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_day:' || v_type,
      86400,
      v_type_day_limit,
      v_type_day_limit * 1000
    );
  else
    if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
      raise exception 'rate_limited';
    end if;

    if public.beta_pedagogy_event_type_rate_limited(
      v_uid, v_local, v_digest, v_type, v_lesson, v_scene
    ) then
      raise exception 'event_rate_limited';
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key,
    anon_session_id
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket,
    case when v_uid is null then v_session_id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Ingere evento pedagógico do beta. Beta Experience Hardening: pós-conversa, unrecognized_answer e metadados de duração/diagnóstico.';


-- 20260812180000_production_help_telemetry.sql
-- Scaffolding progressivo: telemetria de ajuda (production_help_requested).

create or replace function public.sanitize_pedagogy_metadata(
  p_event_type text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_text text;
  v_num numeric;
begin
  if jsonb_typeof(v_in) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  v_allowed := case p_event_type
    when 'lesson_started' then array['appVersion']
    when 'lesson_completed' then array[
      'appVersion', 'stars', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays',
      'folegoSkips', 'stepIndex', 'mistakes'
    ]
    when 'lesson_abandoned' then array[
      'appVersion', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays', 'stepIndex'
    ]
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'unrecognized', 'answerNormHash', 'answerLen', 'hasCjk',
      'helpLevel', 'helpRequests', 'initialHelpLevel', 'productionAssist'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'helpLevel', 'helpRequests', 'initialHelpLevel', 'productionAssist'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage', 'via']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'post_conversation_shown' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount'
    ]
    when 'post_conversation_completed' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount', 'correct'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
    ]
    when 'unrecognized_answer' then array[
      'appVersion', 'answerNormHash', 'answerLen', 'expectedLen', 'hasCjk'
    ]
    when 'production_help_requested' then array[
      'appVersion', 'helpLevel', 'previousHelpLevel', 'initialHelpLevel', 'unlockedMax',
      'productionAssist', 'frameId', 'firstOfStructure'
    ]
    else array['appVersion']
  end;

  for v_key, v_val in select key, value from jsonb_each(v_in)
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if jsonb_typeof(v_val) = 'string' then
      v_text := left(coalesce(v_val #>> '{}', ''), 80);
      v_out := v_out || jsonb_build_object(v_key, v_text);
    elsif jsonb_typeof(v_val) = 'number' then
      v_num := (v_val #>> '{}')::numeric;
      if v_num > 1e12 or v_num < -1e12 then
        continue;
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_num);
    elsif jsonb_typeof(v_val) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (v_val #>> '{}')::boolean);
    elsif jsonb_typeof(v_val) = 'null' then
      continue;
    else
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_trusted_bucket text;
  v_session_id uuid;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_type_minute_limit integer;
  v_type_day_limit integer;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_uid is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_trusted_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  else
    select coalesce(profiles.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles as profiles
    where profiles.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'post_conversation_shown',
    'post_conversation_completed',
    'image_exercise_answered',
    'lesson_abandoned',
    'unrecognized_answer',
    'production_help_requested'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := case
    when v_uid is null then v_trusted_bucket
    else public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest)
  end;

  if v_dedupe is not null then
    select events.id into v_id
    from public.beta_pedagogy_events as events
    where events.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and events.user_id = v_uid)
        or (v_uid is null and events.anon_session_id = v_session_id)
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_minute', 60, 60, 600
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_day', 86400, 1000, 100000
    );

    v_type_minute_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 15
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 30
      when v_type = 'unrecognized_answer' then 30
      when v_type = 'production_help_requested' then 40
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 600
      when v_type = 'unrecognized_answer' then 400
      when v_type = 'production_help_requested' then 500
      else 1000
    end;

    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_minute:' || v_type,
      60,
      v_type_minute_limit,
      v_type_minute_limit * 1000
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_day:' || v_type,
      86400,
      v_type_day_limit,
      v_type_day_limit * 1000
    );
  else
    if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
      raise exception 'rate_limited';
    end if;

    if public.beta_pedagogy_event_type_rate_limited(
      v_uid, v_local, v_digest, v_type, v_lesson, v_scene
    ) then
      raise exception 'event_rate_limited';
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key,
    anon_session_id
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket,
    case when v_uid is null then v_session_id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Ingere evento pedagógico do beta. Inclui production_help_requested e metadados de scaffold.';

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;


-- 20260813180000_pearl_pro_economy.sql
-- Pérolas V2 + Pass Pro 7 dias (entitlement_grants source pearl_pro_pass).
-- Extende user_economy, economy snapshot e RPCs claim/activate.

begin;

-- ─── entitlement_grants: permitir source pearl_pro_pass ─────────────────────
alter table public.entitlement_grants
  drop constraint if exists entitlement_grants_source_check;

alter table public.entitlement_grants
  add constraint entitlement_grants_source_check
  check (source in (
    'referral',
    'promotion',
    'support_adjustment',
    'beta_reward',
    'pearl_pro_pass'
  ));

-- ─── user_economy: campos de Pérolas / Pro pass ─────────────────────────────
alter table public.user_economy
  add column if not exists pearl_ledger jsonb not null default '[]'::jsonb,
  add column if not exists pearl_pro_expires_at timestamptz,
  add column if not exists pearl_pro_last_activated_at timestamptz,
  add column if not exists pearl_pro_auto_activate boolean not null default false;

-- Catalogo fechado. Os contadores ainda sem uma fonte atestada ficam desabilitados:
-- e preferivel recusar um premio a confiar em progresso fabricado pelo cliente.
create table if not exists public.pearl_milestone_catalog (
  milestone_id text primary key,
  amount integer not null check (amount > 0 and amount <= 10),
  threshold integer not null check (threshold > 0),
  evidence_kind text not null check (evidence_kind in (
    'verified_streak',
    'verified_phase',
    'verified_monthly_missions',
    'server_evidence_unavailable'
  )),
  enabled boolean not null default true,
  constraint pearl_milestone_catalog_id_check check (
    length(milestone_id) between 1 and 64
    and milestone_id ~ '^[a-z0-9:_-]+$'
  )
);

insert into public.pearl_milestone_catalog (
  milestone_id, amount, threshold, evidence_kind, enabled
) values
  ('streak:7', 1, 7, 'verified_streak', true),
  ('streak:30', 2, 30, 'verified_streak', true),
  ('streak:60', 2, 60, 'verified_streak', true),
  ('streak:90', 3, 90, 'verified_streak', true),
  ('streak:180', 4, 180, 'verified_streak', true),
  ('streak:365', 6, 365, 'verified_streak', true),
  ('errors:25', 1, 25, 'server_evidence_unavailable', false),
  ('errors:100', 2, 100, 'server_evidence_unavailable', false),
  ('errors:250', 3, 250, 'server_evidence_unavailable', false),
  ('hanzi:50', 1, 50, 'server_evidence_unavailable', false),
  ('hanzi:100', 2, 100, 'server_evidence_unavailable', false),
  ('hanzi:250', 3, 250, 'server_evidence_unavailable', false),
  ('audio:100', 1, 100, 'server_evidence_unavailable', false),
  ('audio:500', 2, 500, 'server_evidence_unavailable', false),
  ('production:100', 1, 100, 'server_evidence_unavailable', false),
  ('production:500', 2, 500, 'server_evidence_unavailable', false),
  -- Template fechado: a RPC substitui "current" exclusivamente pelo mes UTC atual.
  ('monthly_challenge:current', 1, 30, 'verified_monthly_missions', true),
  ('journey_phase:p1', 1, 15, 'verified_phase', true),
  ('journey_phase:p2', 1, 18, 'verified_phase', true),
  ('journey_phase:p3', 1, 16, 'verified_phase', true),
  ('journey_phase:p4', 1, 32, 'verified_phase', true),
  ('journey_phase:p5', 1, 21, 'verified_phase', true),
  ('journey_phase:p6', 1, 15, 'verified_phase', true),
  ('journey_phase:p7', 1, 6, 'verified_phase', true)
on conflict (milestone_id) do update set
  amount = excluded.amount,
  threshold = excluded.threshold,
  evidence_kind = excluded.evidence_kind,
  enabled = excluded.enabled;

create table if not exists public.pearl_journey_phase_catalog (
  phase_id text primary key,
  lesson_ids text[] not null,
  constraint pearl_journey_phase_catalog_id_check check (phase_id ~ '^p[1-9][0-9]*$'),
  constraint pearl_journey_phase_catalog_lessons_check check (cardinality(lesson_ids) > 0)
);

insert into public.pearl_journey_phase_catalog (phase_id, lesson_ids) values
  ('p1', array[
    'p1-o-que-e-mandarim', 'p1-o-que-e-pinyin', 'p1-o-que-e-tom',
    'p1-o-que-e-hanzi', 'p1-primeiros-hanzi', 'p1-engine-2-lab', 'l1', 'l2',
    'l3', 'l1-rev', 'l4', 'p1-ate-logo', 'p1-primeira-conversa',
    'p1-qingwen-cortesia', 'l2-rev'
  ]::text[]),
  ('p2', array[
    'p2-ma-primeiro-tom', 'p2-ma-segundo-tom', 'p2-ma-terceiro-tom',
    'p2-ma-quarto-tom', 'p2-comparar-tom-1-4', 'p2-comparar-tom-2-3',
    'l5', 'l6', 'l3-rev', 'l7', 'l8', 'l8-compare', 'l8-shi', 'p2-tons-nihao',
    'p2-tons-xiexie', 'p2-sons-brasileiros', 'p2-numeros-1-5', 'l4-rev'
  ]::text[]),
  ('p3', array[
    'l9', 'l9-tudo-bem', 'l9-qual-nome', 'l10', 'p3-wohenhao',
    'p3-wobuhui-shuo-zhongwen', 'p3-qing-zai-shuo-yibian', 'l11',
    'l11-falo-pouco', 'l12', 'l13', 'l13-dialogo-ola', 'l13-dialogo-nome',
    'p3-ordem-das-palavras', 'p3-nomes-da-frase', 'l5-rev'
  ]::text[]),
  ('p4', array[
    'l14', 'p4-num-123', 'p4-num-45', 'p4-num-678', 'p4-num-910',
    'p4-char-mu', 'p4-char-ren', 'p4-char-kou', 'p4-char-ri', 'p4-char-yue',
    'p4-char-shan', 'p4-char-shui', 'p4-char-tian', 'p4-char-huo',
    'p4-char-da', 'p4-char-xiao', 'p4-char-zhong', 'p4-char-bu',
    'p4-char-shi', 'p4-char-wo', 'p4-char-ni', 'l14-numeros-visuais',
    'l14-pecas-natureza', 'l14-frase-minima', 'l14-char-rev', 'l15', 'l6-rev',
    'l16', 'l17', 'l18', 'l7-rev', 'p4-checkpoint-fundamentos'
  ]::text[]),
  ('p5', array[
    'p5-mu-mu-lin', 'p5-mu-mu-mu-sen', 'p5-ri-yue-ming', 'p5-ren-mu-xiu',
    'p5-nv-zi-hao', 'p5-ren-ren-cong', 'p5-ren-ren-ren-zhong',
    'p5-nv-ma-mae', 'p5-kou-ma-pergunta', 'l19-logica-madeira',
    'l19-logica-luz', 'l19-logica-pessoas', 'l19-logica-ma', 'l19-logica-rev',
    'l19', 'l20', 'l8-rev', 'l21', 'l22', 'l23', 'l9-rev'
  ]::text[]),
  ('p6', array[
    'l24', 'l25', 'l26', 'l26b', 'l27', 'l28', 'p6-rotina-trabalho',
    'p6-cidade-lugares', 'p6-saude', 'p6-horarios', 'p6-natureza', 'p6-clima',
    'p6-direcoes', 'p6-compras', 'l10-rev'
  ]::text[]),
  ('p7', array[
    'l29', 'l30', 'l11-rev', 'p7-imersao-mercado', 'p7-imersao-estacao',
    'p7-imersao-casa-amigo'
  ]::text[])
on conflict (phase_id) do update set lesson_ids = excluded.lesson_ids;

create table if not exists public.pearl_milestone_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_id text not null,
  amount integer not null check (amount > 0 and amount <= 10),
  claimed_at timestamptz not null default now(),
  primary key (user_id, milestone_id),
  constraint pearl_milestone_claims_id_check check (
    length(milestone_id) between 1 and 64
    and milestone_id ~ '^[a-z0-9:_-]+$'
  )
);

create index if not exists pearl_milestone_claims_user_time_idx
  on public.pearl_milestone_claims (user_id, claimed_at desc);

alter table public.pearl_milestone_catalog enable row level security;
alter table public.pearl_journey_phase_catalog enable row level security;
alter table public.pearl_milestone_claims enable row level security;

-- Sem policies: as tabelas so atravessam as RPCs SECURITY DEFINER abaixo.
revoke all on table public.pearl_milestone_catalog from public, anon, authenticated;
revoke all on table public.pearl_journey_phase_catalog from public, anon, authenticated;
revoke all on table public.pearl_milestone_claims from public, anon, authenticated;

-- ─── Snapshot JSON inclui pérolas ───────────────────────────────────────────
create or replace function public.economy_row_to_json(p_row public.user_economy)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'qi', p_row.qi,
    'dragon_pearls', p_row.dragon_pearls,
    'streak_shields', p_row.streak_shields,
    'current_charges', p_row.current_charges,
    'max_charges', p_row.max_charges,
    'energy_day', p_row.energy_day::text,
    'focus_pass_until', p_row.focus_pass_until,
    'pearl_milestones_claimed', coalesce((
      select jsonb_object_agg(
        claim.milestone_id,
        (extract(epoch from claim.claimed_at) * 1000)::bigint
      )
      from public.pearl_milestone_claims claim
      where claim.user_id = p_row.user_id
        and (
          claim.milestone_id not like 'monthly_challenge:%'
          or claim.milestone_id = 'monthly_challenge:' || to_char(timezone('utc', now()), 'YYYY-MM')
        )
    ), '{}'::jsonb),
    'pearl_ledger', coalesce(p_row.pearl_ledger, '[]'::jsonb),
    'pearl_pro_expires_at', p_row.pearl_pro_expires_at,
    'pearl_pro_last_activated_at', p_row.pearl_pro_last_activated_at,
    'pearl_pro_auto_activate', coalesce(p_row.pearl_pro_auto_activate, false)
  );
$$;

-- ─── RPC: activate_pearl_pro_pass ───────────────────────────────────────────
create or replace function public.activate_pearl_pro_pass(p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_key text := left(trim(coalesce(p_idempotency_key, '')), 128);
  v_cost integer := 12;
  v_days integer := 7;
  v_cooldown_days integer := 30;
  v_expires timestamptz;
  v_ledger jsonb;
  v_entry jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'idempotency_key_required');
  end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'is_pro', (
        public._user_stripe_pro_active(v_uid)
        or (v_row.pearl_pro_expires_at is not null and v_row.pearl_pro_expires_at > now())
      ),
      'expires_at', v_row.pearl_pro_expires_at,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  -- Assinatura Stripe ativa: não debita Pérolas.
  if public._user_stripe_pro_active(v_uid) then
    return jsonb_build_object(
      'ok', false,
      'error', 'paid_subscription',
      'is_pro', true,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  if v_row.pearl_pro_expires_at is not null and v_row.pearl_pro_expires_at > now() then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'is_pro', true,
      'expires_at', v_row.pearl_pro_expires_at,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  if v_row.pearl_pro_last_activated_at is not null
     and v_row.pearl_pro_last_activated_at > now() - make_interval(days => v_cooldown_days) then
    return jsonb_build_object(
      'ok', false,
      'error', 'cooldown',
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  if v_row.dragon_pearls < v_cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_pearls',
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  v_expires := now() + make_interval(days => v_days);
  v_entry := jsonb_build_object(
    'id', v_key,
    'direction', 'spent',
    'source', 'Pass Pro 7 dias',
    'amount', v_cost,
    'timestamp', (extract(epoch from now()) * 1000)::bigint,
    'purchaseId', 'shop-pearl-pro-pass'
  );
  v_ledger := coalesce(v_row.pearl_ledger, '[]'::jsonb) || jsonb_build_array(v_entry);
  if jsonb_array_length(v_ledger) > 200 then
    v_ledger := (
      select coalesce(jsonb_agg(e.elem), '[]'::jsonb)
      from (
        select elem
        from jsonb_array_elements(v_ledger) with ordinality as t(elem, ord)
        order by ord desc
        limit 200
      ) e
    );
  end if;

  update public.user_economy
  set
    dragon_pearls = dragon_pearls - v_cost,
    pearl_pro_expires_at = v_expires,
    pearl_pro_last_activated_at = now(),
    pearl_ledger = v_ledger,
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  insert into public.entitlement_grants (
    user_id, source, duration_days, starts_at, ends_at, status
  ) values (
    v_uid, 'pearl_pro_pass', v_days, now(), v_expires, 'active'
  );

  perform public.economy_insert_ledger(
    v_uid, 'activate_pearl_pro_pass', v_cost, 'pearl', 'pearl_pro_pass', v_key,
    jsonb_build_object('expires_at', v_expires)
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'is_pro', true,
    'expires_at', v_expires,
    'economy', public.economy_row_to_json(v_row)
  );
end;
$$;

-- ─── RPC: claim_pearl_milestone ─────────────────────────────────────────────
drop function if exists public.claim_pearl_milestone(text, text, jsonb);

create or replace function public.claim_pearl_milestone(p_milestone_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id text := left(trim(coalesce(p_milestone_id, '')), 64);
  v_catalog_id text;
  v_key text;
  v_row public.user_economy;
  v_amount integer;
  v_threshold integer;
  v_evidence_kind text;
  v_enabled boolean;
  v_verified_metric integer := 0;
  v_phase_id text;
  v_phase_lessons text[];
  v_month_start timestamptz;
  v_claimed_at timestamptz;
  v_ledger jsonb;
  v_entry jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_id = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_milestone');
  end if;

  if v_id like 'monthly_challenge:%' then
    if v_id <> 'monthly_challenge:' || to_char(timezone('utc', now()), 'YYYY-MM') then
      return jsonb_build_object('ok', false, 'error', 'invalid_month');
    end if;
    v_catalog_id := 'monthly_challenge:current';
  else
    v_catalog_id := v_id;
  end if;

  select catalog.amount, catalog.threshold, catalog.evidence_kind, catalog.enabled
  into v_amount, v_threshold, v_evidence_kind, v_enabled
  from public.pearl_milestone_catalog catalog
  where catalog.milestone_id = v_catalog_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_milestone');
  end if;
  if not v_enabled or v_evidence_kind = 'server_evidence_unavailable' then
    return jsonb_build_object('ok', false, 'error', 'server_evidence_unavailable');
  end if;

  -- Serialize claims for this user. The unique claim remains the final guard
  -- against concurrent tabs and transactions.
  v_row := public.economy_ensure_row(v_uid);

  if v_evidence_kind = 'verified_streak' then
    with recursive active_days(day) as (
      select distinct (timezone('utc', completion.completed_at))::date
      from public.referral_verified_lesson_completions completion
      where completion.user_id = v_uid
    ), latest(day) as (
      select max(active_days.day) from active_days
    ), streak_days(day) as (
      select latest.day
      from latest
      where latest.day >= (timezone('utc', now()))::date - 1
      union all
      select (streak_days.day - 1)::date
      from streak_days
      where exists (
        select 1 from active_days where active_days.day = streak_days.day - 1
      )
    )
    select count(*)::integer into v_verified_metric from streak_days;
  elsif v_evidence_kind = 'verified_phase' then
    v_phase_id := split_part(v_id, ':', 2);
    select phase.lesson_ids into v_phase_lessons
    from public.pearl_journey_phase_catalog phase
    where phase.phase_id = v_phase_id;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'unknown_phase');
    end if;

    select count(*)::integer into v_verified_metric
    from unnest(v_phase_lessons) as expected(lesson_id)
    where exists (
      select 1
      from public.referral_verified_lesson_completions completion
      where completion.user_id = v_uid
        and completion.lesson_id = expected.lesson_id
    );
    v_threshold := cardinality(v_phase_lessons);
  elsif v_evidence_kind = 'verified_monthly_missions' then
    v_month_start := date_trunc('month', timezone('utc', now())) at time zone 'utc';
    select count(*)::integer into v_verified_metric
    from public.user_missions mission
    where mission.user_id = v_uid
      and mission.scope = 'daily'
      and mission.claimed
      and mission.period_key like to_char(v_month_start, 'YYYY-MM') || '%'
      and mission.claimed_at >= v_month_start
      and mission.claimed_at < v_month_start + interval '1 month';
  else
    return jsonb_build_object('ok', false, 'error', 'server_evidence_unavailable');
  end if;

  if v_verified_metric < v_threshold then
    return jsonb_build_object(
      'ok', false,
      'error', 'milestone_incomplete',
      'verified_metric', v_verified_metric,
      'goal', v_threshold,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  insert into public.pearl_milestone_claims (user_id, milestone_id, amount)
  values (v_uid, v_id, v_amount)
  on conflict (user_id, milestone_id) do nothing
  returning claimed_at into v_claimed_at;

  -- Credit only the transaction that inserted the unique claim row.
  if not found then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  v_key := left('pearl-milestone:' || v_id, 128);

  v_entry := jsonb_build_object(
    'id', v_key,
    'direction', 'earned',
    'source', v_id,
    'amount', v_amount,
    'timestamp', (extract(epoch from now()) * 1000)::bigint,
    'milestoneId', v_id
  );
  v_ledger := coalesce(v_row.pearl_ledger, '[]'::jsonb) || jsonb_build_array(v_entry);
  if jsonb_array_length(v_ledger) > 200 then
    v_ledger := (
      select coalesce(jsonb_agg(e.elem), '[]'::jsonb)
      from (
        select elem
        from jsonb_array_elements(v_ledger) with ordinality as t(elem, ord)
        order by ord desc
        limit 200
      ) e
    );
  end if;
  update public.user_economy
  set
    dragon_pearls = dragon_pearls + v_amount,
    pearl_ledger = v_ledger,
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'claim_pearl_milestone', v_amount, 'pearl', v_id, v_key,
    jsonb_build_object(
      'milestone_id', v_id,
      'evidence_kind', v_evidence_kind,
      'verified_metric', v_verified_metric,
      'goal', v_threshold,
      'client_evidence_accepted', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'amount', v_amount,
    'economy', public.economy_row_to_json(v_row)
  );
end;
$$;

-- ─── get_server_entitlement: inclui pearl_pro_expires_at ─────────────────────
create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_pro boolean := false;
  v_source text := 'none';
  v_pearl_expires timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none', 'pearl_pro_expires_at', null);
  end if;

  select e.pearl_pro_expires_at into v_pearl_expires
  from public.user_economy e
  where e.user_id = v_uid;

  if public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'stripe';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'grant';
  elsif v_pearl_expires is not null and v_pearl_expires > now() then
    v_is_pro := true;
    v_source := 'pearl_pass';
  end if;

  return jsonb_build_object(
    'ok', true,
    'is_pro', v_is_pro,
    'source', v_source,
    'pearl_pro_expires_at', v_pearl_expires
  );
end;
$$;

revoke all on function public.activate_pearl_pro_pass(text) from public;
revoke all on function public.claim_pearl_milestone(text) from public;
revoke all on function public.get_server_entitlement() from public;
revoke all on function public.economy_row_to_json(public.user_economy) from public, anon, authenticated;

grant execute on function public.activate_pearl_pro_pass(text) to authenticated;
grant execute on function public.claim_pearl_milestone(text) to authenticated;
grant execute on function public.get_server_entitlement() to authenticated;

commit;


-- 20260814010000_mastery_pass_telemetry.sql
-- PED-095 — telemetria de mastery pass (mastery_pass_started / mastery_pass_completed).
-- Mesmo padrão de 20260812180000_production_help_telemetry.sql: amplia a
-- whitelist de metadados e o allowlist de tipos de evento do RPC de ingestão.

create or replace function public.sanitize_pedagogy_metadata(
  p_event_type text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_text text;
  v_num numeric;
begin
  if jsonb_typeof(v_in) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  v_allowed := case p_event_type
    when 'lesson_started' then array['appVersion']
    when 'lesson_completed' then array[
      'appVersion', 'stars', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays',
      'folegoSkips', 'stepIndex', 'mistakes'
    ]
    when 'lesson_abandoned' then array[
      'appVersion', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays', 'stepIndex'
    ]
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'unrecognized', 'answerNormHash', 'answerLen', 'hasCjk',
      'helpLevel', 'helpRequests', 'initialHelpLevel', 'productionAssist'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'helpLevel', 'helpRequests', 'initialHelpLevel', 'productionAssist'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage', 'via']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'post_conversation_shown' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount'
    ]
    when 'post_conversation_completed' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount', 'correct'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
    ]
    when 'unrecognized_answer' then array[
      'appVersion', 'answerNormHash', 'answerLen', 'expectedLen', 'hasCjk'
    ]
    when 'production_help_requested' then array[
      'appVersion', 'helpLevel', 'previousHelpLevel', 'initialHelpLevel', 'unlockedMax',
      'productionAssist', 'frameId', 'firstOfStructure'
    ]
    when 'mastery_pass_started' then array['appVersion', 'pass']
    when 'mastery_pass_completed' then array['appVersion', 'pass', 'durationMs']
    else array['appVersion']
  end;

  for v_key, v_val in select key, value from jsonb_each(v_in)
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if jsonb_typeof(v_val) = 'string' then
      v_text := left(coalesce(v_val #>> '{}', ''), 80);
      v_out := v_out || jsonb_build_object(v_key, v_text);
    elsif jsonb_typeof(v_val) = 'number' then
      v_num := (v_val #>> '{}')::numeric;
      if v_num > 1e12 or v_num < -1e12 then
        continue;
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_num);
    elsif jsonb_typeof(v_val) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (v_val #>> '{}')::boolean);
    elsif jsonb_typeof(v_val) = 'null' then
      continue;
    else
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_trusted_bucket text;
  v_session_id uuid;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_type_minute_limit integer;
  v_type_day_limit integer;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_uid is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_trusted_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  else
    select coalesce(profiles.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles as profiles
    where profiles.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'post_conversation_shown',
    'post_conversation_completed',
    'image_exercise_answered',
    'lesson_abandoned',
    'unrecognized_answer',
    'production_help_requested',
    'mastery_pass_started',
    'mastery_pass_completed'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := case
    when v_uid is null then v_trusted_bucket
    else public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest)
  end;

  if v_dedupe is not null then
    select events.id into v_id
    from public.beta_pedagogy_events as events
    where events.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and events.user_id = v_uid)
        or (v_uid is null and events.anon_session_id = v_session_id)
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_minute', 60, 60, 600
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_day', 86400, 1000, 100000
    );

    v_type_minute_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 15
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 30
      when v_type = 'unrecognized_answer' then 30
      when v_type = 'production_help_requested' then 40
      when v_type in ('mastery_pass_started', 'mastery_pass_completed') then 15
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 600
      when v_type = 'unrecognized_answer' then 400
      when v_type = 'production_help_requested' then 500
      when v_type in ('mastery_pass_started', 'mastery_pass_completed') then 250
      else 1000
    end;

    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_minute:' || v_type,
      60,
      v_type_minute_limit,
      v_type_minute_limit * 1000
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_day:' || v_type,
      86400,
      v_type_day_limit,
      v_type_day_limit * 1000
    );
  else
    if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
      raise exception 'rate_limited';
    end if;

    if public.beta_pedagogy_event_type_rate_limited(
      v_uid, v_local, v_digest, v_type, v_lesson, v_scene
    ) then
      raise exception 'event_rate_limited';
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key,
    anon_session_id
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket,
    case when v_uid is null then v_session_id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Ingere evento pedagógico do beta. Inclui mastery_pass_started/mastery_pass_completed (PED-095).';

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;


-- 20260828013000_api_role_table_grants.sql
-- Align local/ephemeral Data API grants with hosted Supabase defaults.
begin;

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.user_progress to anon, authenticated, service_role;
grant all on table public.user_srs to anon, authenticated, service_role;
grant all on table public.subscriptions to anon, authenticated, service_role;
grant all on table public.transactions to anon, authenticated, service_role;

do $$
begin
  if to_regclass('public.placement_attempts') is not null then
    execute 'grant all on table public.placement_attempts to anon, authenticated, service_role';
  end if;
end $$;

revoke insert, update, delete on table public.user_economy from authenticated;
revoke insert, update, delete on table public.user_chests from authenticated;
revoke insert, update, delete on table public.user_missions from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
revoke insert, update, delete on table public.economy_ledger from authenticated;

grant select on table public.user_economy to authenticated;
grant select on table public.user_chests to authenticated;
grant select on table public.user_missions to authenticated;
grant select on table public.user_achievements to authenticated;
grant select on table public.economy_ledger to authenticated;

commit;
