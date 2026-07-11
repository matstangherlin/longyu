-- Contas internas de QA com Pro sem Stripe.
-- Mantém a regra de produção: preview local não libera Pro; só servidor.

create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) in ('teste@longyu.app')
  )
  or exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke all on function public.economy_user_is_pro(uuid) from public;
grant execute on function public.economy_user_is_pro(uuid) to authenticated;
