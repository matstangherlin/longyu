-- Beta Experience Hardening: amplia whitelist de metadados pedagógicos e
-- aceita eventos que o app já emitia (pós-conversa) + unrecognized_answer.
-- Metadados usam wallClockMs / toneHintUses / audioManualPlays (nomes honestos).
-- Sem texto de resposta livre — só enums, contagens e hash SHA-256 da forma.

create or replace function public.sanitize_pedagogy_metadata(
  p_event_type text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_text text;
  v_num numeric;
begin
  if jsonb_typeof(v_in) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  v_allowed := case p_event_type
    when 'lesson_started' then array['appVersion']
    when 'lesson_completed' then array[
      'appVersion', 'stars', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays',
      'folegoSkips', 'stepIndex', 'mistakes'
    ]
    when 'lesson_abandoned' then array[
      'appVersion', 'reason', 'wallClockMs', 'activeMs', 'toneHintUses', 'audioManualPlays', 'stepIndex'
    ]
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence',
      'unrecognized', 'answerNormHash', 'answerLen', 'hasCjk'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode', 'diagnosis', 'diagnosisConfidence'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage', 'via']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated',
      'attempts', 'result'
    ]
    when 'post_conversation_shown' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount'
    ]
    when 'post_conversation_completed' then array[
      'appVersion', 'sceneId', 'taskType', 'taskIndex', 'taskCount', 'correct'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
    ]
    when 'unrecognized_answer' then array[
      'appVersion', 'answerNormHash', 'answerLen', 'expectedLen', 'hasCjk'
    ]
    else array['appVersion']
  end;

  for v_key, v_val in select key, value from jsonb_each(v_in)
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if jsonb_typeof(v_val) = 'string' then
      v_text := left(coalesce(v_val #>> '{}', ''), 80);
      v_out := v_out || jsonb_build_object(v_key, v_text);
    elsif jsonb_typeof(v_val) = 'number' then
      v_num := (v_val #>> '{}')::numeric;
      if v_num > 1e12 or v_num < -1e12 then
        continue;
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_num);
    elsif jsonb_typeof(v_val) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (v_val #>> '{}')::boolean);
    elsif jsonb_typeof(v_val) = 'null' then
      continue;
    else
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

-- Espelha a submit de 20260808081000 com allowlist ampliada (pós-conversa +
-- unrecognized_answer). Mantém quotas, colunas e assinaturas de rate-limit.
create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null,
  p_client_context text default null,
  p_anon_session_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(left(trim(coalesce(p_local_profile_id, '')), 80), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb;
  v_consent boolean;
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_bucket text;
  v_trusted_bucket text;
  v_session_id uuid;
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_type_minute_limit integer;
  v_type_day_limit integer;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_uid is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_trusted_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  else
    select coalesce(profiles.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles as profiles
    where profiles.id = v_uid;

    if v_consent is not true then
      raise exception 'consent_required';
    end if;
  end if;

  if v_type not in (
    'lesson_started',
    'lesson_completed',
    'exercise_answered',
    'exercise_mistake',
    'exercise_skipped',
    'conversation_shown',
    'conversation_completed',
    'conversation_repeated',
    'conversation_error',
    'post_conversation_shown',
    'post_conversation_completed',
    'image_exercise_answered',
    'lesson_abandoned',
    'unrecognized_answer'
  ) then
    raise exception 'invalid_event_type';
  end if;

  if p_metadata is not null and octet_length(p_metadata::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_meta := public.sanitize_pedagogy_metadata(v_type, coalesce(p_metadata, '{}'::jsonb));

  if octet_length(v_meta::text) > 2048 then
    raise exception 'payload_too_large';
  end if;

  v_scene := nullif(left(coalesce(v_meta->>'sceneId', ''), 80), '');
  v_bucket := case
    when v_uid is null then v_trusted_bucket
    else public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest)
  end;

  if v_dedupe is not null then
    select events.id into v_id
    from public.beta_pedagogy_events as events
    where events.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and events.user_id = v_uid)
        or (v_uid is null and events.anon_session_id = v_session_id)
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_minute', 60, 60, 600
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket, 'pedagogy_day', 86400, 1000, 100000
    );

    v_type_minute_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 15
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 30
      when v_type = 'unrecognized_answer' then 30
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' or v_type like 'post_conversation_%' then 600
      when v_type = 'unrecognized_answer' then 400
      else 1000
    end;

    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_minute:' || v_type,
      60,
      v_type_minute_limit,
      v_type_minute_limit * 1000
    );
    perform public.beta_anon_consume_ingestion_quota(
      v_trusted_bucket,
      'pedagogy_type_day:' || v_type,
      86400,
      v_type_day_limit,
      v_type_day_limit * 1000
    );
  else
    if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
      raise exception 'rate_limited';
    end if;

    if public.beta_pedagogy_event_type_rate_limited(
      v_uid, v_local, v_digest, v_type, v_lesson, v_scene
    ) then
      raise exception 'event_rate_limited';
    end if;
  end if;

  insert into public.beta_pedagogy_events (
    user_id,
    local_profile_id,
    event_type,
    lesson_id,
    exercise_kind,
    exercise_index,
    route,
    metadata,
    client_dedupe_key,
    client_context_digest,
    rate_bucket_key,
    anon_session_id
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    v_lesson,
    v_kind,
    p_exercise_index,
    v_route,
    v_meta,
    v_dedupe,
    v_digest,
    v_bucket,
    case when v_uid is null then v_session_id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to anon, authenticated;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Ingere evento pedagógico do beta. Beta Experience Hardening: pós-conversa, unrecognized_answer e metadados de duração/diagnóstico.';
