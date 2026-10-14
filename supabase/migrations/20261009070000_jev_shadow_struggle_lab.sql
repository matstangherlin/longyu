-- JEV Wave 3 — Shadow Struggle Lab research store (additive).
-- No learner runtime. No PII. Service role only. Apply only with owner gate.

create table if not exists public.jev_shadow_struggle_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  policy_version text not null default 'shadow-struggle-v1',
  input_hash text not null,
  candidate_set text[] not null,
  deterministic_choice text not null,
  jev_choice text,
  jev_confidence real,
  abstained boolean not null default false,
  should_intervene_noul real,
  model text,
  learner_outcome text,
  applied_to_learner boolean not null default false,
  reused boolean not null default false,
  cost_units real not null default 0,
  constraint jev_shadow_applied_false check (applied_to_learner = false),
  constraint jev_shadow_outcome_check check (
    learner_outcome is null or learner_outcome in (
      'succeeded_naturally', 'needed_help', 'abandoned', 'repeated_error', 'completed_lesson', 'unknown'
    )
  )
);

create index if not exists jev_shadow_struggle_hash_idx
  on public.jev_shadow_struggle_events (input_hash, created_at desc);

comment on table public.jev_shadow_struggle_events is
  'JEV Wave 3 shadow struggle research rows. Structured signals only. Never drives learner UX.';

alter table public.jev_shadow_struggle_events enable row level security;

revoke all on table public.jev_shadow_struggle_events from public, anon, authenticated;
grant select, insert, update on table public.jev_shadow_struggle_events to service_role;
