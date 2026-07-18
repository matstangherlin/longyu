-- Beta feedback + eventos pedagógicos (Longyu beta).
-- Inserção via RPCs com rate-limit; usuário só lê o próprio feedback;
-- status/admin_note só via is_beta_admin().

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------

create table if not exists public.beta_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.beta_admins enable row level security;

create policy "beta_admins_select_self"
  on public.beta_admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.beta_admins a
    where a.user_id = auth.uid()
  )
  or exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) in (
        'teste@longyu.app',
        'admin@longyu.app',
        'matheus.stangherlin@hotmail.com',
        'minemoostraa@gmail.com'
      )
  );
$$;

revoke all on function public.is_beta_admin() from public;
grant execute on function public.is_beta_admin() to authenticated, anon;

-- Seed operacional (idempotente): promove e-mails internos se a conta existir.
insert into public.beta_admins (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) in (
  'teste@longyu.app',
  'admin@longyu.app',
  'matheus.stangherlin@hotmail.com',
  'minemoostraa@gmail.com'
)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_profile_id text,
  category text not null,
  message text not null,
  route text not null default '',
  lesson_id text,
  exercise_kind text,
  exercise_index integer,
  app_version text not null default '',
  browser text not null default '',
  viewport text not null default '',
  created_at timestamptz not null default now(),
  status text not null default 'new',
  admin_note text,
  client_dedupe_key text,
  constraint beta_feedback_category_check check (
    category in (
      'erro_conteudo',
      'traducao',
      'pinyin',
      'audio',
      'imagem',
      'exercicio_confuso',
      'erro_tecnico',
      'sugestao',
      'outro'
    )
  ),
  constraint beta_feedback_status_check check (
    status in ('new', 'investigating', 'resolved', 'wontfix', 'duplicate')
  ),
  constraint beta_feedback_message_len check (char_length(message) between 3 and 4000),
  constraint beta_feedback_identity_check check (
    user_id is not null or (local_profile_id is not null and length(local_profile_id) > 0)
  )
);

create unique index if not exists beta_feedback_dedupe_uidx
  on public.beta_feedback (client_dedupe_key)
  where client_dedupe_key is not null;

create index if not exists beta_feedback_created_idx
  on public.beta_feedback (created_at desc);

create index if not exists beta_feedback_status_idx
  on public.beta_feedback (status, created_at desc);

create index if not exists beta_feedback_lesson_idx
  on public.beta_feedback (lesson_id, created_at desc);

create index if not exists beta_feedback_category_idx
  on public.beta_feedback (category, created_at desc);

create index if not exists beta_feedback_user_idx
  on public.beta_feedback (user_id, created_at desc);

alter table public.beta_feedback enable row level security;

create policy "beta_feedback_select_own"
  on public.beta_feedback
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_beta_admin());

-- Inserts/updates de status passam pelas RPCs (security definer).
-- Sem policy de insert/update direto: usuário não altera status/admin_note.

-- ---------------------------------------------------------------------------
-- Pedagogy events
-- ---------------------------------------------------------------------------

create table if not exists public.beta_pedagogy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_profile_id text,
  event_type text not null,
  lesson_id text,
  exercise_kind text,
  exercise_index integer,
  route text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  client_dedupe_key text,
  constraint beta_pedagogy_event_type_check check (
    event_type in (
      'lesson_started',
      'lesson_completed',
      'exercise_answered',
      'exercise_mistake',
      'exercise_skipped',
      'conversation_completed',
      'image_exercise_answered',
      'lesson_abandoned'
    )
  )
);

create unique index if not exists beta_pedagogy_events_dedupe_uidx
  on public.beta_pedagogy_events (client_dedupe_key)
  where client_dedupe_key is not null;

create index if not exists beta_pedagogy_events_type_idx
  on public.beta_pedagogy_events (event_type, created_at desc);

create index if not exists beta_pedagogy_events_lesson_idx
  on public.beta_pedagogy_events (lesson_id, event_type, created_at desc);

alter table public.beta_pedagogy_events enable row level security;

create policy "beta_pedagogy_events_select_admin"
  on public.beta_pedagogy_events
  for select
  to authenticated
  using (public.is_beta_admin());

-- ---------------------------------------------------------------------------
-- Rate limit helper
-- ---------------------------------------------------------------------------

