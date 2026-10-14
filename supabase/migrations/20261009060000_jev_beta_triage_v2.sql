-- JEV Wave 2 — additive columns for advisory beta triage (feedback-v2).
-- Does NOT enable learner Jev. Original message stays; Jev sees sanitized copy only.
-- Apply only with owner migration gate / backup policy. No destructive changes.

alter table public.beta_feedback
  add column if not exists ai_policy_version text,
  add column if not exists ai_input_hash text,
  add column if not exists ai_p_candidate text,
  add column if not exists ai_human_review_required boolean,
  add column if not exists ai_kind_confidence real,
  add column if not exists ai_area_confidence real,
  add column if not exists ai_severity_confidence real,
  add column if not exists ai_cluster_suggestion text,
  add column if not exists ai_cluster_confidence real,
  add column if not exists ai_override_reason text,
  add column if not exists ai_status text;

comment on column public.beta_feedback.ai_severity is
  'Raw Jev severity score 0–3 (advisory). Never treat as P0–P3; use ai_p_candidate.';
comment on column public.beta_feedback.ai_p_candidate is
  'Mapped P0–P3 candidate from severity mapper + security overrides. Human must confirm P0/P1.';
comment on column public.beta_feedback.ai_policy_version is
  'Classification policy id, e.g. feedback-v2.';

alter table public.beta_feedback
  drop constraint if exists beta_feedback_ai_p_candidate_check;
alter table public.beta_feedback
  add constraint beta_feedback_ai_p_candidate_check
  check (ai_p_candidate is null or ai_p_candidate in ('P0', 'P1', 'P2', 'P3'));

alter table public.beta_feedback
  drop constraint if exists beta_feedback_ai_status_check;
alter table public.beta_feedback
  add constraint beta_feedback_ai_status_check
  check (ai_status is null or ai_status in ('PENDING_AI_TRIAGE', 'AI_SUGGESTED', 'HUMAN_CONFIRMED', 'DISMISSED'));

create index if not exists beta_feedback_ai_review_idx
  on public.beta_feedback (ai_human_review_required, created_at desc)
  where ai_human_review_required is true;

create index if not exists beta_feedback_ai_p_candidate_idx
  on public.beta_feedback (ai_p_candidate, created_at desc)
  where ai_p_candidate in ('P0', 'P1');

-- Persistent daily Jev ops counters (Edge service_role only). No learner text.
create table if not exists public.jev_ops_daily (
  day date primary key,
  evaluations integer not null default 0,
  reused integer not null default 0,
  failures integer not null default 0,
  cluster_evals integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.jev_ops_daily enable row level security;

revoke all on table public.jev_ops_daily from public, anon, authenticated;
grant select, insert, update on table public.jev_ops_daily to service_role;

comment on table public.jev_ops_daily is
  'Aggregate Jev beta-ops usage per UTC day. No feedback body or PII.';
