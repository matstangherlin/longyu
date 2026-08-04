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
