-- Manual smoke after 20260808081000_harden_anonymous_ingestion.sql.
-- Runs in a transaction and leaves no events, feedback, sessions, or counters.

begin;

do $$
declare
  v_bucket text := repeat('a', 64);
  v_token text;
  v_event_id uuid;
  v_feedback_id uuid;
  v_meta jsonb;
begin
  -- Simulates the service_role call made by the Edge Function. The value is an
  -- HMAC bucket in production; this fixture is deliberately synthetic.
  v_token := public.issue_beta_anon_ingestion_session(v_bucket);
  if v_token is null or length(v_token) <> 64 then
    raise exception 'trusted anonymous capability was not issued';
  end if;

  v_event_id := public.submit_beta_pedagogy_event(
    p_event_type => 'exercise_answered',
    p_route => '/test/anonymous-ingestion',
    p_lesson_id => 'lesson-test-hardening',
    p_exercise_kind => 'image_choice',
    p_exercise_index => 0,
    p_metadata => '{"correct":true,"password":"blocked","nested":{"x":1}}'::jsonb,
    p_local_profile_id => 'rotatable-local-a',
    p_client_dedupe_key => 'anonymous-ingestion-event-1',
    p_client_context => 'rotatable-context-a',
    p_anon_session_token => v_token
  );

  select metadata into strict v_meta
  from public.beta_pedagogy_events
  where id = v_event_id;
  if not (v_meta ? 'correct') or v_meta ? 'password' or v_meta ? 'nested' then
    raise exception 'pedagogy metadata sanitizer regressed';
  end if;

  v_feedback_id := public.submit_beta_feedback(
    p_category => 'sugestao',
    p_message => 'Anonymous ingestion security smoke.',
    p_anon_session_token => v_token,
    p_route => '/test/anonymous-ingestion',
    p_local_profile_id => 'rotatable-local-a',
    p_client_dedupe_key => 'anonymous-ingestion-feedback-1'
  );
  if v_feedback_id is null then
    raise exception 'feedback with trusted capability was not inserted';
  end if;

  -- Rotating every browser-controlled identifier cannot evade the trusted
  -- per-origin one-per-minute feedback quota.
  begin
    perform public.submit_beta_feedback(
      p_category => 'sugestao',
      p_message => 'Rotated browser identity must still be limited.',
      p_anon_session_token => v_token,
      p_route => '/test/anonymous-ingestion-rotated',
      p_local_profile_id => 'rotatable-local-b',
      p_client_dedupe_key => 'anonymous-ingestion-feedback-2'
    );
    raise exception 'rotated local id bypassed trusted feedback quota';
  exception
    when others then
      if sqlerrm not like '%rate_limited%' then
        raise;
      end if;
  end;

  begin
    perform public.submit_beta_pedagogy_event(
      p_event_type => 'lesson_started',
      p_route => '/test/anonymous-ingestion-missing-token',
      p_local_profile_id => 'rotatable-local-c',
      p_client_context => 'rotatable-context-c',
      p_anon_session_token => null
    );
    raise exception 'anonymous event without capability was accepted';
  exception
    when others then
      if sqlerrm not like '%anon_session_required%' then
        raise;
      end if;
  end;

  raise notice 'OK: trusted anonymous ingestion smoke passed';
end;
$$;

rollback;
