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
