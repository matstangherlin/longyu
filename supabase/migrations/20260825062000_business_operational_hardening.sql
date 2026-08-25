-- V4.4.1 — Business operational hardening.
-- Corrige RLS recursiva, entitlement implícito, seats ambíguos e rate limit
-- não atômico. Idempotente sobre 20260825043000_business_foundation.
-- NÃO aplicar em produção antes de staging verde + scripts/sql/business-rls-a-ne-b.sql.

begin;

-- ─── helpers SECURITY DEFINER (evitam recursion em policies) ────────────────
create or replace function public.is_organization_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.seat_status = 'active'
  );
$$;

create or replace function public.is_organization_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.seat_status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_organization_member(uuid) from public, anon;
revoke all on function public.is_organization_admin(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;

comment on function public.is_organization_member(uuid) is
  'Membership ativa sem SELECT sob RLS em organization_members (evita infinite recursion).';
comment on function public.is_organization_admin(uuid) is
  'Owner/admin ativo da organização; SECURITY DEFINER com search_path vazio.';

-- ─── policies sem auto-join recursivo ───────────────────────────────────────
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (public.is_organization_member(id));

drop policy if exists organization_members_select_peer on public.organization_members;
create policy organization_members_select_peer
  on public.organization_members
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists organization_invites_select_admin on public.organization_invites;
create policy organization_invites_select_admin
  on public.organization_invites
  for select
  to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists organization_subscriptions_select_member on public.organization_subscriptions;
create policy organization_subscriptions_select_member
  on public.organization_subscriptions
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

-- ─── seats: uma verdade canônica ────────────────────────────────────────────
-- organization_subscriptions.seat_limit = licenças compradas/contratadas.
-- organizations.seat_limit deixa de existir (era espelho ambíguo).
alter table public.organizations
  drop column if exists seat_limit;

comment on column public.organization_subscriptions.seat_limit is
  'Fonte canônica de licenças Business/Enterprise (compradas ou contratadas).';

-- ─── grants / piloto explícito ──────────────────────────────────────────────
create table if not exists public.organization_entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  access_source text not null
    check (access_source in ('pilot', 'internal', 'contract')),
  seat_limit integer not null default 0 check (seat_limit >= 0),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_entitlement_grants_org_active_idx
  on public.organization_entitlement_grants (organization_id)
  where status = 'active';

alter table public.organization_entitlement_grants enable row level security;
revoke all on table public.organization_entitlement_grants from public, anon;
grant select on table public.organization_entitlement_grants to authenticated;
revoke insert, update, delete on table public.organization_entitlement_grants from anon, authenticated;

drop policy if exists organization_entitlement_grants_select_admin
  on public.organization_entitlement_grants;
create policy organization_entitlement_grants_select_admin
  on public.organization_entitlement_grants
  for select
  to authenticated
  using (public.is_organization_admin(organization_id));

comment on table public.organization_entitlement_grants is
  'Acesso corporativo explícito (piloto/contrato/interno). Membership sem grant nem assinatura NÃO concede premium.';

alter table public.organizations
  add column if not exists billing_mode text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_billing_mode_check'
  ) then
    alter table public.organizations
      add constraint organizations_billing_mode_check
      check (billing_mode in ('none', 'subscription', 'pilot_grant', 'contract'));
  end if;
end $$;

comment on column public.organizations.billing_mode is
  'Modo comercial declarado: none | subscription | pilot_grant | contract. Não concede acesso sozinho.';

create or replace function public.organization_seat_entitlement(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.seat_limit
      from public.organization_subscriptions s
      where s.organization_id = p_org_id
        and (
          s.status in ('trialing', 'active')
          or (
            s.status = 'canceled'
            and s.current_period_end is not null
            and s.current_period_end > now()
          )
        )
    ),
    (
      select g.seat_limit
      from public.organization_entitlement_grants g
      where g.organization_id = p_org_id
        and g.status = 'active'
        and (g.expires_at is null or g.expires_at > now())
      order by g.created_at desc
      limit 1
    ),
    0
  );
$$;

revoke all on function public.organization_seat_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.organization_seat_entitlement(uuid) to service_role;

