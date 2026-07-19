-- Smoke manual (SQL Editor) após aplicar 013.
-- Não grava IP. Limpa linhas de teste ao final.

do $$
declare
  v_id uuid;
  v_dup uuid;
  v_meta jsonb;
  v_token text;
begin
  -- 1) Evento válido (anônimo)
  v_id := public.submit_beta_pedagogy_event(
    'exercise_answered',
    '/test/pedagogy-hardening',
    'lesson-test-hardening',
    'image_choice',
    0,
    '{"correct": true, "attempt": 1, "stage": "practice", "responseTimeBucket": "0-2s", "password": "nope", "nested": {"x": 1}}'::jsonb,
    'hardening-local-a',
    'hardening-dedupe-1',
    'Mozilla/5.0 TestUA',
    null
  );
  if v_id is null then
    raise exception 'evento válido deve inserir';
  end if;

  select metadata into v_meta
  from public.beta_pedagogy_events where id = v_id;
  if not (v_meta ? 'correct') then
    raise exception 'whitelist mantém correct';
  end if;
  if v_meta ? 'password' then
    raise exception 'whitelist remove password';
  end if;
  if v_meta ? 'nested' then
    raise exception 'whitelist remove nested';
  end if;

  -- 2) Dedupe
  v_dup := public.submit_beta_pedagogy_event(
    'exercise_answered',
    '/test/pedagogy-hardening',
    'lesson-test-hardening',
    'image_choice',
    0,
    '{"correct": true}'::jsonb,
    'hardening-local-a',
    'hardening-dedupe-1',
    'Mozilla/5.0 TestUA',
    null
  );
  if v_dup is distinct from v_id then
    raise exception 'dedupe deve devolver o mesmo id';
  end if;

  -- 3) Payload grande
  begin
    perform public.submit_beta_pedagogy_event(
      'lesson_started',
      '/test/pedagogy-hardening',
      'lesson-test-hardening',
      null,
      null,
      jsonb_build_object('appVersion', repeat('z', 3000)),
      'hardening-local-a',
      'hardening-big-1',
      'Mozilla/5.0 TestUA',
      null
    );
    raise exception 'payload grande deveria falhar';
  exception
    when others then
      if sqlerrm not like '%payload_too_large%' then
        raise;
      end if;
  end;

  -- 4) Sessão anônima
  v_token := public.issue_beta_pedagogy_anon_session('Mozilla/5.0 TestUA');
  if v_token is null or length(v_token) <= 20 then
    raise exception 'token anônimo inválido';
  end if;

  perform public.submit_beta_pedagogy_event(
    'lesson_started',
    '/test/pedagogy-hardening',
    'lesson-test-hardening',
    null,
    null,
    '{"appVersion":"smoke"}'::jsonb,
    'hardening-local-b',
    'hardening-session-1',
    'Mozilla/5.0 TestUA',
    v_token
  );

  -- Limpeza
  delete from public.beta_pedagogy_events
  where route = '/test/pedagogy-hardening';
  delete from public.beta_pedagogy_anon_sessions
  where client_context_digest = public.beta_pedagogy_context_digest('Mozilla/5.0 TestUA');

  raise notice 'OK: smoke 013 pedagogy hardening';
end $$;
