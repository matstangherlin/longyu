-- Perfil expandido + visão admin para consultar usuários e plano Pro.
-- A view admin_user_overview não é exposta via API (sem grant para anon/authenticated).

alter table public.profiles
  add column if not exists country text,
  add column if not exists signup_source text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists phone text;

comment on column public.profiles.country is 'País informado no cadastro.';
comment on column public.profiles.signup_source is 'Como o usuário conheceu o Longyu.';
comment on column public.profiles.marketing_opt_in is 'Opt-in para emails de novidades/ofertas.';

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

comment on view public.admin_user_overview is
  'Visão operacional: usuários, perfil, plano e progresso. Consulte no SQL Editor do Supabase (não exposta à API pública).';

-- Consulta rápida sugerida no SQL Editor:
-- select email, name, plano_label, idade_aprox, country, xp_total, licoes_concluidas from public.admin_user_overview;
