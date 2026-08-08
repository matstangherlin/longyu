-- Executar somente depois da migration erase_account_personal_data.
-- Cria um usuário sintético, prova a limpeza transacional e remove o único
-- lançamento financeiro anonimizado ao final. Se qualquer assert falhar, o DO
-- inteiro é revertido automaticamente pelo PostgreSQL.
do $$
declare
  test_user_id uuid := gen_random_uuid();
  test_email text := 'delete-smoke-' || gen_random_uuid()::text || '@longyu.invalid';
  test_email_hash text;
  test_event_id text := 'evt_delete_smoke_' || gen_random_uuid()::text;
  transaction_row public.transactions%rowtype;
begin
  test_email_hash := encode(extensions.digest(lower(test_email), 'sha256'), 'hex');

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    test_user_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', test_email, crypt('x', gen_salt('bf')), now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

  insert into public.profiles (id, name, onboarding_completed)
  values (test_user_id, 'Delete smoke', true)
  on conflict (id) do nothing;

  insert into public.beta_feedback (user_id, category, message, route)
  values (test_user_id, 'outro', 'Synthetic account deletion smoke feedback.', '/smoke');

  insert into public.beta_pedagogy_events (user_id, event_type, route, metadata)
  values (test_user_id, 'lesson_started', '/smoke', '{"synthetic":true}'::jsonb);

  insert into public.referral_email_blocks (email_hash, first_invitee_id)
  values (test_email_hash, test_user_id);

  insert into public.transactions (
    user_id, stripe_event_id, stripe_checkout_session_id, stripe_payment_intent_id,
    stripe_invoice_id, stripe_subscription_id, kind, amount, currency, status, metadata
  ) values (
    test_user_id, test_event_id, 'cs_pii', 'pi_pii', 'in_pii', 'sub_pii',
    'subscription_payment', 100, 'brl', 'paid', '{"customer_email":"pii@longyu.invalid"}'::jsonb
  );

  delete from auth.users where id = test_user_id;

  if exists (select 1 from auth.users where id = test_user_id)
     or exists (select 1 from public.beta_feedback where user_id = test_user_id)
     or exists (select 1 from public.beta_pedagogy_events where user_id = test_user_id)
     or exists (select 1 from public.referral_email_blocks where email_hash = test_email_hash) then
    raise exception 'account deletion left personal rows behind';
  end if;

  select * into strict transaction_row
  from public.transactions
  where stripe_event_id = test_event_id;

  if transaction_row.user_id is not null
     or transaction_row.stripe_checkout_session_id is not null
     or transaction_row.stripe_payment_intent_id is not null
     or transaction_row.stripe_invoice_id is not null
     or transaction_row.stripe_subscription_id is not null
     or transaction_row.metadata <> '{"retentionPurpose":"billing_reconciliation"}'::jsonb then
    raise exception 'financial row was not irreversibly anonymized';
  end if;

  delete from public.transactions where stripe_event_id = test_event_id;
  raise notice 'account deletion smoke passed for synthetic user %', test_user_id;
end;
$$;
