-- Completa o opt-in pedagógico no servidor:
-- 1) RPC rejeita insert se o usuário autenticado não consentiu
-- 2) Allowlist de event_type alinhada ao cliente (conversation_*)
-- 3) Visão admin inclui consentimento

-- ---------------------------------------------------------------------------
-- Allowlist de tipos (alinha com PEDAGOGY_EVENT_TYPES no app)
-- ---------------------------------------------------------------------------

alter table public.beta_pedagogy_events
  drop constraint if exists beta_pedagogy_event_type_check;

alter table public.beta_pedagogy_events
  add constraint beta_pedagogy_event_type_check check (
    event_type in (
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
    )
  );

-- ---------------------------------------------------------------------------
-- RPC com gate de consentimento (usuário autenticado)
-- Anônimos com local_profile_id seguem confiando no cliente (sem perfil).
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
  v_consent boolean;
begin
  if v_uid is null and v_local is null then
    raise exception 'identity_required';
  end if;

  -- Autenticado: só grava com opt-in explícito no perfil.
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

  -- Remove chaves sensíveis se o cliente enviar por engano.
  v_meta := v_meta - array[
    'password', 'senha', 'token', 'access_token', 'refresh_token',
    'apiKey', 'api_key', 'service_role', 'localStorage', 'freeTextAnswer',
    'answerText', 'answer', 'typedAnswer', 'freeText', 'responseText', 'userInput'
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

comment on function public.submit_beta_pedagogy_event(
  text, text, text, text, integer, jsonb, text, text
) is
  'Insere evento pedagógico. Usuário autenticado exige profiles.pedagogy_analytics_consent = true.';

-- ---------------------------------------------------------------------------
-- Admin overview: colunas de consentimento
-- ---------------------------------------------------------------------------

create or replace view public.admin_user_overview
with (security_invoker = true) as
select
  u.id as user_id,
  u.email,
  u.created_at as conta_criada_em,
  u.last_sign_in_at as ultimo_login_em,
  p.name,
  p.birth_date,
  case
    when p.birth_date is not null then extract(year from age(p.birth_date::timestamp))::integer
    else null
  end as idade_aprox,
  p.country,
  p.signup_source,
  p.marketing_opt_in,
  p.pedagogy_analytics_consent,
  p.pedagogy_analytics_consented_at,
  p.pedagogy_analytics_revoked_at,
  p.onboarding_completed,
  p.native_language,
  p.target_language,
  s.status as assinatura_status,
  s.stripe_subscription_id,
  s.current_period_end as pro_valido_ate,
  s.cancel_at_period_end,
  case
    when lower(u.email) = 'teste@longyu.app' then 'pro_interno'
    when s.status = 'trialing' then 'trial'
    when s.status = 'active' then 'pro'
    when s.status = 'canceled' and s.current_period_end > now() then 'pro_cancelando'
    else 'gratuito'
  end as plano_label,
  coalesce(up.xp_total, 0) as xp_total,
  coalesce(cardinality(up.completed_lessons), 0) as licoes_concluidas,
  coalesce(up.streak, 0) as streak
from auth.users u
left join public.profiles p on p.id = u.id
left join lateral (
  select status, stripe_subscription_id, current_period_end, cancel_at_period_end
  from public.subscriptions
  where user_id = u.id
  order by updated_at desc
  limit 1
) s on true
left join public.user_progress up on up.user_id = u.id
order by u.created_at desc;

revoke all on public.admin_user_overview from anon, authenticated;
revoke all on public.admin_user_overview from public;
