-- Hardening de beta_pedagogy_events / submit_beta_pedagogy_event
-- Rate limit, whitelist de metadata, tamanhos, identidade anônima complementar,
-- retenção 90 dias. Não armazena IP.

-- ---------------------------------------------------------------------------
-- Colunas auxiliares (sem IP)
-- ---------------------------------------------------------------------------

alter table public.beta_pedagogy_events
  add column if not exists client_context_digest text,
  add column if not exists rate_bucket_key text;

comment on column public.beta_pedagogy_events.client_context_digest is
  'Hash curto do user-agent resumido + dia UTC (sem IP). Ajuda rate limit anônimo.';
comment on column public.beta_pedagogy_events.rate_bucket_key is
  'Chave de rate limit do dia (perfil/user + digest). Rotaciona diariamente.';

create index if not exists beta_pedagogy_events_user_created_idx
  on public.beta_pedagogy_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists beta_pedagogy_events_local_created_idx
  on public.beta_pedagogy_events (local_profile_id, created_at desc)
  where local_profile_id is not null;

create index if not exists beta_pedagogy_events_digest_created_idx
  on public.beta_pedagogy_events (client_context_digest, created_at desc)
  where client_context_digest is not null;

create index if not exists beta_pedagogy_events_bucket_created_idx
  on public.beta_pedagogy_events (rate_bucket_key, created_at desc)
  where rate_bucket_key is not null;

create index if not exists beta_pedagogy_events_type_lesson_created_idx
  on public.beta_pedagogy_events (event_type, lesson_id, created_at desc);

-- Sessão anônima opcional (token opaco; só hash no banco; rotaciona ~24h)
create table if not exists public.beta_pedagogy_anon_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_context_digest text not null,
  day_bucket date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  last_seen_at timestamptz not null default now(),
  constraint beta_pedagogy_anon_sessions_digest_len check (
    char_length(client_context_digest) between 8 and 64
  )
);

create index if not exists beta_pedagogy_anon_sessions_expires_idx
  on public.beta_pedagogy_anon_sessions (expires_at);

alter table public.beta_pedagogy_anon_sessions enable row level security;
-- Sem policies de select/insert para roles comuns: só via RPCs security definer.

-- Métricas agregadas (sobrevivem à limpeza de eventos brutos)
create table if not exists public.beta_pedagogy_daily_metrics (
  day date not null,
  event_type text not null,
  lesson_id text not null default '',
  event_count integer not null default 0,
  primary key (day, event_type, lesson_id)
);

alter table public.beta_pedagogy_daily_metrics enable row level security;

create policy "beta_pedagogy_daily_metrics_select_admin"
  on public.beta_pedagogy_daily_metrics
  for select
  to authenticated
  using (public.is_beta_admin());

-- ---------------------------------------------------------------------------
-- Helpers: digest / identity match (md5 nativo; sem IP)
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_context_digest(p_client_context text)
returns text
language plpgsql
stable
as $$
declare
  v_raw text := nullif(left(trim(coalesce(p_client_context, '')), 120), '');
  v_day text := ((timezone('utc', now()))::date)::text;
begin
  if v_raw is null then
    return null;
  end if;
  -- Rotação diária UTC: o mesmo UA vira bucket novo a cada dia.
  return md5(v_raw || '|longyu-pedagogy|' || v_day);
end;
$$;

revoke all on function public.beta_pedagogy_context_digest(text) from public;

create or replace function public.beta_pedagogy_rate_bucket_key(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text
)
returns text
language sql
stable
as $$
  select left(
    md5(
      coalesce(p_user_id::text, '') || '|' ||
      coalesce(nullif(trim(coalesce(p_local_profile_id, '')), ''), '') || '|' ||
      coalesce(p_context_digest, '') || '|' ||
      ((timezone('utc', now()))::date)::text
    ),
    32
  );
$$;

revoke all on function public.beta_pedagogy_rate_bucket_key(uuid, text, text) from public;

create or replace function public.beta_pedagogy_identity_match(
  p_row_user_id uuid,
  p_row_local text,
  p_row_digest text,
  p_row_bucket text,
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text,
  p_bucket text
)
returns boolean
language sql
immutable
as $$
  select
    (p_user_id is not null and p_row_user_id = p_user_id)
    or (
      p_user_id is null and p_local_profile_id is not null
      and p_row_local is not null and p_row_local = p_local_profile_id
    )
    or (
      p_user_id is null and p_context_digest is not null
      and p_row_digest is not null and p_row_digest = p_context_digest
    )
    or (
      p_bucket is not null and p_row_bucket is not null and p_row_bucket = p_bucket
    );
$$;

