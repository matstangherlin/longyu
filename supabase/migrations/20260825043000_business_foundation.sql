-- V4.4 — Longyu for Business foundation.
-- Organizations, invites, organization_subscriptions (isolada de subscriptions)
-- e captura de leads. Não altera public.subscriptions (pessoa física).

begin;

-- ─── organizations ──────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  country text,
  company_domain text,
  plan text not null default 'business'
    check (plan in ('business', 'enterprise')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'churned')),
  billing_mode text not null default 'none'
    check (billing_mode in ('none', 'subscription', 'pilot_grant', 'contract')),
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Empresa/equipe Longyu for Business. Sem UI administrativa nesta versão.';

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'learner')),
  seat_status text not null default 'invited'
    check (seat_status in ('invited', 'active', 'suspended', 'removed')),
  department text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_active_idx
  on public.organization_members (user_id)
  where seat_status = 'active';

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254),
  role text not null check (role in ('owner', 'admin', 'manager', 'learner')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists organization_invites_pending_email_idx
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

-- Assinatura da empresa. Isolada de public.subscriptions (aluno individual).
create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  seat_limit integer not null default 0 check (seat_limit >= 0),
  billing_email text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_subscriptions is
  'Assinatura corporativa. seat_limit aqui é a fonte canônica de licenças. Não misturar com public.subscriptions.';

comment on table public.subscriptions is
  'Assinatura individual (pessoa física / Longyu Pro). Seats Business não entram aqui.';

-- Grants / piloto explícito (V4.4.1). Membership sem isto ou sem assinatura NÃO dá premium.
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

-- ─── business_leads ─────────────────────────────────────────────────────────
create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 160),
  work_email text not null check (char_length(work_email) between 5 and 254),
  company text not null check (char_length(trim(company)) between 2 and 160),
  job_title text not null check (char_length(trim(job_title)) between 2 and 120),
  employee_count_range text not null
    check (employee_count_range in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  country text not null check (char_length(trim(country)) between 2 and 80),
  goal text not null
    check (goal in (
      'work_with_chinese_teams',
      'travel_to_china',
      'relocation',
      'industry_operations',
      'export_import',
      'custom'
    )),
  start_window text
    check (
      start_window is null
      or start_window in ('asap', 'this_quarter', 'this_year', 'exploring')
    ),
  message text check (message is null or char_length(message) <= 4000),
  source_cta text check (source_cta is null or char_length(source_cta) <= 64),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'pilot', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_leads_created_idx
  on public.business_leads (created_at desc);

create table if not exists public.business_lead_rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists business_lead_rate_events_bucket_created_idx
  on public.business_lead_rate_events (bucket, created_at desc);

create table if not exists public.business_funnel_events (
  id bigserial primary key,
  event_name text not null
    check (event_name in (
      'business_page_view',
      'business_cta_clicked',
      'business_lead_started',
      'business_lead_submitted'
    )),
  cta_id text check (cta_id is null or char_length(cta_id) <= 64),
  created_at timestamptz not null default now()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.organization_entitlement_grants enable row level security;
alter table public.business_leads enable row level security;
alter table public.business_lead_rate_events enable row level security;
alter table public.business_funnel_events enable row level security;

revoke all on table public.business_leads from public, anon, authenticated;
revoke all on table public.business_lead_rate_events from public, anon, authenticated;
revoke all on table public.business_funnel_events from public, anon, authenticated;

revoke all on table public.organizations from public, anon;
revoke all on table public.organization_members from public, anon;
revoke all on table public.organization_invites from public, anon;
revoke all on table public.organization_subscriptions from public, anon;
revoke all on table public.organization_entitlement_grants from public, anon;

grant select on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;
grant select on table public.organization_invites to authenticated;
grant select on table public.organization_subscriptions to authenticated;
grant select on table public.organization_entitlement_grants to authenticated;

revoke insert, update, delete on table public.organizations from anon, authenticated;
revoke insert, update, delete on table public.organization_members from anon, authenticated;
revoke insert, update, delete on table public.organization_invites from anon, authenticated;
revoke insert, update, delete on table public.organization_subscriptions from anon, authenticated;
revoke insert, update, delete on table public.organization_entitlement_grants from anon, authenticated;

-- Helpers SECURITY DEFINER: policies NÃO fazem SELECT em organization_members sob RLS.
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

drop policy if exists organization_entitlement_grants_select_admin
  on public.organization_entitlement_grants;
create policy organization_entitlement_grants_select_admin
  on public.organization_entitlement_grants
  for select
  to authenticated
  using (public.is_organization_admin(organization_id));

-- Sem policies em business_leads / rate / funnel: só service_role (bypass RLS).

-- ─── entitlement helpers ────────────────────────────────────────────────────
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

-- ─── rate limit de leads (só service_role / Edge) ───────────────────────────
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

revoke all on function public.check_and_record_business_lead_rate(text, text) from public, anon, authenticated;
grant execute on function public.check_and_record_business_lead_rate(text, text) to service_role;

comment on function public.check_and_record_business_lead_rate(text, text) is
  'Rate limit atômico de lead Business (advisory lock). IP 3/15m + 8/24h; email 2/24h; combo 1/15m.';

comment on function public.get_server_entitlement() is
  'Entitlement: is_pro + tier + source. Org só com assinatura ativa/trialing OU grant explícito.';

commit;
