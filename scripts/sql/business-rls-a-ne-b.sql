-- Smoke RLS Business A ≠ B (impersonação JWT via set_config).
-- Pré-requisito: migrations 20260825043000 + 20260825062000 aplicadas.
-- Rode no SQL Editor do Supabase (role com acesso a auth.users) ou via MCP execute_sql.
-- Não deixa usuários/orgs residuais.

do $$
declare
  id_owner_a uuid := gen_random_uuid();
  id_learner_a uuid := gen_random_uuid();
  id_learner_b uuid := gen_random_uuid();
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  seen int;
  member_flag boolean;
  entitlement jsonb;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    (
      id_owner_a, 'authenticated', 'authenticated',
      'biz-owner-a-' || id_owner_a::text || '@longyu.test',
      crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Owner A"}'::jsonb, now(), now()
    ),
    (
      id_learner_a, 'authenticated', 'authenticated',
      'biz-learner-a-' || id_learner_a::text || '@longyu.test',
      crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Learner A"}'::jsonb, now(), now()
    ),
    (
      id_learner_b, 'authenticated', 'authenticated',
      'biz-learner-b-' || id_learner_b::text || '@longyu.test',
      crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Learner B"}'::jsonb, now(), now()
    );

  insert into public.profiles (id, name)
  values
    (id_owner_a, 'Owner A'),
    (id_learner_a, 'Learner A'),
    (id_learner_b, 'Learner B')
  on conflict (id) do update set name = excluded.name;

  insert into public.organizations (id, name, slug, plan, status, billing_mode)
  values
    (org_a, 'Org A Longyu', 'org-a-' || replace(org_a::text, '-', ''), 'business', 'active', 'pilot_grant'),
    (org_b, 'Org B Longyu', 'org-b-' || replace(org_b::text, '-', ''), 'business', 'active', 'pilot_grant');

  insert into public.organization_members (organization_id, user_id, role, seat_status, joined_at)
  values
    (org_a, id_owner_a, 'owner', 'active', now()),
    (org_a, id_learner_a, 'learner', 'active', now()),
    (org_b, id_learner_b, 'learner', 'active', now());

  insert into public.organization_entitlement_grants (
    organization_id, access_source, seat_limit, status, expires_at
  )
  values
    (org_a, 'pilot', 25, 'active', now() + interval '30 days'),
    (org_b, 'pilot', 10, 'active', now() + interval '30 days');

  insert into public.organization_invites (
    organization_id, email, role, token_hash, status, expires_at, invited_by
  )
  values (
    org_a,
    'pending@org-a.test',
    'learner',
    'token_a_' || org_a::text,
    'pending',
    now() + interval '7 days',
    id_owner_a
  );

  -- Learner A: vê org A e peers; não vê org B; não vê invites (só admin).
  perform set_config('request.jwt.claim.sub', id_learner_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  execute 'select count(*) from public.organizations where id = $1' into seen using org_a;
  if seen <> 1 then raise exception 'FAIL: learner A não vê org A (% rows)', seen; end if;

  execute 'select count(*) from public.organizations where id = $1' into seen using org_b;
  if seen <> 0 then raise exception 'FAIL: learner A leu org B (% rows)', seen; end if;

  execute 'select count(*) from public.organization_members where organization_id = $1' into seen using org_a;
  if seen < 2 then raise exception 'FAIL: learner A não vê peers em A (% rows)', seen; end if;

  execute 'select count(*) from public.organization_members where organization_id = $1' into seen using org_b;
  if seen <> 0 then raise exception 'FAIL: learner A leu members de B (% rows)', seen; end if;

  execute 'select count(*) from public.organization_invites where organization_id = $1' into seen using org_a;
  if seen <> 0 then raise exception 'FAIL: learner A leu invites de A (% rows)', seen; end if;

  -- Zero recursion: is_organization_member sob RLS.
  execute 'select public.is_organization_member($1)' into member_flag using org_a;
  if member_flag is distinct from true then
    raise exception 'FAIL: is_organization_member(org_a)=%', member_flag;
  end if;

  reset role;

  -- Owner A vê invites.
  perform set_config('request.jwt.claim.sub', id_owner_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  execute 'select count(*) from public.organization_invites where organization_id = $1' into seen using org_a;
  if seen <> 1 then raise exception 'FAIL: owner A não vê invites (% rows)', seen; end if;

  execute 'select count(*) from public.organization_invites where organization_id = $1' into seen using org_b;
  if seen <> 0 then raise exception 'FAIL: owner A leu invites de B (% rows)', seen; end if;

  reset role;

  -- Entitlement: membership + grant => premium; membership sem grant/assinatura => free.
  delete from public.organization_entitlement_grants where organization_id = org_a;

  perform set_config('request.jwt.claim.sub', id_learner_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select public.get_server_entitlement() into entitlement;
  if coalesce((entitlement ->> 'is_pro')::boolean, false) then
    raise exception 'FAIL: membership sem grant/assinatura concedeu is_pro=%', entitlement;
  end if;

  reset role;

  -- Restaura grant e confirma premium.
  insert into public.organization_entitlement_grants (
    organization_id, access_source, seat_limit, status, expires_at
  )
  values (org_a, 'pilot', 25, 'active', now() + interval '30 days');

  perform set_config('request.jwt.claim.sub', id_learner_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select public.get_server_entitlement() into entitlement;
  if not coalesce((entitlement ->> 'is_pro')::boolean, false) then
    raise exception 'FAIL: grant ativo não concedeu is_pro=%', entitlement;
  end if;
  if (entitlement ->> 'tier') is distinct from 'business' then
    raise exception 'FAIL: tier esperado business, veio %', entitlement ->> 'tier';
  end if;
  if (entitlement ->> 'source') is distinct from 'organization' then
    raise exception 'FAIL: source esperado organization, veio %', entitlement ->> 'source';
  end if;

  reset role;

  -- Assentos: active <= entitlement.
  if not public.organization_seats_within_entitlement(org_a) then
    raise exception 'FAIL: seats_within_entitlement deveria ser true para org A';
  end if;

  -- Cleanup
  delete from public.organization_invites where organization_id in (org_a, org_b);
  delete from public.organization_entitlement_grants where organization_id in (org_a, org_b);
  delete from public.organization_members where organization_id in (org_a, org_b);
  delete from public.organizations where id in (org_a, org_b);
  delete from public.profiles where id in (id_owner_a, id_learner_a, id_learner_b);
  delete from auth.users where id in (id_owner_a, id_learner_a, id_learner_b);

  raise notice 'OK: business-rls-a-ne-b — isolamento + entitlement explícito + sem recursion.';
end $$;
