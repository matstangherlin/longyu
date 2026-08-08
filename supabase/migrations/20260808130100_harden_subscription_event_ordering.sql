-- Ordenação composta de eventos Stripe + cancelamento terminal no mesmo segundo.

begin;

alter table public.subscriptions
  add column if not exists stripe_event_id text;

comment on column public.subscriptions.stripe_event_id is
  'Último Stripe event.id aplicado; desempata eventos com o mesmo event.created.';

drop function if exists public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint
);

create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created bigint,
  p_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions;
  v_row_count integer := 0;
  v_event_id text := nullif(trim(coalesce(p_event_id, '')), '');
  v_is_newer boolean := false;
  v_same_event boolean := false;
begin
  if p_subscription_id is null then
    return jsonb_build_object('ok', false, 'applied', false, 'reason', 'missing_subscription_id');
  end if;

  select * into v_row
  from public.subscriptions s
  where s.stripe_subscription_id = p_subscription_id
  for update;

  if found then
    v_same_event :=
      v_event_id is not null
      and v_row.stripe_event_id is not null
      and v_event_id = v_row.stripe_event_id;

    v_is_newer :=
      v_row.stripe_event_created is null
      or p_event_created > v_row.stripe_event_created
      or (
        p_event_created = v_row.stripe_event_created
        and v_event_id is not null
        and (
          v_row.stripe_event_id is null
          or v_event_id > v_row.stripe_event_id
        )
      );

    -- Idempotência: o mesmo event.id pode ser reprocessado sem mudar a ordem.
    if v_same_event then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'duplicate_event');
    end if;

    -- Cancelamento terminal no mesmo segundo: um active/trialing atrasado
    -- com created <= ao canceled persistido não pode ressuscitar Pro.
    if v_row.status = 'canceled'
       and coalesce(p_status, '') is distinct from 'canceled'
       and p_event_created <= coalesce(v_row.stripe_event_created, -1) then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'terminal_canceled');
    end if;

    if not v_is_newer then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'stale');
    end if;
  end if;

  if p_user_id is null then
    if not found then
      return jsonb_build_object('ok', true, 'applied', false, 'reason', 'stale_or_missing');
    end if;

    update public.subscriptions s
    set
      stripe_customer_id = coalesce(p_customer_id, s.stripe_customer_id),
      status = p_status,
      price_id = coalesce(p_price_id, s.price_id),
      current_period_start = coalesce(p_current_period_start, s.current_period_start),
      current_period_end = coalesce(p_current_period_end, s.current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
      stripe_event_created = p_event_created,
      stripe_event_id = coalesce(v_event_id, s.stripe_event_id),
      updated_at = now()
    where s.stripe_subscription_id = p_subscription_id;

    get diagnostics v_row_count = row_count;
    return jsonb_build_object(
      'ok', true,
      'applied', v_row_count > 0,
      'reason', case when v_row_count > 0 then 'updated' else 'stale_or_missing' end
    );
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    stripe_event_created, stripe_event_id, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_status, p_price_id,
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created, v_event_id, now()
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
    stripe_event_id = coalesce(excluded.stripe_event_id, public.subscriptions.stripe_event_id),
    updated_at = now();

  get diagnostics v_row_count = row_count;
  return jsonb_build_object(
    'ok', true,
    'applied', v_row_count > 0,
    'reason', case when v_row_count > 0 then 'upserted' else 'stale' end
  );
end;
$$;

revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text
) from public;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text
) to service_role;

commit;
