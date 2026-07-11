-- RPC autoritativo de Pro: assinatura real + contas internas de QA.
-- O cliente chama com JWT; não depende de preview local.

create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_is_pro boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'is_pro', false, 'source', 'none');
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email in ('teste@longyu.app') then
    v_is_pro := true;
  elsif exists (
    select 1
    from public.subscriptions s
    where s.user_id = v_uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    v_is_pro := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'is_pro', v_is_pro,
    'source', case when v_is_pro then 'server' else 'none' end
  );
end;
$$;

revoke all on function public.get_server_entitlement() from public;
grant execute on function public.get_server_entitlement() to authenticated;

-- Garante assinatura Pro da conta de QA (idempotente).
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
