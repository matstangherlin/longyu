begin;

do $$
declare
  inviter uuid := gen_random_uuid();
  invitee uuid := gen_random_uuid();
  code_id uuid;
  referral_id uuid;
  session_id uuid;
  older_session_id uuid := gen_random_uuid();
  newer_session_id uuid := gen_random_uuid();
  result jsonb;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (inviter, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'secure-ref-inviter-' || inviter::text || '@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '10 days', '{}'::jsonb, '{}'::jsonb, now() - interval '10 days', now()),
    (invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'secure-ref-invitee-' || invitee::text || '@longyu.invalid', crypt('x', gen_salt('bf')),
     now() - interval '3 days', '{}'::jsonb, '{}'::jsonb, now() - interval '3 days', now());

  insert into public.profiles (id, name, onboarding_completed) values
    (inviter, 'Secure Referral Inviter', true),
    (invitee, 'Secure Referral Invitee', true)
  on conflict (id) do update set name = excluded.name, onboarding_completed = true;

  insert into public.referral_codes (user_id, code)
  values (inviter, 'SAFE' || substr(replace(inviter::text, '-', ''), 1, 6))
  returning id into code_id;

  insert into public.referrals (
    inviter_id, invitee_id, referral_code_id, status, attributed_at
  ) values (
    inviter, invitee, code_id, 'pending', now() - interval '3 days'
  ) returning id into referral_id;

  -- This is the original exploit: arbitrary client JSON claims three lessons
  -- and two active days. It must not qualify or mint a grant anymore.
  insert into public.user_progress (
    user_id, completed_lessons, client_snapshot, last_active, updated_at
  ) values (
    invitee,
    array['l1', 'l2', 'l3'],
    jsonb_build_object(
      'progress', jsonb_build_object(
        'completedLessons', jsonb_build_array('l1', 'l2', 'l3'),
        'activityByDay', jsonb_build_object(
          to_char(current_date - 1, 'YYYY-MM-DD'), jsonb_build_object('tasks', 99, 'xp', 9999),
          to_char(current_date, 'YYYY-MM-DD'), jsonb_build_object('tasks', 99, 'xp', 9999)
        )
      )
    ),
    current_date,
    now()
  );

  result := public._referral_try_qualify(referral_id);
  if coalesce((result ->> 'qualified')::boolean, false) then
    raise exception 'FAIL: forged snapshot qualified referral: %', result;
  end if;
  if (result ->> 'reason') <> 'lessons' or (result ->> 'have')::integer <> 0 then
    raise exception 'FAIL: forged snapshot affected trusted lesson count: %', result;
  end if;
  if exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral'
  ) then
    raise exception 'FAIL: forged snapshot minted entitlement';
  end if;

  perform set_config('request.jwt.claim.sub', invitee::text, true);
  result := public.start_referral_lesson_session('not-a-real-longyu-lesson');
  if (result ->> 'error') <> 'unknown_lesson' then
    raise exception 'FAIL: unknown lesson accepted: %', result;
  end if;

  result := public.start_referral_lesson_session('l1');
  session_id := (result ->> 'session_id')::uuid;
  result := public.complete_referral_lesson_session(session_id);
  if (result ->> 'error') <> 'too_soon' then
    raise exception 'FAIL: early completion accepted: %', result;
  end if;

  update public.referral_lesson_sessions
  set not_before = now() - interval '1 second'
  where id = session_id;
  result := public.complete_referral_lesson_session(session_id);
  if coalesce((result ->> 'verified')::boolean, false) is not true then
    raise exception 'FAIL: mature owned session was not verified: %', result;
  end if;

  -- Privileged fixture construction for the legitimate two-day path. These
  -- tables are not writable by authenticated or anonymous roles.
  insert into public.referral_lesson_sessions (
    id, user_id, lesson_id, started_at, not_before, expires_at, completed_at
  ) values
    (older_session_id, invitee, 'l2', now() - interval '1 day 3 minutes',
     now() - interval '1 day 2 minutes', now() - interval '20 hours', now() - interval '1 day'),
    (newer_session_id, invitee, 'l3', now() - interval '3 minutes',
     now() - interval '2 minutes', now() + interval '3 hours', now() - interval '1 minute');

  insert into public.referral_verified_lesson_completions (
    user_id, lesson_id, source_session_id, completed_at
  ) values
    (invitee, 'l2', older_session_id, now() - interval '1 day'),
    (invitee, 'l3', newer_session_id, now() - interval '1 minute');

  result := public._referral_try_qualify(referral_id);
  if coalesce((result ->> 'qualified')::boolean, false) is not true then
    raise exception 'FAIL: three verified lessons over two server days did not qualify: %', result;
  end if;

  result := public._referral_grant_reward(referral_id);
  if coalesce((result ->> 'ok')::boolean, false) is not true then
    raise exception 'FAIL: legitimate qualified referral was not rewarded: %', result;
  end if;
  if not exists (
    select 1 from public.entitlement_grants
    where user_id = inviter and source = 'referral' and status in ('active', 'pending')
  ) then
    raise exception 'FAIL: legitimate referral entitlement missing';
  end if;

  if has_table_privilege('authenticated', 'public.referral_lesson_sessions', 'INSERT')
     or has_table_privilege('authenticated', 'public.referral_verified_lesson_completions', 'INSERT') then
    raise exception 'FAIL: authenticated role can write trusted evidence tables';
  end if;
  if has_function_privilege('anon', 'public.start_referral_lesson_session(text)', 'EXECUTE') then
    raise exception 'FAIL: anonymous role can start referral lesson sessions';
  end if;
end $$;

rollback;
