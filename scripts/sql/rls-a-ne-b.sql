-- Smoke RLS A ≠ B (impersonação JWT via set_config).
-- Rode no SQL Editor do Supabase (role com acesso a auth.users) ou via MCP execute_sql.
-- Não deixa usuários residuais: limpa e faz rollback em falha.

do $$
declare
  id_a uuid := gen_random_uuid();
  id_b uuid := gen_random_uuid();
  seen int;
  admin_flag boolean;
  apply_ok boolean := false;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    (
      id_a, 'authenticated', 'authenticated',
      'rls-a-' || id_a::text || '@longyu.test',
      crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"RLS A"}'::jsonb, now(), now()
    ),
    (
      id_b, 'authenticated', 'authenticated',
      'rls-b-' || id_b::text || '@longyu.test',
      crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"RLS B"}'::jsonb, now(), now()
    );

  insert into public.profiles (id, name)
  values (id_a, 'RLS A'), (id_b, 'RLS B')
  on conflict (id) do update set name = excluded.name;

  insert into public.user_progress (user_id, xp_total, streak, completed_lessons, updated_at)
  values (id_b, 1234, 7, array['secret-lesson-b'], now())
  on conflict (user_id) do update
    set xp_total = 1234, completed_lessons = array['secret-lesson-b'];

  insert into public.user_economy (user_id, qi, updated_at)
  values (id_b, 99, now())
  on conflict (user_id) do update set qi = 99;

  insert into public.subscriptions (
    user_id, stripe_subscription_id, status, current_period_end, updated_at
  )
  values (
    id_b, 'rls_test_' || replace(id_b::text, '-', ''),
    'active', now() + interval '1 day', now()
  )
  on conflict do nothing;

  perform set_config('request.jwt.claim.sub', id_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  execute 'select count(*) from public.user_progress where user_id = $1' into seen using id_b;
  if seen <> 0 then raise exception 'FAIL: A leu progresso de B (% rows)', seen; end if;

  execute 'select count(*) from public.user_economy where user_id = $1' into seen using id_b;
  if seen <> 0 then raise exception 'FAIL: A leu economia de B (% rows)', seen; end if;

  execute 'select count(*) from public.subscriptions where user_id = $1' into seen using id_b;
  if seen <> 0 then raise exception 'FAIL: A leu assinatura de B (% rows)', seen; end if;

  execute 'select count(*) from public.profiles where id = $1' into seen using id_b;
  if seen <> 0 then raise exception 'FAIL: A leu perfil de B (% rows)', seen; end if;

  execute 'update public.profiles set name = $1 where id = $2' using 'hacked', id_b;
  get diagnostics seen = row_count;
  if seen <> 0 then raise exception 'FAIL: A alterou perfil de B (% rows)', seen; end if;

  execute 'update public.user_progress set xp_total = 1 where user_id = $1' using id_b;
  get diagnostics seen = row_count;
  if seen <> 0 then raise exception 'FAIL: A alterou progresso de B (% rows)', seen; end if;

  execute 'update public.user_economy set qi = 1 where user_id = $1' using id_b;
  get diagnostics seen = row_count;
  if seen <> 0 then raise exception 'FAIL: A alterou economia de B (% rows)', seen; end if;

  select public.is_beta_admin() into admin_flag;
  if admin_flag is distinct from false then
    raise exception 'FAIL: is_beta_admin=% (esperado false)', admin_flag;
  end if;

  begin
    perform public.apply_subscription_event(
      id_b, 'cus_hack', 'rls_test_hack', 'canceled',
      null, null, null, null, null, null
    );
    apply_ok := true;
  exception when others then
    apply_ok := false;
  end;
  if apply_ok then
    raise exception 'FAIL: apply_subscription_event executável por usuário comum';
  end if;

  reset role;

  delete from public.subscriptions where user_id in (id_a, id_b);
  delete from public.user_economy where user_id in (id_a, id_b);
  delete from public.user_progress where user_id in (id_a, id_b);
  delete from public.profiles where id in (id_a, id_b);
  delete from auth.users where id in (id_a, id_b);
end $$;