-- ─── entitlement: assinatura ativa OU grant ativo (nunca “sem cobrança”) ───
create or replace function public._user_organization_entitlement(p_user_id uuid)
returns table (
  organization_id uuid,
  organization_role text,
  tier text,
  access_source text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.organization_id,
    m.role,
    o.plan,
    case
      when exists (
        select 1
        from public.organization_subscriptions s
        where s.organization_id = o.id
          and (
            s.status in ('trialing', 'active')
            or (
              s.status = 'canceled'
              and s.current_period_end is not null
              and s.current_period_end > now()
            )
          )
      ) then 'organization_subscription'
      else 'organization_grant'
    end
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = p_user_id
    and m.seat_status = 'active'
    and o.status = 'active'
    and o.plan in ('business', 'enterprise')
    and (
      exists (
        select 1
        from public.organization_subscriptions s
        where s.organization_id = o.id
          and (
            s.status in ('trialing', 'active')
            or (
              s.status = 'canceled'
              and s.current_period_end is not null
              and s.current_period_end > now()
            )
          )
      )
      or exists (
        select 1
        from public.organization_entitlement_grants g
        where g.organization_id = o.id
          and g.status = 'active'
          and (g.expires_at is null or g.expires_at > now())
      )
    )
  order by case o.plan when 'enterprise' then 0 else 1 end, m.joined_at asc nulls last
  limit 1;
$$;

revoke all on function public._user_organization_entitlement(uuid) from public, anon, authenticated;

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
  v_tier text := 'free';
  v_org_id uuid;
  v_org_role text;
  v_org_access text;
  v_pearl_expires timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'is_pro', false,
      'tier', 'free',
      'source', 'none',
      'organization_id', null,
      'organization_role', null,
      'pearl_pro_expires_at', null
    );
  end if;

  select e.pearl_pro_expires_at into v_pearl_expires
  from public.user_economy e
  where e.user_id = v_uid;

  select org.organization_id, org.organization_role, org.tier, org.access_source
    into v_org_id, v_org_role, v_tier, v_org_access
  from public._user_organization_entitlement(v_uid) org;

  if v_org_id is not null then
    v_is_pro := true;
    v_source := 'organization';
  elsif public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'individual_subscription';
    v_tier := 'pro';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'internal';
    v_tier := 'pro';
  elsif v_pearl_expires is not null and v_pearl_expires > now() then
    v_is_pro := true;
    v_source := 'pearl';
    v_tier := 'pro';
  else
    v_tier := 'free';
  end if;

  return jsonb_build_object(
    'ok', true,
    'is_pro', v_is_pro,
    'tier', v_tier,
    'source', v_source,
    'organization_id', v_org_id,
    'organization_role', v_org_role,
    'organization_access_source', v_org_access,
    'pearl_pro_expires_at', v_pearl_expires
  );
end;
$$;

revoke all on function public.get_server_entitlement() from public, anon;
grant execute on function public.get_server_entitlement() to authenticated;

comment on function public.get_server_entitlement() is
  'Entitlement: is_pro + tier + source. Org só com assinatura ativa/trialing OU grant explícito.';

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._user_stripe_pro_active(p_user_id)
      or public.user_has_entitlement_grant(p_user_id)
      or exists (
        select 1 from public._user_organization_entitlement(p_user_id)
      );
$$;

revoke all on function public.economy_user_is_pro(uuid) from public, anon, authenticated;

-- Assentos ativos <= entitlement (validação de serviço; não UI).
create or replace function public.organization_active_seat_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.seat_status = 'active';
$$;

revoke all on function public.organization_active_seat_count(uuid) from public, anon, authenticated;
grant execute on function public.organization_active_seat_count(uuid) to service_role;

