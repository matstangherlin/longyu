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
