-- Trusted anonymous ingestion capabilities for beta feedback and pedagogy events.
-- Anonymous rate limits must never depend only on identifiers supplied by the browser.

begin;

create table if not exists public.beta_anon_ingestion_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  rate_bucket_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  last_seen_at timestamptz not null default now(),
  constraint beta_anon_ingestion_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint beta_anon_ingestion_rate_bucket_check
    check (rate_bucket_key ~ '^[0-9a-f]{64}$')
);

create index if not exists beta_anon_ingestion_sessions_bucket_idx
  on public.beta_anon_ingestion_sessions (rate_bucket_key, created_at desc);

create index if not exists beta_anon_ingestion_sessions_expiry_idx
  on public.beta_anon_ingestion_sessions (expires_at);

alter table public.beta_anon_ingestion_sessions enable row level security;

create table if not exists public.beta_anon_ingestion_quota_counters (
  rate_bucket_key text not null,
  quota_scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  primary key (rate_bucket_key, quota_scope, window_started_at),
  constraint beta_anon_ingestion_quota_bucket_check
    check (rate_bucket_key = '__global__' or rate_bucket_key ~ '^[0-9a-f]{64}$'),
  constraint beta_anon_ingestion_quota_scope_check
    check (char_length(quota_scope) between 1 and 100),
  constraint beta_anon_ingestion_quota_count_check
    check (request_count >= 0)
);

create index if not exists beta_anon_ingestion_quota_expiry_idx
  on public.beta_anon_ingestion_quota_counters (expires_at);

alter table public.beta_anon_ingestion_quota_counters enable row level security;

alter table public.beta_feedback
  add column if not exists anon_session_id uuid
    references public.beta_anon_ingestion_sessions(id) on delete set null,
  add column if not exists rate_bucket_key text;

create index if not exists beta_feedback_anon_session_idx
  on public.beta_feedback (anon_session_id, created_at desc)
  where anon_session_id is not null;

create index if not exists beta_feedback_rate_bucket_idx
  on public.beta_feedback (rate_bucket_key, created_at desc)
  where rate_bucket_key is not null;

alter table public.beta_pedagogy_events
  add column if not exists anon_session_id uuid
    references public.beta_anon_ingestion_sessions(id) on delete set null;

create index if not exists beta_pedagogy_events_anon_session_idx
  on public.beta_pedagogy_events (anon_session_id, created_at desc)
  where anon_session_id is not null;

comment on table public.beta_anon_ingestion_sessions is
  'Bearer capabilities emitted only by the trusted Edge Function. Stores no raw IP.';
comment on column public.beta_anon_ingestion_sessions.rate_bucket_key is
  'Daily HMAC bucket derived from trusted edge network metadata; not reversible without the server secret.';
comment on table public.beta_anon_ingestion_quota_counters is
  'Atomic per-origin and global anonymous ingestion counters.';

-- Atomically consumes both an origin quota and its global ceiling. An exception
-- rolls back both increments, so parallel requests cannot race past the limit.
create or replace function public.beta_anon_consume_ingestion_quota(
  p_rate_bucket_key text,
  p_scope text,
  p_window_seconds integer,
  p_origin_limit integer,
  p_global_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket text := pg_catalog.lower(trim(coalesce(p_rate_bucket_key, '')));
  v_scope text := pg_catalog.left(trim(coalesce(p_scope, '')), 100);
  v_window timestamptz;
  v_expires timestamptz;
  v_count integer;
begin
  if v_bucket !~ '^[0-9a-f]{64}$'
     or v_scope = ''
     or p_window_seconds < 1
     or p_origin_limit < 1
     or p_global_limit < p_origin_limit then
    raise exception 'invalid_quota_configuration';
  end if;

  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(
      extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds
    ) * p_window_seconds
  );
  v_expires := v_window + pg_catalog.make_interval(secs => p_window_seconds * 2);

  insert into public.beta_anon_ingestion_quota_counters as counters (
    rate_bucket_key, quota_scope, window_started_at, request_count, expires_at
  ) values (
    v_bucket, v_scope, v_window, 1, v_expires
  )
  on conflict (rate_bucket_key, quota_scope, window_started_at)
  do update set
    request_count = counters.request_count + 1,
    expires_at = greatest(counters.expires_at, excluded.expires_at)
  where counters.request_count < p_origin_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'rate_limited';
  end if;

  v_count := null;
  insert into public.beta_anon_ingestion_quota_counters as counters (
    rate_bucket_key, quota_scope, window_started_at, request_count, expires_at
  ) values (
    '__global__', v_scope, v_window, 1, v_expires
  )
  on conflict (rate_bucket_key, quota_scope, window_started_at)
  do update set
    request_count = counters.request_count + 1,
    expires_at = greatest(counters.expires_at, excluded.expires_at)
  where counters.request_count < p_global_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'global_rate_limited';
  end if;
