-- V4.7 — Placement 2.0 + onboarding cloud-first.
-- Staging only. Do not apply to production without human review.

begin;

alter table public.profiles
  add column if not exists onboarding_version integer,
  add column if not exists learning_goal text,
  add column if not exists declared_experience text,
  add column if not exists placement_attempt_id uuid,
  add column if not exists placement_completed_at timestamptz,
  add column if not exists local_migrated_at timestamptz;

create table if not exists public.placement_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  placement_version integer not null,
  declared_experience text not null,
  goal text,
  answers jsonb not null default '[]'::jsonb,
  score_summary jsonb not null default '{}'::jsonb,
  competency_summary jsonb not null default '{}'::jsonb,
  foundation_proofs jsonb not null default '[]'::jsonb,
  recommended_lesson_id text,
  mastered_by_placement text[] not null default '{}',
  confidence numeric,
  idempotency_key text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint placement_attempts_version_positive check (placement_version > 0),
  constraint placement_attempts_experience_check check (
    declared_experience in ('zero', 'words', 'studied', 'phrases', 'advanced')
  )
);

create index if not exists placement_attempts_user_id_idx
  on public.placement_attempts (user_id, created_at desc);

create unique index if not exists placement_attempts_idempotency_idx
  on public.placement_attempts (user_id, idempotency_key)
  where idempotency_key is not null;

alter table public.placement_attempts enable row level security;

drop policy if exists placement_attempts_select_own on public.placement_attempts;
create policy placement_attempts_select_own
  on public.placement_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.placement_attempts is
  'Nivelamento persistido. O cliente envia evidência; o servidor recalcula scores e skips.';

alter table public.profiles
  drop constraint if exists profiles_placement_attempt_fk;
alter table public.profiles
  add constraint profiles_placement_attempt_fk
  foreign key (placement_attempt_id) references public.placement_attempts(id)
  on delete set null;

create or replace function public.commit_placement_result(
  p_user_id uuid,
  p_placement_version integer,
  p_declared_experience text,
  p_goal text,
  p_answers jsonb,
  p_score_summary jsonb,
  p_competency_summary jsonb,
  p_foundation_proofs jsonb,
  p_recommended_lesson_id text,
  p_mastered_by_placement text[],
  p_confidence numeric,
  p_idempotency_key text default null,
  p_learning_goal text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.placement_attempts;
  v_completed text[];
begin
  if p_user_id is null then
    raise exception 'not authorized';
  end if;
  if p_placement_version is distinct from 2 then
    raise exception 'placement_version_mismatch';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) < 1 then
    raise exception 'answers_required';
  end if;

  if p_idempotency_key is not null then
    select * into v_attempt
    from public.placement_attempts
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key
    limit 1;
  end if;

  if v_attempt.id is null then
    insert into public.profiles (
      id,
      name,
      onboarding_completed,
      onboarding_version,
      updated_at
    ) values (
      p_user_id,
      'Aluno Longyu',
      false,
      2,
      now()
    )
    on conflict (id) do nothing;

    insert into public.placement_attempts (
      user_id,
      placement_version,
      declared_experience,
      goal,
      answers,
      score_summary,
      competency_summary,
      foundation_proofs,
      recommended_lesson_id,
      mastered_by_placement,
      confidence,
      idempotency_key,
      completed_at
    ) values (
      p_user_id,
      p_placement_version,
      p_declared_experience,
      nullif(trim(coalesce(p_goal, '')), ''),
      coalesce(p_answers, '[]'::jsonb),
      coalesce(p_score_summary, '{}'::jsonb),
      coalesce(p_competency_summary, '{}'::jsonb),
      coalesce(p_foundation_proofs, '[]'::jsonb),
      p_recommended_lesson_id,
      coalesce(p_mastered_by_placement, '{}'),
      p_confidence,
      nullif(trim(coalesce(p_idempotency_key, '')), ''),
      now()
    )
    returning * into v_attempt;
  end if;

  insert into public.profiles (
    id,
    name,
    onboarding_completed,
    onboarding_version,
    learning_goal,
    declared_experience,
    placement_attempt_id,
    placement_completed_at,
    updated_at
  ) values (
    p_user_id,
    'Aluno Longyu',
    true,
    2,
    nullif(trim(coalesce(p_learning_goal, p_goal, '')), ''),
    p_declared_experience,
    v_attempt.id,
    v_attempt.completed_at,
    now()
  )
  on conflict (id) do update
  set
    onboarding_completed = true,
    onboarding_version = 2,
    learning_goal = coalesce(excluded.learning_goal, public.profiles.learning_goal),
    declared_experience = excluded.declared_experience,
    placement_attempt_id = excluded.placement_attempt_id,
    placement_completed_at = excluded.placement_completed_at,
    updated_at = now();

  select coalesce(up.completed_lessons, '{}') into v_completed
  from public.user_progress up
  where up.user_id = p_user_id;

  v_completed := (
    select coalesce(array_agg(distinct lesson_id), '{}')
    from unnest(coalesce(v_completed, '{}') || coalesce(p_mastered_by_placement, '{}')) as lesson_id
  );

  insert into public.user_progress (
    user_id,
    completed_lessons,
    current_lesson_id,
    placement,
    updated_at
  ) values (
    p_user_id,
    v_completed,
    p_recommended_lesson_id,
    jsonb_build_object(
      'placementVersion', p_placement_version,
      'recommendedLessonId', p_recommended_lesson_id,
      'masteredByPlacement', to_jsonb(coalesce(p_mastered_by_placement, '{}')),
      'confidence', p_confidence,
      'scoreSummary', coalesce(p_score_summary, '{}'::jsonb)
    ),
    now()
  )
  on conflict (user_id) do update
  set
    completed_lessons = excluded.completed_lessons,
    current_lesson_id = coalesce(excluded.current_lesson_id, public.user_progress.current_lesson_id),
    placement = excluded.placement,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'attemptId', v_attempt.id,
    'recommendedLessonId', v_attempt.recommended_lesson_id,
    'masteredByPlacement', to_jsonb(v_attempt.mastered_by_placement)
  );
end;
$$;

revoke all on function public.commit_placement_result(
  uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb, text, text[], numeric, text, text
) from public, anon, authenticated;

grant execute on function public.commit_placement_result(
  uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb, text, text[], numeric, text, text
) to service_role;

comment on function public.commit_placement_result(
  uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb, text, text[], numeric, text, text
) is
  'Persiste placement recalculado pelo Edge commit-placement. Somente service_role.';

commit;
