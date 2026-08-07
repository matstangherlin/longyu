-- Corrige SELECT INTO em _referral_try_qualify: alias `u` colidia com a
-- variável record `u`, fazendo o SELECT não atribuir e estourar
-- "record u is not assigned yet" (bloqueava qualify → grant no pipeline).

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count int;
  active_days int;
  flags jsonb := '[]'::jsonb;
begin
  select * into r from public.referrals where id = p_referral_id for update;
  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  select au.id, au.created_at, au.email_confirmed_at
    into invitee_user
  from auth.users au
  where au.id = r.invitee_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invitee_missing');
  end if;

  if invitee_user.email_confirmed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;

  if invitee_user.created_at > now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_new');
  end if;

  if invitee_user.created_at < now() - interval '14 days' then
    update public.referrals
      set status = 'rejected', rejected_at = now(), risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_progress_from_snapshot(r.invitee_id);
  lesson_count := coalesce((stats ->> 'lesson_count')::int, 0);
  active_days := coalesce((stats ->> 'active_days')::int, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'qualified', true);
end;
$$;
