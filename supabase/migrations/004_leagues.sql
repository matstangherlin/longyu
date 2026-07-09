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
