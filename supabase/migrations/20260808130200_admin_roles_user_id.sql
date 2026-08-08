-- Admin passa a ser só beta_admins(user_id). Pro de QA deixa de depender de
-- short-circuit por e-mail nas RPCs e usa a assinatura interna já seedada.

begin;

-- Operadores conhecidos → tabela de papéis por user_id (se a conta existir).
insert into public.beta_admins (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) in (
  'admin@longyu.app',
  'matheus.stangherlin@hotmail.com',
  'minemoostraa@gmail.com'
)
on conflict (user_id) do update
set email = excluded.email;

-- QA nunca é admin.
delete from public.beta_admins a
using auth.users u
where a.user_id = u.id
  and lower(u.email) = 'teste@longyu.app';

create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.beta_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_beta_admin() from public;
grant execute on function public.is_beta_admin() to authenticated;

-- Pro: Stripe ativo OU grant ativo. Sem short-circuit por e-mail.
create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_pro boolean := false;
  v_source text := 'none';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none');
  end if;

  if public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'stripe';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'grant';
  end if;

  return jsonb_build_object('ok', true, 'is_pro', v_is_pro, 'source', v_source);
end;
$$;

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._user_stripe_pro_active(p_user_id)
      or public.user_has_entitlement_grant(p_user_id);
$$;

revoke all on function public.get_server_entitlement() from public;
grant execute on function public.get_server_entitlement() to authenticated;

revoke all on function public.economy_user_is_pro(uuid) from public;
grant execute on function public.economy_user_is_pro(uuid) to authenticated;

-- Garante a assinatura interna da conta QA (resolve e-mail → user_id uma vez).
insert into public.subscriptions (
  user_id,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  updated_at
)
select
  u.id,
  'active',
  'internal_test_longyu_pro',
  now(),
  '2030-01-01T00:00:00+00'::timestamptz,
  false,
  now()
from auth.users u
where lower(u.email) = lower('teste@longyu.app')
on conflict (stripe_subscription_id) do update
set
  user_id = excluded.user_id,
  status = 'active',
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = false,
  updated_at = now();

commit;
