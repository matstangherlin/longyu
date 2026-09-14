-- Smoke da reserva de assento Business, após 20260914180000_business_seat_integrity.sql.
--
-- Roda em transação e dá rollback. Exige Postgres real: o ponto todo é que a
-- integridade de licença mora no servidor, não na aplicação.
--
-- A corrida do último assento não cabe aqui — uma transação não disputa
-- consigo mesma. Ela precisa de duas sessões simultâneas; o procedimento e o
-- resultado medido estão no relatório da V4.10A.1.

begin;

do $$
declare
  v_org uuid;
  v_u uuid;
  v_reserved integer;
begin
  insert into public.organizations (name, slug, status, plan)
    values ('Smoke Co', 'smoke-co-' || substr(gen_random_uuid()::text, 1, 8), 'active', 'business')
    returning id into v_org;
  insert into public.organization_subscriptions (organization_id, status, seat_limit)
    values (v_org, 'active', 3);

  -- Dois membros ativos: um assento livre de três.
  for i in 1..2 loop
    insert into auth.users (id) values (gen_random_uuid()) returning id into v_u;
    insert into public.profiles (id, name) values (v_u, 'Smoke ' || i) on conflict do nothing;
    insert into public.organization_members (organization_id, user_id, role, seat_status, joined_at)
      values (v_org, v_u, 'learner', 'active', now());
  end loop;

  if public.organization_reserved_seat_count(v_org) <> 2 then
    raise exception 'esperado 2 reservados, obtido %', public.organization_reserved_seat_count(v_org);
  end if;

  -- Convite pendente válido reserva o terceiro.
  insert into public.organization_invites (organization_id, email, role, token_hash, expires_at)
    values (v_org, 'convidado@smoke.co', 'learner', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days');

  select public.organization_reserved_seat_count(v_org) into v_reserved;
  if v_reserved <> 3 then
    raise exception 'convite pendente precisa reservar; obtido %', v_reserved;
  end if;

  -- E o quarto é recusado pelo servidor.
  begin
    insert into public.organization_invites (organization_id, email, role, token_hash, expires_at)
      values (v_org, 'extra@smoke.co', 'learner', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days');
    raise exception 'convite alem da licenca foi aceito: o limite do servidor nao esta valendo';
  exception when check_violation then
    null;
  end;

  -- Expirado não reserva.
  update public.organization_invites set expires_at = now() - interval '1 day'
    where organization_id = v_org and email = 'convidado@smoke.co';
  if public.organization_reserved_seat_count(v_org) <> 2 then
    raise exception 'convite expirado nao pode reservar';
  end if;

  -- Revogado também não.
  update public.organization_invites
    set expires_at = now() + interval '7 days', status = 'revoked'
    where organization_id = v_org and email = 'convidado@smoke.co';
  if public.organization_reserved_seat_count(v_org) <> 2 then
    raise exception 'convite revogado nao pode reservar';
  end if;

  -- Aceitar não consome dois assentos: o convite sai de 'pending' e o membro entra.
  update public.organization_invites set status = 'pending'
    where organization_id = v_org and email = 'convidado@smoke.co';
  update public.organization_invites set status = 'accepted'
    where organization_id = v_org and email = 'convidado@smoke.co';
  insert into auth.users (id) values (gen_random_uuid()) returning id into v_u;
  insert into public.profiles (id, name) values (v_u, 'Aceito') on conflict do nothing;
  insert into public.organization_members (organization_id, user_id, role, seat_status, joined_at)
    values (v_org, v_u, 'learner', 'active', now());

  select public.organization_reserved_seat_count(v_org) into v_reserved;
  if v_reserved <> 3 then
    raise exception 'aceite nao pode consumir dois assentos; obtido %', v_reserved;
  end if;

  raise notice 'OK 015_business_seat_integrity: pendente reserva, expirado e revogado liberam, aceite nao duplica.';
end $$;

rollback;