create or replace function public.organization_seats_within_entitlement(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.organization_active_seat_count(p_org_id)
      <= public.organization_seat_entitlement(p_org_id);
$$;

revoke all on function public.organization_seats_within_entitlement(uuid)
  from public, anon, authenticated;
grant execute on function public.organization_seats_within_entitlement(uuid) to service_role;

-- ─── rate limit atômico (advisory lock por bucket) ──────────────────────────
create or replace function public.check_and_record_business_lead_rate(
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
  email_24h int;
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

  -- Serializa concorrência por IP (e indiretamente o combo).
  perform pg_catalog.pg_advisory_xact_lock(
    hashtextextended('business_lead_rate:' || ip_bucket, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    hashtextextended('business_lead_rate:' || email_bucket, 0)
  );

  select count(*) into ip_15
  from public.business_lead_rate_events
  where bucket = ip_bucket and created_at > now() - interval '15 minutes';
  if ip_15 >= 3 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_15m');
  end if;

  select count(*) into ip_24h
  from public.business_lead_rate_events
  where bucket = ip_bucket and created_at > now() - interval '24 hours';
  if ip_24h >= 8 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_24h');
  end if;

  select count(*) into email_24h
  from public.business_lead_rate_events
  where bucket = email_bucket and created_at > now() - interval '24 hours';
  if email_24h >= 2 then
    return jsonb_build_object('allowed', false, 'reason', 'email_24h');
  end if;

  select count(*) into combo_15
  from public.business_lead_rate_events
  where bucket = combo_bucket and created_at > now() - interval '15 minutes';
  if combo_15 >= 1 then
    return jsonb_build_object('allowed', false, 'reason', 'combo_15m');
  end if;

  insert into public.business_lead_rate_events (bucket)
  values (ip_bucket), (email_bucket), (combo_bucket);

  delete from public.business_lead_rate_events
  where created_at < now() - interval '48 hours';

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_and_record_business_lead_rate(text, text)
  from public, anon, authenticated;
grant execute on function public.check_and_record_business_lead_rate(text, text) to service_role;

comment on function public.check_and_record_business_lead_rate(text, text) is
  'Rate limit atômico (advisory xact lock). IP 3/15m + 8/24h; email 2/24h; combo 1/15m.';

-- Funnel anti-abuse: IP 40 eventos / 15 min; page_view dedupe 1 / 30s.
create or replace function public.check_and_record_business_funnel_rate(
  p_ip_hash text,
  p_event_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_bucket text;
  view_bucket text;
  ip_15 int;
  view_30s int;
begin
  if p_ip_hash is null or length(trim(p_ip_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_ip');
  end if;
  if p_event_name is null
     or p_event_name not in (
       'business_page_view',
       'business_cta_clicked',
       'business_lead_started',
       'business_lead_submitted'
     )
  then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_event');
  end if;

  ip_bucket := 'funnel_ip:' || trim(p_ip_hash);
  view_bucket := 'funnel_view:' || trim(p_ip_hash);

  perform pg_catalog.pg_advisory_xact_lock(
    hashtextextended('business_funnel_rate:' || ip_bucket, 0)
  );

  select count(*) into ip_15
  from public.business_lead_rate_events
  where bucket = ip_bucket and created_at > now() - interval '15 minutes';
  if ip_15 >= 40 then
    return jsonb_build_object('allowed', false, 'reason', 'funnel_ip_15m');
  end if;

  if p_event_name = 'business_page_view' then
    select count(*) into view_30s
    from public.business_lead_rate_events
    where bucket = view_bucket and created_at > now() - interval '30 seconds';
    if view_30s >= 1 then
      return jsonb_build_object('allowed', false, 'reason', 'page_view_dedupe');
    end if;
    insert into public.business_lead_rate_events (bucket) values (view_bucket);
  end if;

  insert into public.business_lead_rate_events (bucket) values (ip_bucket);

  delete from public.business_lead_rate_events
  where created_at < now() - interval '48 hours';

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_and_record_business_funnel_rate(text, text)
  from public, anon, authenticated;
grant execute on function public.check_and_record_business_funnel_rate(text, text)
  to service_role;

comment on function public.check_and_record_business_funnel_rate(text, text) is
  'Anti-flood do funil Business: 40 eventos/IP/15m; page_view no máximo 1/30s.';

-- Retenção / LGPD (documentação operacional no banco).
comment on table public.business_leads is
  'Leads comerciais. Finalidade: contato de vendas. Acesso: service_role / operação. Sem PII em analytics. Ver docs/reports/business-operational-hardening.md.';

commit;
