-- Idempotência de webhooks Stripe e proteção contra eventos fora de ordem.

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

alter table public.subscriptions
  add column if not exists last_stripe_event_created bigint not null default 0;

create index if not exists subscriptions_last_stripe_event_idx
  on public.subscriptions (last_stripe_event_created);
