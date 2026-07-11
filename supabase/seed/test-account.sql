-- Conta de QA interna: teste@longyu.app
-- Pro ativo sem Stripe + perfil e progresso alinhados.
-- Idempotente: pode rodar várias vezes.

-- 1) Assinatura Pro interna (sem pagamento)
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

-- 2) Perfil com onboarding concluído
update public.profiles p
set
  name = coalesce(nullif(p.name, ''), 'Conta Teste Longyu'),
  onboarding_completed = true,
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('teste@longyu.app');
