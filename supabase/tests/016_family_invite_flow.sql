-- Smoke do fluxo de convite Family, após 20260914200000_family_invite_flow.sql.
--
-- Roda em transação e dá rollback. Exige Postgres real com um stub de
-- auth.uid() que leia longyu.test_uid — o ponto do teste é justamente o que a
-- função enxerga como usuário corrente.
--
-- O que ele prova, em ordem: o token nasce no servidor e o banco guarda só o
-- hash; o email é normalizado; convite duplicado, email inválido e quem não é
-- dono são recusados; o token é de uso único; o aceite não consome dois
-- lugares; o dono vê a família inteira e o membro vê só a si mesmo; o limite
-- de seis continua sendo do trigger.

begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_fam uuid;
  v_res jsonb;
  v_token text;
  v_invite uuid;
  v_overview jsonb;
  v_extra uuid;
begin
  insert into auth.users (id) values (v_owner), (v_guest), (v_stranger);
  insert into public.profiles (id, name)
    values (v_owner, 'Dona'), (v_guest, 'Convidada'), (v_stranger, 'Estranho')
    on conflict do nothing;
  insert into public.family_accounts (owner_user_id, status) values (v_owner, 'active') returning id into v_fam;
  insert into public.family_memberships (family_id, user_id, role, status, joined_at)
    values (v_fam, v_owner, 'owner', 'active', now());

  perform set_config('longyu.test_uid', v_owner::text, true);
  v_res := public.create_family_invite('Convidada@Exemplo.com ');
  v_token := v_res->>'token';
  v_invite := (v_res->>'invite_id')::uuid;

  if char_length(v_token) < 32 then
    raise exception 'token curto demais: % chars', char_length(v_token);
  end if;
  if exists (select 1 from public.family_invites where token_hash = v_token) then
    raise exception 'token em claro no banco';
  end if;
  if not exists (
    select 1 from public.family_invites
    where id = v_invite and token_hash = encode(sha256(v_token::bytea), 'hex')
  ) then
    raise exception 'hash do token nao confere';
  end if;
  if (select email from public.family_invites where id = v_invite) <> 'convidada@exemplo.com' then
    raise exception 'email nao foi normalizado';
  end if;
  if public.family_seats_used(v_fam) <> 2 then
    raise exception 'convite pendente precisa ocupar lugar; obtido %', public.family_seats_used(v_fam);
  end if;

  begin
    perform public.create_family_invite('convidada@exemplo.com');
    raise exception 'convite duplicado foi aceito';
  exception when unique_violation then null;
  end;

  begin
    perform public.create_family_invite('sem-arroba');
    raise exception 'email invalido foi aceito';
  exception when check_violation then null;
  end;

  perform set_config('longyu.test_uid', v_stranger::text, true);
  begin
    perform public.create_family_invite('outro@exemplo.com');
    raise exception 'quem nao e dono criou convite';
  exception when no_data_found then null;
  end;

  perform set_config('longyu.test_uid', v_guest::text, true);
  begin
    perform public.accept_family_invite('token_chutado');
    raise exception 'token chutado foi aceito';
  exception when no_data_found then null;
  end;

  perform public.accept_family_invite(v_token);
  if public.family_seats_used(v_fam) <> 2 then
    raise exception 'aceite consumiu dois lugares; obtido %', public.family_seats_used(v_fam);
  end if;

  begin
    perform public.accept_family_invite(v_token);
    raise exception 'token reutilizado foi aceito';
  exception when no_data_found then null;
  end;

  v_overview := public.get_family_overview();
  if jsonb_array_length(v_overview->'members') <> 1 or (v_overview->'family'->>'is_owner')::boolean then
    raise exception 'membro enxergou a familia inteira';
  end if;

  perform set_config('longyu.test_uid', v_owner::text, true);
  v_overview := public.get_family_overview();
  if jsonb_array_length(v_overview->'members') <> 2 then
    raise exception 'dono nao enxerga os dois membros';
  end if;

  -- O limite continua sendo do servidor: com a familia cheia, o convite cai.
  for i in 1..4 loop
    insert into auth.users (id) values (gen_random_uuid()) returning id into v_extra;
    insert into public.family_memberships (family_id, user_id, role, status, joined_at)
      values (v_fam, v_extra, 'member', 'active', now());
  end loop;
  if public.family_seats_used(v_fam) <> 6 then
    raise exception 'esperado 6 lugares ocupados; obtido %', public.family_seats_used(v_fam);
  end if;
  begin
    perform public.create_family_invite('setimo@exemplo.com');
    raise exception 'setimo lugar foi aceito';
  exception when check_violation then null;
  end;

  begin
    perform public.remove_family_member(v_owner);
    raise exception 'dono conseguiu se remover';
  exception when check_violation then null;
  end;

  if not public.remove_family_member(v_guest) then
    raise exception 'dono nao conseguiu remover membro';
  end if;
  if public.family_seats_used(v_fam) <> 5 then
    raise exception 'remocao nao liberou lugar; obtido %', public.family_seats_used(v_fam);
  end if;

  raise notice 'OK 016_family_invite_flow: token so em hash, uso unico, aceite nao duplica lugar, limite do servidor de pe.';
end $$;

rollback;
