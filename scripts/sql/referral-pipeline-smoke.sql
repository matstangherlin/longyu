-- Smoke do pipeline completo: attribute → progresso → qualify → grant.
-- Simula o caminho pós-48h sem e-mail real (usuários já confirmados).
-- Limpa tudo ao final.

do $$
declare
  inviter uuid := gen_random_uuid();
  invitee uuid := gen_random_uuid();
  code_text text;
  code_id uuid;
  ref_id uuid;
  attr jsonb;
  qual jsonb;
  grant_res jsonb;
  session1 uuid := gen_random_uuid();
  session2 uuid := gen_random_uuid();
  session3 uuid := gen_random_uuid();
  day1 text := to_char((now() - interval '2 days')::date, 'YYYY-MM-DD');
  day2 text := to_char((now() - interval '1 day')::date, 'YYYY-MM-DD');
  snap jsonb;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (inviter, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'pipe-inviter-'||inviter::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '10 days', '{}'::jsonb, '{}'::jsonb, now() - interval '10 days', now()),
    (invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'pipe-invitee-'||invitee::text||'@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now());

  insert into public.profiles (id, name, onboarding_completed) values
    (inviter, 'Pipe Inviter', true),
    (invitee, 'Pipe Invitee', true)
  on conflict (id) do update set name = excluded.name, onboarding_completed = true;

  -- código do indicador
  code_text := 'PIPE'||substr(replace(inviter::text,'-',''),1,6);
  insert into public.referral_codes (user_id, code)
  values (inviter, code_text)
  returning id into code_id;

  -- atribuição (sem auth.uid: insert direto equivalente ao RPC attribute)
  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at,
    invitee_email_hash
  ) values (
    inviter, invitee, code_id, 'pending', now() - interval '3 days',
    encode(extensions.digest(lower('pipe-invitee-'||invitee::text||'@longyu.invalid'), 'sha256'), 'hex')
  ) returning id into ref_id;

  -- progresso: 3 lições + 2 dias ativos no client_snapshot
  snap := jsonb_build_object(
    'progress', jsonb_build_object(
      'completedLessons', jsonb_build_array('l1','l2','l3'),
      'activityByDay', jsonb_build_object(
        day1, jsonb_build_object('tasks', 2, 'xp', 40),
        day2, jsonb_build_object('tasks', 1, 'xp', 20)
      )
    )
  );

  insert into public.user_progress (
    user_id, completed_lessons, client_snapshot, last_active, updated_at
  ) values (
    invitee,
    array['l1','l2','l3'],
    snap,
    (now() - interval '1 day')::date,
    now() - interval '1 day'
  )
  on conflict (user_id) do update set
    completed_lessons = excluded.completed_lessons,
    client_snapshot = excluded.client_snapshot,
    last_active = excluded.last_active,
    updated_at = excluded.updated_at;

  qual := public._referral_try_qualify(ref_id);
  if coalesce((qual->>'qualified')::boolean, false) is true then
    raise exception 'FAIL: forged client_snapshot qualified referral: %', qual;
  end if;

  -- Evidencia server-owned: tres licoes catalogadas em dois dias UTC.
  insert into public.referral_lesson_sessions (
    id, user_id, lesson_id, started_at, not_before, expires_at, completed_at
  ) values
    (session1, invitee, 'l1', now() - interval '2 days 3 minutes',
     now() - interval '2 days 2 minutes', now() - interval '1 day 20 hours', now() - interval '2 days'),
    (session2, invitee, 'l2', now() - interval '2 days 3 minutes',
     now() - interval '2 days 2 minutes', now() - interval '1 day 20 hours', now() - interval '2 days'),
    (session3, invitee, 'l3', now() - interval '1 day 3 minutes',
     now() - interval '1 day 2 minutes', now() - interval '20 hours', now() - interval '1 day');

  insert into public.referral_verified_lesson_completions (
    user_id, lesson_id, source_session_id, completed_at
  ) values
    (invitee, 'l1', session1, now() - interval '2 days'),
    (invitee, 'l2', session2, now() - interval '2 days'),
    (invitee, 'l3', session3, now() - interval '1 day');

  qual := public._referral_try_qualify(ref_id);
  if coalesce((qual->>'qualified')::boolean, false) is not true then
    raise exception 'FAIL: qualify expected true, got %', qual;
  end if;

  grant_res := public._referral_grant_reward(ref_id);
  if coalesce((grant_res->>'ok')::boolean, false) is not true then
    raise exception 'FAIL: grant after qualify: %', grant_res;
  end if;

  if not exists (select 1 from public.referrals where id = ref_id and status = 'rewarded') then
    raise exception 'FAIL: referral not rewarded';
  end if;
  if not exists (
    select 1 from public.referral_rewards
    where referral_id = ref_id and status in ('active','available')
  ) then
    raise exception 'FAIL: reward missing';
  end if;
  if not exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral' and status in ('active','pending')
  ) then
    raise exception 'FAIL: entitlement grant missing';
  end if;
  if not public.user_has_entitlement_grant(inviter) then
    raise exception 'FAIL: user_has_entitlement_grant false for inviter';
  end if;

  -- limpeza
  delete from auth.users where id in (inviter, invitee);

  raise notice 'OK: referral-pipeline-smoke — pending→qualified→rewarded + grant Pro';
end $$;
