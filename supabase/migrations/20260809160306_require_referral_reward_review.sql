-- Referral learning evidence is still produced by an untrusted browser flow.
-- It may nominate a referral for review, but only an independent service-role
-- decision may cross the paid-entitlement boundary.

begin;

create table if not exists public.referral_qualification_reviews (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  review_note text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  grant_result jsonb,
  reviewed_at timestamptz not null default now(),
  constraint referral_qualification_review_note_check
    check (char_length(review_note) between 10 and 500)
);

create index if not exists referral_qualification_reviews_referral_time_idx
  on public.referral_qualification_reviews (referral_id, reviewed_at desc);

alter table public.referral_qualification_reviews enable row level security;

-- No table policy is intentional. Review history is operational security data.
revoke all on table public.referral_qualification_reviews
  from public, anon, authenticated;

create or replace function public._referral_try_qualify(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count integer;
  active_days integer;
  flags jsonb := '[]'::jsonb;
begin
  select * into r
  from public.referrals referral
  where referral.id = p_referral_id
  for update;

  if not found or r.status not in ('pending', 'under_review') then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  -- Once queued, authenticated pipeline retries must remain unable to approve,
  -- grant or reject the referral while an independent review is outstanding.
  if r.status = 'under_review'
     and r.risk_flags @> '["learning_attestation_review"]'::jsonb then
    return jsonb_build_object(
      'ok', true,
      'qualified', false,
      'review_required', true
    );
  end if;

  select account.id, account.created_at, account.email_confirmed_at
  into invitee_user
  from auth.users account
  where account.id = r.invitee_id;

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
    set status = 'rejected',
        rejected_at = now(),
        risk_flags = flags || '["window_expired"]'::jsonb
    where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  stats := public._referral_verified_progress(r.invitee_id, r.attributed_at);
  lesson_count := coalesce((stats ->> 'lesson_count')::integer, 0);
  active_days := coalesce((stats ->> 'active_days')::integer, 0);

  if lesson_count < 3 then
    return jsonb_build_object('ok', false, 'reason', 'lessons', 'need', 3, 'have', lesson_count);
  end if;
  if active_days < 2 then
    return jsonb_build_object('ok', false, 'reason', 'active_days', 'need', 2, 'have', active_days);
  end if;

  update public.referrals
  set status = 'under_review',
      qualified_at = coalesce(qualified_at, now()),
      risk_flags = case
        when risk_flags @> '["learning_attestation_review"]'::jsonb then risk_flags
        else risk_flags || '["learning_attestation_review"]'::jsonb
      end
  where id = r.id;

  return jsonb_build_object(
    'ok', true,
    'qualified', false,
    'review_required', true,
    'lesson_count', lesson_count,
    'active_days', active_days
  );
end;
$$;

create or replace function public.review_referral_qualification(
  p_referral_id uuid,
  p_approved boolean,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.referrals%rowtype;
  invitee_user record;
  stats jsonb;
  lesson_count integer;
  active_days integer;
  v_note text := left(trim(coalesce(p_note, '')), 500);
  v_grant jsonb;
begin
  if p_approved is null then
    return jsonb_build_object('ok', false, 'error', 'decision_required');
  end if;
  if char_length(v_note) < 10 then
    return jsonb_build_object('ok', false, 'error', 'review_note_required');
  end if;

  select * into r
  from public.referrals referral
  where referral.id = p_referral_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'referral_not_found');
  end if;
  if r.status = 'rewarded' then
    return jsonb_build_object('ok', true, 'already_rewarded', true);
  end if;
  if r.status <> 'under_review'
     or not (r.risk_flags @> '["learning_attestation_review"]'::jsonb)
     or r.qualified_at is null then
    return jsonb_build_object('ok', false, 'error', 'review_not_required');
  end if;

  stats := public._referral_verified_progress(r.invitee_id, r.attributed_at);
  lesson_count := coalesce((stats ->> 'lesson_count')::integer, 0);
  active_days := coalesce((stats ->> 'active_days')::integer, 0);

  select account.id, account.email_confirmed_at
  into invitee_user
  from auth.users account
  where account.id = r.invitee_id;

  if not found or invitee_user.email_confirmed_at is null
     or lesson_count < 3 or active_days < 2 then
    return jsonb_build_object(
      'ok', false,
      'error', 'eligibility_changed',
      'lesson_count', lesson_count,
      'active_days', active_days
    );
  end if;

  if not p_approved then
    insert into public.referral_qualification_reviews (
      referral_id, decision, review_note, reviewer_id, eligibility_snapshot
    ) values (
      r.id,
      'rejected',
      v_note,
      auth.uid(),
      jsonb_build_object('lesson_count', lesson_count, 'active_days', active_days)
    );

    update public.referrals
    set status = 'rejected',
        rejected_at = now(),
        risk_flags = risk_flags - 'learning_attestation_review'
    where id = r.id;

    return jsonb_build_object('ok', true, 'approved', false, 'rejected', true);
  end if;

  update public.referrals
  set status = 'qualified',
      risk_flags = risk_flags - 'learning_attestation_review'
  where id = r.id;

  v_grant := public._referral_grant_reward(r.id);

  insert into public.referral_qualification_reviews (
    referral_id, decision, review_note, reviewer_id,
    eligibility_snapshot, grant_result
  ) values (
    r.id,
    'approved',
    v_note,
    auth.uid(),
    jsonb_build_object('lesson_count', lesson_count, 'active_days', active_days),
    v_grant
  );

  if coalesce((v_grant ->> 'ok')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'grant_blocked', 'grant_result', v_grant);
  end if;

  return jsonb_build_object('ok', true, 'approved', true, 'grant_result', v_grant);
end;
$$;

-- The browser-callable pipeline may refresh progress and activate grants that
-- were already created by trusted code, but it never calls the reward sink.
create or replace function public.process_referral_pipeline()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  inv_ref public.referrals%rowtype;
  qual jsonb;
  activated integer := 0;
  queued_reviews integer := 0;
  g record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into inv_ref
  from public.referrals referral
  where referral.invitee_id = v_uid
  limit 1;

  if found and inv_ref.status in ('pending', 'under_review') then
    qual := public._referral_try_qualify(inv_ref.id);
    if coalesce((qual ->> 'review_required')::boolean, false) then
      queued_reviews := queued_reviews + 1;
    end if;
  end if;

  for inv_ref in
    select *
    from public.referrals referral
    where referral.inviter_id = v_uid
      and referral.status in ('pending', 'under_review')
    order by referral.id
  loop
    qual := public._referral_try_qualify(inv_ref.id);
    if coalesce((qual ->> 'review_required')::boolean, false) then
      queued_reviews := queued_reviews + 1;
    end if;
  end loop;

  for g in
    select grant_row.*
    from public.entitlement_grants grant_row
    where grant_row.user_id = v_uid
      and grant_row.status = 'pending'
      and grant_row.starts_at <= now()
    order by grant_row.id
    for update
  loop
    update public.entitlement_grants
    set status = 'active',
        starts_at = now(),
        ends_at = now() + (g.duration_days || ' days')::interval
    where id = g.id and status = 'pending';

    if found then
      update public.referral_rewards reward
      set status = 'active',
          activated_at = now(),
          expires_at = now() + (g.duration_days || ' days')::interval
      where reward.id = g.source_id and reward.user_id = v_uid;

      activated := activated + 1;
    end if;
  end loop;

  update public.entitlement_grants
  set status = 'expired'
  where user_id = v_uid
    and status = 'active'
    and ends_at is not null
    and ends_at <= now();

  update public.referral_rewards reward
  set status = 'expired'
  where reward.user_id = v_uid
    and reward.status = 'active'
    and reward.expires_at is not null
    and reward.expires_at <= now();

  return jsonb_build_object(
    'ok', true,
    'activated', activated,
    'queued_reviews', queued_reviews
  );
end;
$$;

-- Preserve and queue any legacy qualified row that has not yet reached the
-- reward sink. Already rewarded referrals and active grants are untouched.
update public.referrals referral
set status = 'under_review',
    risk_flags = case
      when referral.risk_flags @> '["learning_attestation_review"]'::jsonb
        then referral.risk_flags
      else referral.risk_flags || '["learning_attestation_review"]'::jsonb
    end
where referral.status = 'qualified'
  and not exists (
    select 1
    from public.referral_rewards reward
    where reward.referral_id = referral.id
  );

revoke all on function public._referral_try_qualify(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_try_qualify(uuid) to service_role;

revoke all on function public._referral_grant_reward(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_grant_reward(uuid) to service_role;

revoke all on function public.review_referral_qualification(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.review_referral_qualification(uuid, boolean, text)
  to service_role;

revoke all on function public.process_referral_pipeline()
  from public, anon, authenticated;
grant execute on function public.process_referral_pipeline() to authenticated;

comment on table public.referral_qualification_reviews is
  'Append-only audit of independent decisions before referral rewards cross into paid entitlements.';
comment on function public.review_referral_qualification(uuid, boolean, text) is
  'Service-role-only approval or rejection for a referral queued by untrusted learning evidence.';

commit;