revoke all on function public.beta_pedagogy_identity_match(
  uuid, text, text, text, uuid, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- 1) Rate limit geral
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_event_rate_limited(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_digest text := nullif(trim(coalesce(p_context_digest, '')), '');
  v_bucket text := public.beta_pedagogy_rate_bucket_key(p_user_id, v_local, v_digest);
  v_minute_limit integer := case when p_user_id is not null then 120 else 60 end;
  v_day_limit integer := case when p_user_id is not null then 3000 else 1000 end;
  recent_minute integer;
  recent_day integer;
  digest_minute integer;
  digest_day integer;
begin
  select count(*) into recent_minute
  from public.beta_pedagogy_events e
  where e.created_at > now() - interval '60 seconds'
    and public.beta_pedagogy_identity_match(
      e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
      p_user_id, v_local, v_digest, v_bucket
    );

  if recent_minute >= v_minute_limit then
    return true;
  end if;

  select count(*) into recent_day
  from public.beta_pedagogy_events e
  where e.created_at > now() - interval '1 day'
    and public.beta_pedagogy_identity_match(
      e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
      p_user_id, v_local, v_digest, v_bucket
    );

  if recent_day >= v_day_limit then
    return true;
  end if;

  -- Anônimo: limite extra só pelo digest (mitiga troca de local_profile_id).
  if p_user_id is null and v_digest is not null then
    select count(*) into digest_minute
    from public.beta_pedagogy_events e
    where e.created_at > now() - interval '60 seconds'
      and e.client_context_digest = v_digest;

    if digest_minute >= 60 then
      return true;
    end if;

    select count(*) into digest_day
    from public.beta_pedagogy_events e
    where e.created_at > now() - interval '1 day'
      and e.client_context_digest = v_digest;

    if digest_day >= 1000 then
      return true;
    end if;
  end if;

  return false;
end;
$$;

revoke all on function public.beta_pedagogy_event_rate_limited(uuid, text, text) from public;
grant execute on function public.beta_pedagogy_event_rate_limited(uuid, text, text) to authenticated, anon;

-- Compat: assinatura (uuid, text) pedida no brief
create or replace function public.beta_pedagogy_event_rate_limited(
  p_user_id uuid,
  p_local_profile_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.beta_pedagogy_event_rate_limited(p_user_id, p_local_profile_id, null::text);
$$;

revoke all on function public.beta_pedagogy_event_rate_limited(uuid, text) from public;
grant execute on function public.beta_pedagogy_event_rate_limited(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2) Rate limit por tipo de evento
-- ---------------------------------------------------------------------------

create or replace function public.beta_pedagogy_event_type_rate_limited(
  p_user_id uuid,
  p_local_profile_id text,
  p_context_digest text,
  p_event_type text,
  p_lesson_id text,
  p_scene_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_digest text := nullif(trim(coalesce(p_context_digest, '')), '');
  v_bucket text := public.beta_pedagogy_rate_bucket_key(p_user_id, v_local, v_digest);
  v_lesson text := nullif(trim(coalesce(p_lesson_id, '')), '');
  v_scene text := nullif(trim(coalesce(p_scene_id, '')), '');
  v_count integer;
begin
  if p_event_type = 'lesson_started' and v_lesson is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'lesson_started'
      and e.lesson_id = v_lesson
      and e.created_at > now() - interval '60 seconds'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 5;
  end if;

  if p_event_type = 'exercise_answered' then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'exercise_answered'
      and e.created_at > now() - interval '60 seconds'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 30;
  end if;

  if p_event_type = 'lesson_completed' and v_lesson is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'lesson_completed'
      and e.lesson_id = v_lesson
      and e.created_at > now() - interval '1 hour'
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 3;
  end if;

  if p_event_type = 'conversation_completed' and v_scene is not null then
    select count(*) into v_count
    from public.beta_pedagogy_events e
    where e.event_type = 'conversation_completed'
      and e.created_at > now() - interval '1 hour'
      and e.metadata->>'sceneId' = v_scene
      and public.beta_pedagogy_identity_match(
        e.user_id, e.local_profile_id, e.client_context_digest, e.rate_bucket_key,
        p_user_id, v_local, v_digest, v_bucket
      );
    return v_count >= 10;
  end if;

  return false;
end;
$$;

revoke all on function public.beta_pedagogy_event_type_rate_limited(
  uuid, text, text, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- 3) Whitelist de metadata (só escalares; sem objetos aninhados)
-- ---------------------------------------------------------------------------

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
    when 'lesson_completed' then array['appVersion', 'stars', 'reason']
    when 'lesson_abandoned' then array['appVersion', 'reason']
    when 'exercise_answered' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode'
    ]
    when 'exercise_mistake' then array[
      'appVersion', 'correct', 'attempt', 'stage', 'responseTimeBucket',
      'imageId', 'imageChoiceMode', 'mode'
    ]
    when 'exercise_skipped' then array['appVersion', 'stage']
    when 'conversation_shown' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel'
    ]
    when 'conversation_completed' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'conversation_repeated' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'conversation_error' then array[
      'appVersion', 'sceneId', 'intent', 'variantLevel', 'mistakes', 'repeated'
    ]
    when 'image_exercise_answered' then array[
      'appVersion', 'imageId', 'mode', 'correct', 'imageChoiceMode'
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
      -- objeto/array aninhado: descartar
      continue;
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.sanitize_pedagogy_metadata(text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- Sessão anônima (opcional)
-- ---------------------------------------------------------------------------

create or replace function public.issue_beta_pedagogy_anon_session(
  p_client_context text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digest text := public.beta_pedagogy_context_digest(p_client_context);
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_hash text := md5(v_token);
  recent integer;
begin
  if auth.uid() is not null then
    raise exception 'anon_session_for_anonymous_only';
  end if;

  if v_digest is null then
    raise exception 'client_context_required';
  end if;

  select count(*) into recent
  from public.beta_pedagogy_anon_sessions s
  where s.client_context_digest = v_digest
    and s.created_at > now() - interval '10 minutes';

  if recent >= 3 then
    raise exception 'rate_limited';
  end if;

  insert into public.beta_pedagogy_anon_sessions (
    token_hash, client_context_digest, day_bucket
  ) values (
    v_hash, v_digest, (timezone('utc', now()))::date
  );

  return v_token;
end;
$$;

revoke all on function public.issue_beta_pedagogy_anon_session(text) from public;
grant execute on function public.issue_beta_pedagogy_anon_session(text) to anon;

create or replace function public.beta_pedagogy_touch_anon_session(
  p_token text,
  p_context_digest text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_ok boolean := false;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    return false;
  end if;

  v_hash := md5(trim(p_token));

  update public.beta_pedagogy_anon_sessions s
  set last_seen_at = now()
  where s.token_hash = v_hash
    and s.expires_at > now()
    and (p_context_digest is null or s.client_context_digest = p_context_digest)
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.beta_pedagogy_touch_anon_session(text, text) from public;

-- ---------------------------------------------------------------------------
-- 6) Retenção: agregar + apagar brutos > 90 dias; limpar sessões
-- ---------------------------------------------------------------------------

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
  -- Sem grant a anon/authenticated: executar no SQL Editor / cron (owner/service_role).

  insert into public.beta_pedagogy_daily_metrics as m (day, event_type, lesson_id, event_count)
  select
    (timezone('utc', e.created_at))::date as day,
    e.event_type,
    coalesce(e.lesson_id, ''),
    count(*)::integer
  from public.beta_pedagogy_events e
  where e.created_at < v_cutoff
  group by 1, 2, 3
  on conflict (day, event_type, lesson_id)
  do update set event_count = m.event_count + excluded.event_count;

  delete from public.beta_pedagogy_events
  where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.beta_pedagogy_anon_sessions
  where expires_at < now() - interval '7 days';

  return v_deleted;
end;
$$;

revoke all on function public.cleanup_beta_pedagogy_events(integer) from public;
-- Sem grant a anon/authenticated: rodar no SQL Editor / cron service_role.

comment on function public.cleanup_beta_pedagogy_events(integer) is
  'Agrega eventos brutos em beta_pedagogy_daily_metrics e apaga brutos além de N dias (default 90). Feedback manual não é tocado.';

-- ---------------------------------------------------------------------------
-- RPC principal (substitui overload anterior)
-- ---------------------------------------------------------------------------

drop function if exists public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
);

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
  v_route text := left(coalesce(p_route, ''), 300);
  v_lesson text := nullif(left(coalesce(p_lesson_id, ''), 120), '');
  v_kind text := nullif(left(coalesce(p_exercise_kind, ''), 80), '');
  v_scene text;
  v_dedupe text := nullif(left(trim(coalesce(p_client_dedupe_key, '')), 200), '');
  v_session_ok boolean := false;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  -- Anônimo: pedimos contexto (UA resumido) para rate limit complementar.
  -- Ainda aceita sem contexto na beta, mas o digest_limit só aplica com digest.
  if v_uid is null and nullif(trim(coalesce(p_anon_session_token, '')), '') is not null then
    v_session_ok := public.beta_pedagogy_touch_anon_session(p_anon_session_token, v_digest);
    if not v_session_ok then
      raise exception 'invalid_anon_session';
    end if;
  end if;

  if v_uid is not null then
    select coalesce(p.pedagogy_analytics_consent, false)
      into v_consent
    from public.profiles p
    where p.id = v_uid;

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
  v_bucket := public.beta_pedagogy_rate_bucket_key(v_uid, v_local, v_digest);

  if v_dedupe is not null then
    select id into v_id
    from public.beta_pedagogy_events
    where client_dedupe_key = v_dedupe
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if public.beta_pedagogy_event_rate_limited(v_uid, v_local, v_digest) then
    raise exception 'rate_limited';
  end if;

  if public.beta_pedagogy_event_type_rate_limited(
    v_uid, v_local, v_digest, v_type, v_lesson, v_scene
  ) then
    raise exception 'event_rate_limited';
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
    rate_bucket_key
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
    v_bucket
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) from public;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) to authenticated, anon;

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text, text, text
) is
  'Insere evento pedagógico com consent (auth), rate limit, whitelist de metadata e digest anônimo (sem IP).';
