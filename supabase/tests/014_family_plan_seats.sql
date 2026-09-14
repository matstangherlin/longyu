-- Smoke do plano Family, após 20260914120000_family_plan_foundation.sql.
--
-- Roda em transação e não deixa nada para trás. Diferente dos gates estáticos,
-- este arquivo exige um Postgres de verdade — é o único jeito de provar a
-- propriedade que mais importa: duas transações disputando o último assento.
--
-- Como rodar (Postgres 16 local, com auth.users e auth.uid() disponíveis):
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/014_family_plan_seats.sql
--
-- A corrida do último assento não está aqui: uma transação só não consegue
-- disputar consigo mesma. Ela precisa de duas sessões simultâneas — veja o
-- procedimento no relatório da V4.10A.

begin;

do $$
declare
  v_owner uuid;
  v_fam uuid;
  v_u uuid;
  v_seats integer;
begin
  insert into auth.users (id) values (gen_random_uuid()) returning id into v_owner;
  insert into public.family_accounts (owner_user_id) values (v_owner) returning id into v_fam;
  insert into public.family_memberships (family_id, user_id, role, status, joined_at)
    values (v_fam, v_owner, 'owner', 'active', now());

  -- Dono + cinco convidados = seis contas.
  for i in 1..5 loop
    insert into auth.users (id) values (gen_random_uuid()) returning id into v_u;
    insert into public.family_memberships (family_id, user_id, role, status, joined_at)
      values (v_fam, v_u, 'member', 'active', now());
  end loop;

  select public.family_seats_used(v_fam) into v_seats;
  if v_seats <> 6 then
    raise exception 'esperado 6 lugares ocupados, obtido %', v_seats;
  end if;

  -- Sétima conta é recusada pelo servidor, não pela aplicação.
  insert into auth.users (id) values (gen_random_uuid()) returning id into v_u;
  begin
    insert into public.family_memberships (family_id, user_id, role, status, joined_at)
      values (v_fam, v_u, 'member', 'active', now());
    raise exception 'setima conta foi aceita: o limite do servidor nao esta valendo';
  exception when check_violation then
    null;
  end;

  -- Remover devolve o lugar; o convite pendente volta a ocupá-lo.
  update public.family_memberships
    set status = 'removed'
    where family_id = v_fam
      and user_id = (
        select user_id from public.family_memberships
        where family_id = v_fam and role = 'member' and status = 'active' limit 1
      );

  insert into public.family_invites (family_id, email, token_hash, expires_at, invited_by)
    values (v_fam, 'convidado@exemplo.com', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days', v_owner);

  select public.family_seats_used(v_fam) into v_seats;
  if v_seats <> 6 then
    raise exception 'convite pendente precisa reservar lugar; obtido %', v_seats;
  end if;

  -- Revogar devolve o lugar.
  update public.family_invites set status = 'revoked' where family_id = v_fam;
  select public.family_seats_used(v_fam) into v_seats;
  if v_seats <> 5 then
    raise exception 'convite revogado precisa liberar lugar; obtido %', v_seats;
  end if;

  -- Uma família tem exatamente um dono ativo.
  insert into auth.users (id) values (gen_random_uuid()) returning id into v_u;
  begin
    insert into public.family_memberships (family_id, user_id, role, status, joined_at)
      values (v_fam, v_u, 'owner', 'active', now());
    raise exception 'segundo dono ativo foi aceito';
  exception when unique_violation then
    null;
  end;

  raise notice 'OK 014_family_plan_seats: seis lugares, convite reserva e devolve, dono unico.';
end $$;

rollback;