end;
$$;

revoke all on function public.beta_anon_consume_ingestion_quota(
  text, text, integer, integer, integer
) from public, anon, authenticated;

-- Called by the Edge Function with service_role after it derives an HMAC bucket
-- from the trusted proxy IP. Browser-controlled IDs never reach this argument.
create or replace function public.issue_beta_anon_ingestion_session(
  p_rate_bucket_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket text := pg_catalog.lower(trim(coalesce(p_rate_bucket_key, '')));
  v_token text := pg_catalog.replace(
    pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text,
    '-',
    ''
  );
begin
  if v_bucket !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_bucket';
  end if;

  perform public.beta_anon_consume_ingestion_quota(
    v_bucket, 'session_hour', 3600, 3, 500
  );
  perform public.beta_anon_consume_ingestion_quota(
    v_bucket, 'session_day', 86400, 6, 5000
  );

  insert into public.beta_anon_ingestion_sessions (
    token_hash, rate_bucket_key
  ) values (
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_bucket
  );

  return v_token;
end;
$$;

revoke all on function public.issue_beta_anon_ingestion_session(text)
  from public, anon, authenticated;
grant execute on function public.issue_beta_anon_ingestion_session(text) to service_role;

create or replace function public.beta_anon_resolve_ingestion_session(
  p_token text
)
returns table (session_id uuid, rate_bucket_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := trim(coalesce(p_token, ''));
begin
  if pg_catalog.length(v_token) <> 64 then
    raise exception 'invalid_anon_session';
  end if;

  return query
  update public.beta_anon_ingestion_sessions as sessions
  set last_seen_at = pg_catalog.now()
  where sessions.token_hash = pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex')
    and sessions.expires_at > pg_catalog.now()
  returning sessions.id, sessions.rate_bucket_key;

  if not found then
    raise exception 'invalid_anon_session';
  end if;
end;
$$;

revoke all on function public.beta_anon_resolve_ingestion_session(text)
  from public, anon, authenticated;

create or replace function public.beta_submit_feedback_core(
  p_category text,
  p_message text,
  p_route text,
  p_lesson_id text,
  p_exercise_kind text,
  p_exercise_index integer,
  p_app_version text,
  p_browser text,
  p_viewport text,
  p_local_profile_id text,
  p_client_dedupe_key text,
  p_anon_session_id uuid,
  p_trusted_rate_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(
    pg_catalog.left(trim(coalesce(p_local_profile_id, '')), 80),
    ''
  );
  v_dedupe text := nullif(
    pg_catalog.left(trim(coalesce(p_client_dedupe_key, '')), 220),
    ''
  );
  v_id uuid;
  v_msg text := trim(coalesce(p_message, ''));
  v_cat text := trim(coalesce(p_category, ''));
begin
  if v_uid is null and (v_local is null or p_anon_session_id is null) then
    raise exception 'anon_session_required';
  end if;

  if v_cat not in (
    'erro_conteudo', 'traducao', 'pinyin', 'audio', 'imagem',
    'exercicio_confuso', 'erro_tecnico', 'sugestao', 'outro'
  ) then
    raise exception 'invalid_category';
  end if;

  if char_length(v_msg) < 3 or char_length(v_msg) > 4000 then
    raise exception 'invalid_message';
  end if;

  if v_msg ~* '(password|senha|token|apikey|api_key|service_role|localStorage|supabase)' then
    raise exception 'forbidden_content';
  end if;

  if v_dedupe is not null then
    select feedback.id into v_id
    from public.beta_feedback as feedback
    where feedback.client_dedupe_key = v_dedupe
      and (
        (v_uid is not null and feedback.user_id = v_uid)
        or (
          v_uid is null
          and feedback.anon_session_id = p_anon_session_id
        )
      )
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_uid is null then
    perform public.beta_anon_consume_ingestion_quota(
      p_trusted_rate_key, 'feedback_minute', 60, 1, 60
    );
    perform public.beta_anon_consume_ingestion_quota(
      p_trusted_rate_key, 'feedback_hour', 3600, 8, 1000
    );
  elsif public.beta_feedback_rate_limited(v_uid, null) then
    raise exception 'rate_limited';
  end if;

  insert into public.beta_feedback (
    user_id,
    local_profile_id,
    category,
    message,
    route,
    lesson_id,
    exercise_kind,
    exercise_index,
    app_version,
    browser,
    viewport,
    status,
    client_dedupe_key,
    anon_session_id,
    rate_bucket_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_cat,
    v_msg,
    pg_catalog.left(coalesce(p_route, ''), 300),
    nullif(pg_catalog.left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(pg_catalog.left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    pg_catalog.left(coalesce(p_app_version, ''), 40),
    pg_catalog.left(coalesce(p_browser, ''), 240),
    pg_catalog.left(coalesce(p_viewport, ''), 40),
    'new',
    v_dedupe,
    case when v_uid is null then p_anon_session_id else null end,
    case when v_uid is null then p_trusted_rate_key else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.beta_submit_feedback_core(
  text, text, text, text, text, integer, text, text, text, text, text, uuid, text
) from public, anon, authenticated;

-- Legacy signature stays available only to authenticated users. This closes the
-- direct anonymous path that trusted only local_profile_id.
create or replace function public.submit_beta_feedback(
  p_category text,
  p_message text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_app_version text default '',
  p_browser text default '',
  p_viewport text default '',
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'anon_session_required';
  end if;

  return public.beta_submit_feedback_core(
    p_category, p_message, p_route, p_lesson_id, p_exercise_kind,
    p_exercise_index, p_app_version, p_browser, p_viewport,
    p_local_profile_id, p_client_dedupe_key, null, null
  );
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) to authenticated;

-- Token-aware signature used by the current client. Authenticated users may pass
-- NULL because their JWT is already a trusted identity.
create or replace function public.submit_beta_feedback(
  p_category text,
  p_message text,
  p_anon_session_token text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_app_version text default '',
  p_browser text default '',
  p_viewport text default '',
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_rate_bucket text;
begin
  if auth.uid() is null then
    if nullif(trim(coalesce(p_anon_session_token, '')), '') is null then
      raise exception 'anon_session_required';
    end if;

    select resolved.session_id, resolved.rate_bucket_key
      into v_session_id, v_rate_bucket
    from public.beta_anon_resolve_ingestion_session(p_anon_session_token) as resolved;
  end if;

  return public.beta_submit_feedback_core(
    p_category, p_message, p_route, p_lesson_id, p_exercise_kind,
    p_exercise_index, p_app_version, p_browser, p_viewport,
    p_local_profile_id, p_client_dedupe_key, v_session_id, v_rate_bucket
  );
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, text, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, text, integer, text, text, text, text, text
) to anon, authenticated;

-- Replace the pedagogy endpoint in place: existing authenticated clients remain
-- compatible, while anonymous calls now require the trusted Edge capability.
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
    'image_exercise_answered',
    'lesson_abandoned'
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
      when v_type like 'conversation_%' then 30
      else 60
    end;
    v_type_day_limit := case
      when v_type in ('lesson_started', 'lesson_completed', 'lesson_abandoned') then 250
      when v_type like 'conversation_%' then 600
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

-- The legacy browser-controlled issuer is no longer an anonymous endpoint.
revoke execute on function public.issue_beta_pedagogy_anon_session(text)
  from public, anon, authenticated;

create or replace function public.cleanup_beta_pedagogy_events(
  p_retain_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_retain_days, 1));
  v_deleted integer := 0;
begin
  insert into public.beta_pedagogy_daily_metrics as metrics (
    day, event_type, lesson_id, event_count
  )
  select
    (timezone('utc', events.created_at))::date,
    events.event_type,
    coalesce(events.lesson_id, ''),
    count(*)::integer
  from public.beta_pedagogy_events as events
  where events.created_at < v_cutoff
  group by 1, 2, 3
  on conflict (day, event_type, lesson_id)
  do update set event_count = metrics.event_count + excluded.event_count;

  delete from public.beta_pedagogy_events where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.beta_pedagogy_anon_sessions
  where expires_at < now() - interval '7 days';

  delete from public.beta_anon_ingestion_sessions
  where expires_at < now() - interval '7 days';

  delete from public.beta_anon_ingestion_quota_counters
  where expires_at < now() - interval '1 day';

  return v_deleted;
end;
$$;

revoke all on function public.cleanup_beta_pedagogy_events(integer)
  from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
