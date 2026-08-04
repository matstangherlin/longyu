-- Signup abuse controls for Edge Function create-account.
-- Rate limits persist in Postgres (não dependem de memória da Edge).

create table if not exists public.signup_rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists signup_rate_events_bucket_created_idx
  on public.signup_rate_events (bucket, created_at desc);

alter table public.signup_rate_events enable row level security;
-- Sem policies para authenticated/anon: só service_role (bypass RLS).

create or replace function public.check_and_record_signup_rate(
  p_ip_hash text,
  p_email_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_bucket text;
  email_bucket text;
  combo_bucket text;
  ip_15 int;
  ip_24h int;
  email_1h int;
  combo_15 int;
begin
  if p_ip_hash is null or length(trim(p_ip_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_ip');
  end if;
  if p_email_hash is null or length(trim(p_email_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_email');
  end if;

  ip_bucket := 'ip:' || trim(p_ip_hash);
  email_bucket := 'email:' || trim(p_email_hash);
  combo_bucket := 'combo:' || trim(p_ip_hash) || ':' || trim(p_email_hash);

  select count(*) into ip_15
  from public.signup_rate_events
  where bucket = ip_bucket and created_at > now() - interval '15 minutes';

  if ip_15 >= 5 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_15m');
  end if;

  select count(*) into ip_24h
  from public.signup_rate_events
  where bucket = ip_bucket and created_at > now() - interval '24 hours';

  if ip_24h >= 15 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_24h');
  end if;

  select count(*) into email_1h
  from public.signup_rate_events
  where bucket = email_bucket and created_at > now() - interval '1 hour';

  if email_1h >= 3 then
    return jsonb_build_object('allowed', false, 'reason', 'email_1h');
  end if;

  select count(*) into combo_15
  from public.signup_rate_events
  where bucket = combo_bucket and created_at > now() - interval '15 minutes';

  if combo_15 >= 2 then
    return jsonb_build_object('allowed', false, 'reason', 'combo_15m');
  end if;

  insert into public.signup_rate_events (bucket)
  values (ip_bucket), (email_bucket), (combo_bucket);

  -- Limpeza leve de eventos antigos (mantém a tabela pequena).
  delete from public.signup_rate_events
  where created_at < now() - interval '48 hours';

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_and_record_signup_rate(text, text) from public;
grant execute on function public.check_and_record_signup_rate(text, text) to service_role;
-- Somente service_role (Edge create-account). Sem grant a anon/authenticated.

comment on function public.check_and_record_signup_rate(text, text) is
  'Rate limit de cadastro: IP 5/15m + 15/24h; email 3/1h; combo 2/15m. Só service_role.';

-- Limpeza cuidadosa de contas nunca confirmadas (dry-run por padrão).
create or replace function public.admin_cleanup_unconfirmed_signups(
  p_older_than interval default interval '14 days',
  p_dry_run boolean default true,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ids uuid[];
  v_count int := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    p_limit := 100;
  end if;

  select coalesce(array_agg(u.id), '{}') into v_ids
  from (
    select u.id
    from auth.users u
    left join public.user_progress up on up.user_id = u.id
    left join public.subscriptions s on s.user_id = u.id
    left join public.referrals r on r.invitee_id = u.id or r.inviter_id = u.id
    where u.email_confirmed_at is null
      and u.created_at < now() - p_older_than
      and coalesce(array_length(up.completed_lessons, 1), 0) = 0
      and s.user_id is null
      and r.id is null
    order by u.created_at asc
    limit p_limit
  ) u;

  v_count := coalesce(array_length(v_ids, 1), 0);

  if p_dry_run or v_count = 0 then
    return jsonb_build_object(
      'ok', true,
      'dry_run', p_dry_run,
      'eligible', v_count,
      'deleted', 0,
      'ids', to_jsonb(v_ids)
    );
  end if;

  delete from auth.users where id = any(v_ids);

  return jsonb_build_object(
    'ok', true,
    'dry_run', false,
    'eligible', v_count,
    'deleted', v_count,
    'ids', to_jsonb(v_ids)
  );
end;
$$;

revoke all on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) from public;
grant execute on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) to service_role;

comment on function public.admin_cleanup_unconfirmed_signups(interval, boolean, integer) is
  'Remove contas não confirmadas antigas sem progresso/assinatura/referral. Dry-run default. Só service_role.';
