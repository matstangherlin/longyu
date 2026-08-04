-- Corrige apply_subscription_event: GET DIAGNOSTICS row_count é integer,
-- não boolean. A versão anterior quebrava o ramo updated/deleted sem user_id
-- (boolean > integer).

create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  if p_subscription_id is null then
    return jsonb_build_object('ok', false, 'applied', false, 'reason', 'missing_subscription_id');
  end if;

  if p_user_id is null then
    update public.subscriptions s
    set
      stripe_customer_id = coalesce(p_customer_id, s.stripe_customer_id),
      status = p_status,
      price_id = coalesce(p_price_id, s.price_id),
      current_period_start = coalesce(p_current_period_start, s.current_period_start),
      current_period_end = coalesce(p_current_period_end, s.current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
      stripe_event_created = p_event_created,
      updated_at = now()
    where s.stripe_subscription_id = p_subscription_id
      and (s.stripe_event_created is null or p_event_created >= s.stripe_event_created);
    get diagnostics v_row_count = row_count;
    return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
      case when v_row_count > 0 then 'updated' else 'stale_or_missing' end);
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    stripe_event_created, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_status, p_price_id,
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created, now()
  )
  on conflict (stripe_subscription_id) do update set
    user_id = coalesce(excluded.user_id, public.subscriptions.user_id),
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    status = excluded.status,
    price_id = coalesce(excluded.price_id, public.subscriptions.price_id),
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_created = excluded.stripe_event_created,
    updated_at = now()
  where public.subscriptions.stripe_event_created is null
     or excluded.stripe_event_created >= public.subscriptions.stripe_event_created;

  get diagnostics v_row_count = row_count;
  return jsonb_build_object('ok', true, 'applied', v_row_count > 0, 'reason',
    case when v_row_count > 0 then 'upserted' else 'stale' end);
end;
$$;

revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) from public;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
) to service_role;
