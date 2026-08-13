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
  add column if not exists pearl_milestones_claimed jsonb not null default '{}'::jsonb,
  add column if not exists pearl_ledger jsonb not null default '[]'::jsonb,
  add column if not exists pearl_pro_expires_at timestamptz,
  add column if not exists pearl_pro_last_activated_at timestamptz,
  add column if not exists pearl_pro_auto_activate boolean not null default false;

-- ─── Snapshot JSON inclui pérolas ───────────────────────────────────────────
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
    'focus_pass_until', p_row.focus_pass_until,
    'pearl_milestones_claimed', coalesce(p_row.pearl_milestones_claimed, '{}'::jsonb),
    'pearl_ledger', coalesce(p_row.pearl_ledger, '[]'::jsonb),
    'pearl_pro_expires_at', p_row.pearl_pro_expires_at,
    'pearl_pro_last_activated_at', p_row.pearl_pro_last_activated_at,
    'pearl_pro_auto_activate', coalesce(p_row.pearl_pro_auto_activate, false)
  );
$$;

-- Whitelist de marcos (espelha src/data/economy.ts)
create or replace function public.pearl_milestone_amount(p_milestone_id text)
returns integer
language sql
immutable
as $$
  select case p_milestone_id
    when 'streak:7' then 1
    when 'streak:30' then 2
    when 'streak:60' then 2
    when 'streak:90' then 3
    when 'streak:180' then 4
    when 'streak:365' then 6
    when 'errors:25' then 1
    when 'errors:100' then 2
    when 'errors:250' then 3
    when 'hanzi:50' then 1
    when 'hanzi:100' then 2
    when 'hanzi:250' then 3
    when 'audio:100' then 1
    when 'audio:500' then 2
    when 'production:100' then 1
    when 'production:500' then 2
    else
      case
        when p_milestone_id like 'journey_phase:%' then 1
        when p_milestone_id like 'journey_major:%' then 2
        when p_milestone_id like 'monthly_challenge:%' then 1
        else null
      end
  end;
$$;

create or replace function public.pearl_milestone_threshold(p_milestone_id text)
returns integer
language sql
immutable
as $$
  select case p_milestone_id
    when 'streak:7' then 7
    when 'streak:30' then 30
    when 'streak:60' then 60
    when 'streak:90' then 90
    when 'streak:180' then 180
    when 'streak:365' then 365
    when 'errors:25' then 25
    when 'errors:100' then 100
    when 'errors:250' then 250
    when 'hanzi:50' then 50
    when 'hanzi:100' then 100
    when 'hanzi:250' then 250
    when 'audio:100' then 100
    when 'audio:500' then 500
    when 'production:100' then 100
    when 'production:500' then 500
    else
      case
        when p_milestone_id like 'journey_phase:%' then 1
        when p_milestone_id like 'journey_major:%' then 1
        when p_milestone_id like 'monthly_challenge:%' then 1
        else null
      end
  end;
$$;

create or replace function public.pearl_milestone_evidence_key(p_milestone_id text)
returns text
language sql
immutable
as $$
  select case
    when p_milestone_id like 'streak:%' then 'streak'
    when p_milestone_id like 'errors:%' then 'errors_corrected'
    when p_milestone_id like 'hanzi:%' then 'hanzi_learned'
    when p_milestone_id like 'audio:%' then 'audio_exposures'
    when p_milestone_id like 'production:%' then 'production'
    when p_milestone_id like 'journey_phase:%' then 'phase_mastered'
    when p_milestone_id like 'journey_major:%' then 'major_mastered'
    when p_milestone_id like 'monthly_challenge:%' then 'monthly_complete'
    else null
  end;
$$;

-- ─── RPC: activate_pearl_pro_pass ───────────────────────────────────────────
create or replace function public.activate_pearl_pro_pass(p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
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
      'is_pro', public.economy_user_is_pro(v_uid),
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
      'ok', false,
      'error', 'pass_active',
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
create or replace function public.claim_pearl_milestone(
  p_milestone_id text,
  p_idempotency_key text,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_id text := left(trim(coalesce(p_milestone_id, '')), 64);
  v_key text := left(trim(coalesce(p_idempotency_key, '')), 128);
  v_amount integer;
  v_threshold integer;
  v_ev_key text;
  v_ev_val integer;
  v_claimed jsonb;
  v_ledger jsonb;
  v_entry jsonb;
  v_phase_id text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_id = '' or v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_args');
  end if;

  v_amount := public.pearl_milestone_amount(v_id);
  v_threshold := public.pearl_milestone_threshold(v_id);
  v_ev_key := public.pearl_milestone_evidence_key(v_id);

  if v_amount is null or v_threshold is null or v_ev_key is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_milestone');
  end if;

  v_row := public.economy_ensure_row(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  v_claimed := coalesce(v_row.pearl_milestones_claimed, '{}'::jsonb);
  if v_claimed ? v_id then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row)
    );
  end if;

  -- Evidência: contadores numéricos ou flags booleanas
  if v_ev_key in ('phase_mastered', 'major_mastered', 'monthly_complete') then
    if coalesce((p_evidence ->> v_ev_key)::boolean, false) is not true
       and coalesce((p_evidence ->> 'value')::integer, 0) < v_threshold then
      -- journey_phase: também aceita phase_id batendo com o id
      if v_ev_key = 'phase_mastered' then
        v_phase_id := split_part(v_id, ':', 2);
        if coalesce(p_evidence ->> 'phase_id', '') <> v_phase_id
           or coalesce((p_evidence ->> 'phase_mastered')::boolean, false) is not true then
          return jsonb_build_object('ok', false, 'error', 'evidence_insufficient', 'economy', public.economy_row_to_json(v_row));
        end if;
      else
        return jsonb_build_object('ok', false, 'error', 'evidence_insufficient', 'economy', public.economy_row_to_json(v_row));
      end if;
    end if;
  else
    v_ev_val := coalesce((p_evidence ->> v_ev_key)::integer, coalesce((p_evidence ->> 'value')::integer, 0));
    if v_ev_val < v_threshold then
      return jsonb_build_object('ok', false, 'error', 'evidence_insufficient', 'economy', public.economy_row_to_json(v_row));
    end if;
  end if;

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
  v_claimed := v_claimed || jsonb_build_object(v_id, (extract(epoch from now()) * 1000)::bigint);

  update public.user_economy
  set
    dragon_pearls = dragon_pearls + v_amount,
    pearl_milestones_claimed = v_claimed,
    pearl_ledger = v_ledger,
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'claim_pearl_milestone', v_amount, 'pearl', v_id, v_key,
    jsonb_build_object('milestone_id', v_id, 'evidence', coalesce(p_evidence, '{}'::jsonb))
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
set search_path = public
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
revoke all on function public.claim_pearl_milestone(text, text, jsonb) from public;
revoke all on function public.get_server_entitlement() from public;

grant execute on function public.activate_pearl_pro_pass(text) to authenticated;
grant execute on function public.claim_pearl_milestone(text, text, jsonb) to authenticated;
grant execute on function public.get_server_entitlement() to authenticated;

commit;
