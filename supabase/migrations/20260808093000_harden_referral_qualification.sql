-- Referral rewards must never be derived from client-writable progress JSON.
-- A lesson counts only after an authenticated, server-timed attempt for a
-- catalogued lesson is completed. The browser can request an attempt, but it
-- cannot choose the start/completion timestamps or write the evidence tables.

create table if not exists public.referral_eligible_lessons (
  lesson_id text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_eligible_lesson_id_check
    check (lesson_id = trim(lesson_id) and char_length(lesson_id) between 1 and 80)
);

insert into public.referral_eligible_lessons (lesson_id)
select lesson_id
from unnest(array[
  'p1-o-que-e-mandarim', 'p1-o-que-e-pinyin', 'p1-o-que-e-tom',
  'p1-o-que-e-hanzi', 'p1-primeiros-hanzi', 'p1-engine-2-lab',
  'l1', 'l2', 'l3', 'l1-rev', 'l4', 'p1-ate-logo',
  'p1-primeira-conversa', 'p1-qingwen-cortesia', 'l2-rev',
  'p2-ma-primeiro-tom', 'p2-ma-segundo-tom', 'p2-ma-terceiro-tom',
  'p2-ma-quarto-tom', 'p2-comparar-tom-1-4', 'p2-comparar-tom-2-3',
  'l5', 'l6', 'l3-rev', 'l7', 'l8', 'l8-compare', 'l8-shi',
  'p2-tons-nihao', 'p2-tons-xiexie', 'p2-sons-brasileiros',
  'p2-numeros-1-5', 'l4-rev', 'l9', 'l9-tudo-bem', 'l9-qual-nome',
  'l10', 'p3-wohenhao', 'p3-wobuhui-shuo-zhongwen',
  'p3-qing-zai-shuo-yibian', 'l11', 'l11-falo-pouco', 'l12', 'l13',
  'l13-dialogo-ola', 'l13-dialogo-nome', 'p3-ordem-das-palavras',
  'l5-rev', 'l14', 'p4-num-123', 'p4-num-45', 'p4-num-678',
  'p4-num-910', 'p4-char-mu', 'p4-char-ren', 'p4-char-kou',
  'p4-char-ri', 'p4-char-yue', 'p4-char-shan', 'p4-char-shui',
  'p4-char-tian', 'p4-char-huo', 'p4-char-da', 'p4-char-xiao',
  'p4-char-zhong', 'p4-char-bu', 'p4-char-shi', 'p4-char-wo',
  'p4-char-ni', 'l14-numeros-visuais', 'l14-pecas-natureza',
  'l14-frase-minima', 'l14-char-rev', 'l15', 'l6-rev', 'l16', 'l17',
  'l18', 'l7-rev', 'p4-checkpoint-fundamentos', 'p5-mu-mu-lin',
  'p5-mu-mu-mu-sen', 'p5-ri-yue-ming', 'p5-ren-mu-xiu',
  'p5-nv-zi-hao', 'p5-ren-ren-cong', 'p5-ren-ren-ren-zhong',
  'p5-nv-ma-mae', 'p5-kou-ma-pergunta', 'l19-logica-madeira',
  'l19-logica-luz', 'l19-logica-pessoas', 'l19-logica-ma',
  'l19-logica-rev', 'l19', 'l20', 'l8-rev', 'l21', 'l22', 'l23',
  'l9-rev', 'l24', 'l25', 'l26', 'l26b', 'l27', 'l28',
  'p6-rotina-trabalho', 'p6-cidade-lugares', 'p6-saude', 'p6-horarios',
  'p6-natureza', 'p6-clima', 'p6-direcoes', 'p6-compras', 'l10-rev',
  'l29', 'l30', 'l11-rev', 'p7-imersao-mercado', 'p7-imersao-estacao',
  'p7-imersao-casa-amigo'
]::text[]) as catalog(lesson_id)
on conflict (lesson_id) do update set enabled = true;

create table if not exists public.referral_lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.referral_eligible_lessons(lesson_id),
  started_at timestamptz not null default now(),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint referral_lesson_session_window_check check (
    not_before > started_at
    and expires_at > not_before
    and (completed_at is null or completed_at >= not_before)
  )
);

create unique index if not exists referral_lesson_sessions_active_uidx
  on public.referral_lesson_sessions (user_id, lesson_id)
  where completed_at is null;

create index if not exists referral_lesson_sessions_user_started_idx
  on public.referral_lesson_sessions (user_id, started_at desc);

create index if not exists referral_lesson_sessions_lesson_idx
  on public.referral_lesson_sessions (lesson_id);

create table if not exists public.referral_verified_lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.referral_eligible_lessons(lesson_id),
  source_session_id uuid not null unique references public.referral_lesson_sessions(id) on delete restrict,
  completed_at timestamptz not null,
  primary key (user_id, lesson_id)
);

create index if not exists referral_verified_completion_user_time_idx
  on public.referral_verified_lesson_completions (user_id, completed_at desc);

