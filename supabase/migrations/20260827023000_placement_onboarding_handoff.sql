-- V4.7.1 — Placement handoff autoritativo + identidade de locale.
-- Staging only. Do not apply to production without human review.

begin;

alter table public.profiles
  add column if not exists interface_locale text not null default 'pt-BR',
  add column if not exists instruction_locale text not null default 'pt-BR',
  add column if not exists country_code text;

update public.profiles
set country_code = 'BR'
where country_code is null
  and (country is null or country ilike 'brasil' or country ilike 'brazil' or country = 'BR');

comment on column public.profiles.interface_locale is
  'Idioma da interface. Independente de country.';
comment on column public.profiles.instruction_locale is
  'Lingua usada para ensinar. Independente de interface_locale e country.';
comment on column public.profiles.native_language is
  'Lingua principal do aluno.';
comment on column public.profiles.target_language is
  'Idioma estudado (zh-CN no lancamento).';
comment on column public.profiles.country_code is
  'ISO 3166-1 alpha-2. Nao derivar locale a partir deste campo.';

create table if not exists public.placement_onboarding_drafts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  placement_version integer not null,
  declared_experience text not null,
  goal text,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint placement_drafts_version_positive check (placement_version > 0),
  constraint placement_drafts_experience_check check (
    declared_experience in ('zero', 'words', 'studied', 'phrases', 'advanced')
  )
);

alter table public.placement_onboarding_drafts enable row level security;

revoke all on table public.placement_onboarding_drafts from public, anon, authenticated;
grant all on table public.placement_onboarding_drafts to service_role;

comment on table public.placement_onboarding_drafts is
  'Evidencia Placement V2 pos-signup. Nao e Placement final. Somente service_role.';

create or replace function public.save_placement_onboarding_draft(
  p_user_id uuid,
  p_placement_version integer,
  p_declared_experience text,
  p_goal text,
  p_answers jsonb,
  p_ttl_hours integer default 168
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'not authorized';
  end if;
  if exists (
    select 1 from public.profiles
    where id = p_user_id and onboarding_completed = true
  ) then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_onboarded');
  end if;

  insert into public.placement_onboarding_drafts (
    user_id,
    placement_version,
    declared_experience,
    goal,
    answers,
    created_at,
    expires_at,
    consumed_at
  ) values (
    p_user_id,
    p_placement_version,
    p_declared_experience,
    nullif(trim(coalesce(p_goal, '')), ''),
    coalesce(p_answers, '[]'::jsonb),
    now(),
    now() + make_interval(hours => greatest(coalesce(p_ttl_hours, 168), 1)),
    null
  )
  on conflict (user_id) do update
  set
    placement_version = excluded.placement_version,
    declared_experience = excluded.declared_experience,
    goal = excluded.goal,
    answers = excluded.answers,
    created_at = now(),
    expires_at = excluded.expires_at,
    consumed_at = null;

  return jsonb_build_object('ok', true, 'skipped', false);
end;
$$;

revoke all on function public.save_placement_onboarding_draft(uuid, integer, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.save_placement_onboarding_draft(uuid, integer, text, text, jsonb, integer)
  to service_role;

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

  -- Ja onboarded: nao cria segundo attempt / XP / mastery.
  if exists (
    select 1 from public.profiles
    where id = p_user_id and onboarding_completed = true
  ) then
    if p_idempotency_key is not null then
      select * into v_attempt
      from public.placement_attempts
      where user_id = p_user_id
        and idempotency_key = p_idempotency_key
      limit 1;
    end if;
    if v_attempt.id is null then
      select * into v_attempt
      from public.placement_attempts
      where user_id = p_user_id
      order by completed_at desc
      limit 1;
    end if;
    if v_attempt.id is null then
      raise exception 'placement_attempt_missing';
    end if;
    delete from public.placement_onboarding_drafts where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'alreadyCompleted', true,
      'attemptId', v_attempt.id,
      'recommendedLessonId', v_attempt.recommended_lesson_id,
      'masteredByPlacement', to_jsonb(v_attempt.mastered_by_placement)
    );
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
      interface_locale,
      instruction_locale,
      native_language,
      target_language,
      updated_at
    ) values (
      p_user_id,
      'Aluno Longyu',
      false,
      2,
      'pt-BR',
      'pt-BR',
      'pt-BR',
      'zh-CN',
      now()
    )
    on conflict (id) do nothing;

    begin
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
    exception
      when unique_violation then
        select * into v_attempt
        from public.placement_attempts
        where user_id = p_user_id
          and idempotency_key = p_idempotency_key
        limit 1;
    end;
  end if;

  if v_attempt.id is null then
    raise exception 'placement_attempt_missing';
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

  update public.placement_onboarding_drafts
  set consumed_at = now()
  where user_id = p_user_id
    and consumed_at is null;

  delete from public.placement_onboarding_drafts
  where user_id = p_user_id;

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

-- ensure_own_profile never flips onboarding_completed to true.
create or replace function public.ensure_own_profile(
  p_name text default null,
  p_birth_date date default null,
  p_country text default null,
  p_signup_source text default null,
  p_marketing_opt_in boolean default null,
  p_onboarding_completed boolean default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
  v_country_code text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_country_code := case
    when p_country is null or btrim(p_country) = '' then null
    when length(btrim(p_country)) = 2 then upper(btrim(p_country))
    when lower(btrim(p_country)) in ('brasil', 'brazil') then 'BR'
    else null
  end;

  insert into public.profiles as p (
    id,
    name,
    birth_date,
    country,
    country_code,
    signup_source,
    marketing_opt_in,
    onboarding_completed,
    native_language,
    target_language,
    interface_locale,
    instruction_locale,
    updated_at
  )
  values (
    uid,
    coalesce(nullif(trim(p_name), ''), 'Aluno Longyu'),
    p_birth_date,
    nullif(trim(coalesce(p_country, '')), ''),
    v_country_code,
    nullif(trim(coalesce(p_signup_source, '')), ''),
    coalesce(p_marketing_opt_in, false),
    false,
    'pt-BR',
    'zh-CN',
    'pt-BR',
    'pt-BR',
    now()
  )
  on conflict (id) do update set
    name = coalesce(nullif(trim(excluded.name), ''), p.name),
    birth_date = coalesce(excluded.birth_date, p.birth_date),
    country = coalesce(excluded.country, p.country),
    country_code = coalesce(excluded.country_code, p.country_code),
    signup_source = coalesce(excluded.signup_source, p.signup_source),
    marketing_opt_in = coalesce(p_marketing_opt_in, p.marketing_opt_in),
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

comment on function public.ensure_own_profile(text, date, text, text, boolean, boolean) is
  'Upsert do perfil autenticado. Nao marca onboarding_completed; isso so o commit de placement faz.';

commit;
