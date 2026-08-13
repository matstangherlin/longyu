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
