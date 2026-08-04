-- Perfil próprio via RPC (SECURITY DEFINER): evita falha de RLS no upsert
-- quando o cliente tem sessão mas políticas de INSERT/UPDATE/SELECT
-- interagem mal com on conflict (ex.: pós-confirmação / login).

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
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.profiles as p (
    id,
    name,
    birth_date,
    country,
    signup_source,
    marketing_opt_in,
    onboarding_completed,
    native_language,
    target_language,
    updated_at
  )
  values (
    uid,
    coalesce(nullif(trim(p_name), ''), 'Aluno Longyu'),
    p_birth_date,
    nullif(trim(coalesce(p_country, '')), ''),
    nullif(trim(coalesce(p_signup_source, '')), ''),
    coalesce(p_marketing_opt_in, false),
    coalesce(p_onboarding_completed, true),
    'pt-BR',
    'zh-CN',
    now()
  )
  on conflict (id) do update set
    name = coalesce(nullif(trim(excluded.name), ''), p.name),
    birth_date = coalesce(excluded.birth_date, p.birth_date),
    country = coalesce(excluded.country, p.country),
    signup_source = coalesce(excluded.signup_source, p.signup_source),
    marketing_opt_in = coalesce(p_marketing_opt_in, p.marketing_opt_in),
    onboarding_completed = coalesce(p_onboarding_completed, p.onboarding_completed),
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.ensure_own_profile(text, date, text, text, boolean, boolean) from public;
grant execute on function public.ensure_own_profile(text, date, text, text, boolean, boolean) to authenticated;

comment on function public.ensure_own_profile(text, date, text, text, boolean, boolean) is
  'Upsert do perfil do usuário autenticado (security definer). Usado no login/pós-confirmação.';