create index if not exists referral_verified_completion_lesson_idx
  on public.referral_verified_lesson_completions (lesson_id);

alter table public.referral_eligible_lessons enable row level security;
alter table public.referral_lesson_sessions enable row level security;
alter table public.referral_verified_lesson_completions enable row level security;

-- No table policy is intentional: all mutation and reads cross the narrow RPCs.
revoke all on table public.referral_eligible_lessons from public, anon, authenticated;
revoke all on table public.referral_lesson_sessions from public, anon, authenticated;
revoke all on table public.referral_verified_lesson_completions from public, anon, authenticated;

create or replace function public.start_referral_lesson_session(p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson text := left(trim(coalesce(p_lesson_id, '')), 80);
  v_existing public.referral_lesson_sessions%rowtype;
  v_started_today integer;
  v_day_start timestamptz := (timezone('utc', now())::date at time zone 'utc');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_lesson = '' or not exists (
    select 1
    from public.referral_eligible_lessons lesson
    where lesson.lesson_id = v_lesson and lesson.enabled
  ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_lesson');
  end if;

  -- Serialize starts for one user/day so the daily ceiling is race-safe.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text || '|' || v_day_start::text, 0)
  );

  if exists (
    select 1
    from public.referral_verified_lesson_completions completion
    where completion.user_id = v_uid and completion.lesson_id = v_lesson
  ) then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;

  delete from public.referral_lesson_sessions session
  where session.user_id = v_uid
    and session.lesson_id = v_lesson
    and session.completed_at is null
    and session.expires_at <= now();

  select session.* into v_existing
  from public.referral_lesson_sessions session
  where session.user_id = v_uid
    and session.lesson_id = v_lesson
    and session.completed_at is null
    and session.expires_at > now()
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'session_id', v_existing.id,
      'not_before', v_existing.not_before,
      'expires_at', v_existing.expires_at,
      'reused', true
    );
  end if;

  select count(*)::integer into v_started_today
  from public.referral_lesson_sessions session
  where session.user_id = v_uid and session.started_at >= v_day_start;

  if v_started_today >= 24 then
    return jsonb_build_object('ok', false, 'error', 'daily_limit');
  end if;

  insert into public.referral_lesson_sessions (
    user_id, lesson_id, not_before, expires_at
  ) values (
    v_uid, v_lesson, now() + interval '45 seconds', now() + interval '4 hours'
  ) returning * into v_existing;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_existing.id,
    'not_before', v_existing.not_before,
    'expires_at', v_existing.expires_at,
    'reused', false
  );
end;
$$;

create or replace function public.complete_referral_lesson_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.referral_lesson_sessions%rowtype;
  v_inserted integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select session.* into v_session
  from public.referral_lesson_sessions session
  where session.id = p_session_id and session.user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;
  if v_session.completed_at is not null then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'session_expired');
  end if;
  if v_session.not_before > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_soon',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_session.not_before - now())))::integer)
    );
  end if;

  insert into public.referral_verified_lesson_completions (
    user_id, lesson_id, source_session_id, completed_at
  ) values (
    v_uid, v_session.lesson_id, v_session.id, now()
  ) on conflict (user_id, lesson_id) do nothing;
  get diagnostics v_inserted = row_count;

  update public.referral_lesson_sessions
  set completed_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'verified', v_inserted = 1,
    'already_completed', v_inserted = 0
  );
end;
$$;

create or replace function public._referral_verified_progress(
  p_user_id uuid,
  p_since timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lesson_count', count(distinct completion.lesson_id)::integer,
    'active_days', count(distinct (timezone('utc', completion.completed_at))::date)::integer
  )
  from public.referral_verified_lesson_completions completion
  join public.referral_eligible_lessons lesson
    on lesson.lesson_id = completion.lesson_id and lesson.enabled
  where completion.user_id = p_user_id
    and completion.completed_at >= p_since;
$$;

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
  set status = 'qualified', qualified_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'qualified', true);
end;
$$;

revoke all on function public.start_referral_lesson_session(text)
  from public, anon, authenticated;
grant execute on function public.start_referral_lesson_session(text) to authenticated;

revoke all on function public.complete_referral_lesson_session(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_referral_lesson_session(uuid) to authenticated;

revoke all on function public._referral_verified_progress(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public._referral_verified_progress(uuid, timestamptz) to service_role;

revoke all on function public._referral_try_qualify(uuid)
  from public, anon, authenticated;
grant execute on function public._referral_try_qualify(uuid) to service_role;

comment on table public.referral_verified_lesson_completions is
  'Server-timed evidence used for referral qualification; never written through table APIs.';
comment on function public.start_referral_lesson_session(text) is
  'Starts a bounded authenticated referral-learning attestation for a catalogued lesson.';
comment on function public.complete_referral_lesson_session(uuid) is
  'Completes an owned, unexpired and sufficiently aged lesson attestation.';
