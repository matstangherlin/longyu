-- Smoke ampliado das regras de indicação (produção/staging).
-- Cobre: autoindicação, grant, already_rewarded, fila Pro, monthly_cap,
-- email_blocks, e limpa tudo ao final.
-- Rode no SQL Editor / MCP execute_sql.

do $$
declare
  inviter uuid := gen_random_uuid();
  invitee uuid := gen_random_uuid();
  invitee2 uuid := gen_random_uuid();
  invitee3 uuid := gen_random_uuid();
  code_id uuid;
  ref_id uuid;
  ref_id2 uuid;
  queue_ref_id uuid;
  self_ok boolean := false;
  grant_result jsonb;
  grant_again jsonb;
  queue_result jsonb;
  cap_result jsonb;
  i int;
  cap_invitee uuid;
  cap_ref uuid;
  blocked_email_hash text := encode(extensions.digest(lower('smoke-blocked@longyu.invalid'), 'sha256'), 'hex');
begin
  -- ── users + profiles ───────────────────────────────────────────────────
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    (inviter, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ref-inviter-'||inviter::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '10 days', '{}'::jsonb, '{}'::jsonb, now() - interval '10 days', now()),
    (invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ref-invitee-'||invitee::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()),
    (invitee2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ref-invitee2-'||invitee2::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()),
    (invitee3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-blocked@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now());

  insert into public.profiles (id, name, onboarding_completed) values
    (inviter, 'Inviter Smoke', true),
    (invitee, 'Invitee Smoke', true),
    (invitee2, 'Invitee2 Smoke', true),
    (invitee3, 'Invitee3 Smoke', true)
  on conflict (id) do update set name = excluded.name, onboarding_completed = true;

  insert into public.referral_codes (user_id, code)
  values (inviter, 'SMOKE'||substr(replace(inviter::text,'-',''),1,6))
  returning id into code_id;

  -- 1) autoindicação bloqueada
  begin
    insert into public.referrals (inviter_id, invitee_id, referral_code_id)
    values (inviter, inviter, code_id);
  exception when check_violation then
    self_ok := true;
  end;
  if not self_ok then
    raise exception 'FAIL: self-referral constraint missing';
  end if;

  -- 2) grant happy path
  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at, invitee_email_hash
  )
  values (
    inviter, invitee, code_id, 'qualified', now() - interval '3 days', blocked_email_hash
  )
  returning id into ref_id;

  grant_result := public._referral_grant_reward(ref_id);
  if coalesce((grant_result->>'ok')::boolean, false) is not true then
    raise exception 'FAIL: grant failed: %', grant_result;
  end if;
  if coalesce((grant_result->>'queued')::boolean, true) is not false then
    -- sem Stripe Pro: deve ativar imediatamente (queued=false)
    raise exception 'FAIL: expected immediate grant (not queued): %', grant_result;
  end if;
  if not exists (
    select 1 from public.referral_rewards
    where referral_id = ref_id and status = 'active'
  ) then
    raise exception 'FAIL: active reward missing';
  end if;
  if not exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral' and status = 'active'
  ) then
    raise exception 'FAIL: active entitlement grant missing';
  end if;
  if not exists (
    select 1 from public.referral_email_blocks where email_hash = blocked_email_hash
  ) then
    raise exception 'FAIL: email_blocks not written after reward';
  end if;

  -- 3) already_rewarded (qualified + reward row exists, status not yet rewarded)
  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at
  )
  values (
    inviter, invitee3, code_id, 'qualified', now() - interval '1 day'
  )
  returning id into ref_id2;

  insert into public.referral_rewards (referral_id, user_id, reward_days, status)
  values (ref_id2, inviter, 7, 'active');

  grant_again := public._referral_grant_reward(ref_id2);
  if coalesce(grant_again->>'reason', '') <> 'already_rewarded' then
    raise exception 'FAIL: expected already_rewarded: %', grant_again;
  end if;

  -- 4) fila quando indicador já é Pro (Stripe)
  insert into public.subscriptions (
    user_id, status, stripe_subscription_id, current_period_end
  ) values (
    inviter, 'active', 'sub_smoke_'||substr(inviter::text,1,8), now() + interval '30 days'
  );

  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at
  ) values (
    inviter, invitee2, code_id, 'qualified', now() - interval '2 days'
  ) returning id into queue_ref_id;

  queue_result := public._referral_grant_reward(queue_ref_id);
  if coalesce((queue_result->>'ok')::boolean, false) is not true then
    raise exception 'FAIL: queued grant failed: %', queue_result;
  end if;
  if coalesce((queue_result->>'queued')::boolean, false) is not true then
    raise exception 'FAIL: expected queued=true when Stripe Pro active: %', queue_result;
  end if;
  if not exists (
    select 1 from public.referral_rewards
    where referral_id = queue_ref_id and status = 'available'
  ) then
    raise exception 'FAIL: available (queued) reward missing';
  end if;
  if not exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral' and status = 'pending'
      and source_id = (select id from public.referral_rewards where referral_id = queue_ref_id)
  ) then
    raise exception 'FAIL: pending entitlement grant missing for queued reward';
  end if;

  -- 5) monthly_cap (>= 8 rewards / 30d) — já temos 3; cria mais 5 + tenta a 9ª
  for i in 1..5 loop
    cap_invitee := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      cap_invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'cap-'||i||'-'||cap_invitee::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
      now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()
    );
    insert into public.profiles (id, name, onboarding_completed)
    values (cap_invitee, 'Cap '||i, true)
    on conflict (id) do update set name = excluded.name, onboarding_completed = true;
    insert into public.referrals (
      inviter_id, invitee_id, referral_code_id, status, attributed_at
    ) values (
      inviter, cap_invitee, code_id, 'qualified', now() - interval '1 day'
    ) returning id into cap_ref;
    cap_result := public._referral_grant_reward(cap_ref);
    if coalesce((cap_result->>'ok')::boolean, false) is not true then
      raise exception 'FAIL: cap seed grant % failed: %', i, cap_result;
    end if;
  end loop;

  -- 9ª deve bater monthly_cap
  cap_invitee := gen_random_uuid();
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    cap_invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'cap-9-'||cap_invitee::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
    now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()
  );
  insert into public.profiles (id, name, onboarding_completed)
  values (cap_invitee, 'Cap 9', true)
  on conflict (id) do update set name = excluded.name, onboarding_completed = true;
  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at
  ) values (
    inviter, cap_invitee, code_id, 'qualified', now() - interval '1 day'
  ) returning id into cap_ref;

  cap_result := public._referral_grant_reward(cap_ref);
  if coalesce(cap_result->>'reason', '') <> 'monthly_cap' then
    raise exception 'FAIL: expected monthly_cap: %', cap_result;
  end if;
  if not exists (
    select 1 from public.referrals
    where id = cap_ref and status = 'under_review'
  ) then
    raise exception 'FAIL: monthly_cap should mark under_review';
  end if;

  -- limpeza (cascade apaga referrals/rewards/grants/codes via profiles/users)
  delete from public.referral_email_blocks where email_hash = blocked_email_hash;
  delete from auth.users
  where id = inviter
     or id = invitee
     or id = invitee2
     or id = invitee3
     or email like 'cap-%@longyu.invalid'
     or email like 'ref-inviter-%@longyu.invalid'
     or email like 'ref-invitee%@longyu.invalid';

  raise notice 'OK: referral-rules-smoke — self, grant, already_rewarded, queue Pro, monthly_cap, email_blocks';
end $$;