create or replace function public.beta_feedback_rate_limited(
  p_user_id uuid,
  p_local_profile_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  recent_minute integer;
  recent_hour integer;
begin
  select count(*) into recent_minute
  from public.beta_feedback f
  where f.created_at > now() - interval '60 seconds'
    and (
      (p_user_id is not null and f.user_id = p_user_id)
      or (p_local_profile_id is not null and f.local_profile_id = p_local_profile_id)
    );

  if recent_minute >= 1 then
    return true;
  end if;

  select count(*) into recent_hour
  from public.beta_feedback f
  where f.created_at > now() - interval '1 hour'
    and (
      (p_user_id is not null and f.user_id = p_user_id)
      or (p_local_profile_id is not null and f.local_profile_id = p_local_profile_id)
    );

  return recent_hour >= 8;
end;
$$;

revoke all on function public.beta_feedback_rate_limited(uuid, text) from public;
grant execute on function public.beta_feedback_rate_limited(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Submit feedback RPC
-- ---------------------------------------------------------------------------

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
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_id uuid;
  v_msg text := trim(coalesce(p_message, ''));
  v_cat text := trim(coalesce(p_category, ''));
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
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

  -- Nunca aceitar payloads que pareçam vazar segredos.
  if v_msg ~* '(password|senha|token|apikey|api_key|service_role|localStorage|supabase)' then
    raise exception 'forbidden_content';
  end if;

  if public.beta_feedback_rate_limited(v_uid, v_local) then
    raise exception 'rate_limited';
  end if;

  if p_client_dedupe_key is not null then
    select id into v_id
    from public.beta_feedback
    where client_dedupe_key = p_client_dedupe_key
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
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
    client_dedupe_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_cat,
    v_msg,
    left(coalesce(p_route, ''), 300),
    nullif(left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    left(coalesce(p_app_version, ''), 40),
    left(coalesce(p_browser, ''), 240),
    left(coalesce(p_viewport, ''), 40),
    'new',
    nullif(p_client_dedupe_key, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) from public;
grant execute on function public.submit_beta_feedback(
  text, text, text, text, text, integer, text, text, text, text, text
) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Pedagogy event RPC
-- ---------------------------------------------------------------------------

create or replace function public.submit_beta_pedagogy_event(
  p_event_type text,
  p_route text default '',
  p_lesson_id text default null,
  p_exercise_kind text default null,
  p_exercise_index integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_local_profile_id text default null,
  p_client_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_local text := nullif(trim(coalesce(p_local_profile_id, '')), '');
  v_id uuid;
  v_type text := trim(coalesce(p_event_type, ''));
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  if v_type not in (
    'lesson_started', 'lesson_completed', 'exercise_answered', 'exercise_mistake',
    'exercise_skipped', 'conversation_completed', 'image_exercise_answered', 'lesson_abandoned'
  ) then
    raise exception 'invalid_event_type';
  end if;

  -- Remove chaves sensíveis se o cliente enviar por engano.
  v_meta := v_meta - array[
    'password', 'senha', 'token', 'access_token', 'refresh_token',
    'apiKey', 'api_key', 'service_role', 'localStorage', 'freeTextAnswer', 'answerText'
  ];

  if p_client_dedupe_key is not null then
    select id into v_id
    from public.beta_pedagogy_events
    where client_dedupe_key = p_client_dedupe_key
    limit 1;
    if v_id is not null then
      return v_id;
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
    client_dedupe_key
  ) values (
    v_uid,
    case when v_uid is null then v_local else null end,
    v_type,
    nullif(left(coalesce(p_lesson_id, ''), 120), ''),
    nullif(left(coalesce(p_exercise_kind, ''), 80), ''),
    p_exercise_index,
    left(coalesce(p_route, ''), 300),
    v_meta,
    nullif(p_client_dedupe_key, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) from public;
grant execute on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Admin update RPC (status + note only)
-- ---------------------------------------------------------------------------

create or replace function public.update_beta_feedback_admin(
  p_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_beta_admin() then
    raise exception 'not_admin';
  end if;

  if p_status not in ('new', 'investigating', 'resolved', 'wontfix', 'duplicate') then
    raise exception 'invalid_status';
  end if;

  update public.beta_feedback
  set
    status = p_status,
    admin_note = case
      when p_admin_note is null then admin_note
      else left(trim(p_admin_note), 2000)
    end
  where id = p_id;

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.update_beta_feedback_admin(uuid, text, text) from public;
grant execute on function public.update_beta_feedback_admin(uuid, text, text) to authenticated;

comment on table public.beta_feedback is
  'Feedback beta: inserção via submit_beta_feedback; status/admin_note só admin.';
comment on table public.beta_pedagogy_events is
  'Eventos pedagógicos agregáveis; sem respostas livres.';
