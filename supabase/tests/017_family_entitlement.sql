-- Smoke do entitlement Family, após 20260914210000_family_entitlement.sql.
--
-- Roda em transação e dá rollback. Exige o schema real: ele usa uma assinatura
-- de verdade em public.subscriptions, e não um stub de _user_stripe_pro_active,
-- porque a pergunta do teste é exatamente "quem paga?".
--
-- O que ele prova: participar de família paga dá Pro com origem
-- family_membership; o dono continua sendo reportado como assinante
-- individual; quem está de fora não ganha nada; a economia enxerga o mesmo Pro
-- que a tela; e o acesso do membro cai na hora quando a assinatura do dono
-- deixa de valer ou quando a participação é removida — sem job e sem cache.

begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_fam uuid;
  v_sub uuid;
  v_ent jsonb;
begin
  insert into auth.users (id) values (v_owner), (v_member), (v_outsider);
  insert into public.profiles (id, name)
    values (v_owner, 'Dona'), (v_member, 'Membro'), (v_outsider, 'De fora')
    on conflict do nothing;

  insert into public.subscriptions (user_id, status, current_period_end)
    values (v_owner, 'active', now() + interval '30 days')
    returning id into v_sub;

  insert into public.family_accounts (owner_user_id, subscription_id, status)
    values (v_owner, v_sub, 'active') returning id into v_fam;
  insert into public.family_memberships (family_id, user_id, role, status, joined_at)
    values (v_fam, v_owner, 'owner', 'active', now()), (v_fam, v_member, 'member', 'active', now());

  perform set_config('longyu.test_uid', v_member::text, true);
  v_ent := public.get_server_entitlement();
  if (v_ent->>'is_pro')::boolean is not true or v_ent->>'source' <> 'family_membership' then
    raise exception 'membro de familia paga precisa ser Pro por family_membership; obtido % / %',
      v_ent->>'is_pro', v_ent->>'source';
  end if;
  if v_ent->>'family_id' is null then
    raise exception 'entitlement nao devolveu a familia';
  end if;
  if not public.economy_user_is_pro(v_member) then
    raise exception 'economia nao enxerga o membro como Pro: bonus sumiriam sem explicacao';
  end if;

  perform set_config('longyu.test_uid', v_owner::text, true);
  v_ent := public.get_server_entitlement();
  if v_ent->>'source' <> 'individual_subscription' then
    raise exception 'quem paga a propria conta e assinante individual; obtido %', v_ent->>'source';
  end if;

  perform set_config('longyu.test_uid', v_outsider::text, true);
  v_ent := public.get_server_entitlement();
  if (v_ent->>'is_pro')::boolean is not false then
    raise exception 'quem nao participa da familia nao pode ganhar acesso';
  end if;

  -- A assinatura do dono vence: o acesso dos membros cai na proxima chamada.
  update public.subscriptions set status = 'canceled', current_period_end = now() - interval '1 day'
  where id = v_sub;
  perform set_config('longyu.test_uid', v_member::text, true);
  v_ent := public.get_server_entitlement();
  if (v_ent->>'is_pro')::boolean is not false then
    raise exception 'assinatura do dono caiu e o membro continuou Pro';
  end if;
  if public.economy_user_is_pro(v_member) then
    raise exception 'economia continuou tratando o membro como Pro';
  end if;

  -- Volta a valer, mas a participacao e removida.
  update public.subscriptions set status = 'active', current_period_end = now() + interval '30 days'
  where id = v_sub;
  v_ent := public.get_server_entitlement();
  if (v_ent->>'is_pro')::boolean is not true then
    raise exception 'assinatura voltou e o membro nao recuperou o acesso';
  end if;
  update public.family_memberships set status = 'removed'
  where family_id = v_fam and user_id = v_member;
  v_ent := public.get_server_entitlement();
  if (v_ent->>'is_pro')::boolean is not false then
    raise exception 'membro removido continuou com acesso';
  end if;

  raise notice 'OK 017_family_entitlement: family_membership concede, dono segue individual, queda de assinatura e remocao cortam na hora.';
end $$;

rollback;
