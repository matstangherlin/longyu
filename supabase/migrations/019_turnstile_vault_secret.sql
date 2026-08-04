-- Turnstile secret lookup for Edge create-account (service_role only).
-- O valor do secret NÃO fica neste arquivo — inserir via Vault:
--   select vault.create_secret('<secret>', 'TURNSTILE_SECRET_KEY', 'Cloudflare Turnstile');
-- Preferencialmente também: supabase secrets set TURNSTILE_SECRET_KEY=...

create or replace function public._edge_get_turnstile_secret()
returns text
language sql
security definer
set search_path = vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'TURNSTILE_SECRET_KEY'
  limit 1;
$$;

revoke all on function public._edge_get_turnstile_secret() from public;
grant execute on function public._edge_get_turnstile_secret() to service_role;

comment on function public._edge_get_turnstile_secret() is
  'Retorna secret Turnstile do Vault para a Edge create-account. Só service_role.';
