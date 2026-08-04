-- Smoke operacional do motor de indicação (produção/staging).
-- Cria usuários temporários, prova anti-autoindicação + grant de Pro, e limpa tudo.
-- Rode no SQL Editor / MCP execute_sql.

do $$
declare
  inviter uuid := gen_random_uuid();
  invitee uuid := gen_random_uuid();
  code_id uuid;
  ref_id uuid;
  self_ok boolean := false;
  grant_result jsonb;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    (inviter, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ref-inviter-'||inviter::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()),
    (invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ref-invitee-'||invitee::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now());

  insert into public.profiles (id, name, onboarding_completed) values
    (inviter, 'Inviter Smoke', true),
    (invitee, 'Invitee Smoke', true)
  on conflict (id) do update set name = excluded.name, onboarding_completed = true;

  insert into public.referral_codes (user_id, code)
  values (inviter, 'SMOKE'||substr(replace(inviter::text,'-',''),1,6))
  returning id into code_id;

  begin
    insert into public.referrals (inviter_id, invitee_id, referral_code_id)
    values (inviter, inviter, code_id);
  exception when check_violation then
    self_ok := true;
  end;
  if not self_ok then
    raise exception 'self-referral constraint missing';
  end if;

  insert into public.referrals (inviter_id, invitee_id, referral_code_id, status, attributed_at)
  values (inviter, invitee, code_id, 'qualified', now() - interval '3 days')
  returning id into ref_id;

  grant_result := public._referral_grant_reward(ref_id);
  if coalesce((grant_result->>'ok')::boolean, false) is not true then
    raise exception 'grant failed: %', grant_result;
  end if;

  if not exists (select 1 from public.referral_rewards where referral_id = ref_id) then
    raise exception 'reward not created';
  end if;
  if not exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral'
  ) then
    raise exception 'entitlement grant not created';
  end if;

  delete from auth.users where id in (inviter, invitee);
end $$;
