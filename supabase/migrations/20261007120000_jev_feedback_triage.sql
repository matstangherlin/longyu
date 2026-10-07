-- Triagem automática de beta_feedback via TypeSafe Jev (System One).
-- A chave da API NÃO fica neste arquivo — inserir via Vault:
--   select vault.create_secret('<apikey>', 'TYPESAFE_API_KEY', 'TypeSafe Jev');
-- Preferencialmente também: supabase secrets set TYPESAFE_API_KEY=...

create or replace function public._edge_get_typesafe_api_key()
returns text
language sql
security definer
set search_path = vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'TYPESAFE_API_KEY'
  limit 1;
$$;

revoke all on function public._edge_get_typesafe_api_key() from public, anon, authenticated;
grant execute on function public._edge_get_typesafe_api_key() to service_role;

comment on function public._edge_get_typesafe_api_key() is
  'Retorna a API key TypeSafe (Jev) do Vault para Edge Functions. Só service_role.';

-- Colunas de triagem (escritas só pela Edge triage-feedback via service_role).
alter table public.beta_feedback
  add column if not exists ai_kind text,
  add column if not exists ai_area text,
  add column if not exists ai_severity real,
  add column if not exists ai_needs_human real,
  add column if not exists ai_confidence real,
  add column if not exists ai_model text,
  add column if not exists ai_triaged_at timestamptz;

create index if not exists beta_feedback_untriaged_idx
  on public.beta_feedback (created_at)
  where ai_triaged_at is null;
