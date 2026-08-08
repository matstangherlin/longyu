-- LGPD: a exclusão do usuário deve apagar dados pessoais antes que FKs com
-- ON DELETE SET NULL os transformem em registros órfãos não rastreáveis.
-- O trigger participa da mesma transação do hard delete em auth.users: qualquer
-- falha aborta a exclusão inteira, em vez de deixar uma remoção parcial.

create or replace function public.erase_account_personal_data_before_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_hash text;
begin
  if old.email is not null then
    v_email_hash := pg_catalog.encode(
      extensions.digest(pg_catalog.lower(old.email), 'sha256'),
      'hex'
    );
  end if;

  delete from public.beta_feedback
  where user_id = old.id;

  delete from public.beta_pedagogy_events
  where user_id = old.id;

  -- Bloqueios por hash deixam de ser vinculáveis ao e-mail que pediu exclusão.
  delete from public.referral_email_blocks
  where first_invitee_id = old.id
     or (v_email_hash is not null and email_hash = v_email_hash);

  -- O histórico financeiro mínimo é mantido para reconciliação, sem vínculo
  -- com a conta, IDs de objetos Stripe ou payloads que possam conter PII.
  update public.transactions
  set user_id = null,
      stripe_checkout_session_id = null,
      stripe_payment_intent_id = null,
      stripe_invoice_id = null,
      stripe_subscription_id = null,
      metadata = '{"retentionPurpose":"billing_reconciliation"}'::jsonb
  where user_id = old.id;

  return old;
end;
$$;

revoke all on function public.erase_account_personal_data_before_auth_delete() from public;
revoke all on function public.erase_account_personal_data_before_auth_delete() from anon, authenticated;

drop trigger if exists longyu_erase_personal_data_before_auth_delete on auth.users;
create trigger longyu_erase_personal_data_before_auth_delete
before delete on auth.users
for each row
execute function public.erase_account_personal_data_before_auth_delete();

comment on function public.erase_account_personal_data_before_auth_delete() is
  'Apaga feedback, telemetria e hashes de referral e anonimiza o ledger financeiro antes do hard delete de auth.users.';
