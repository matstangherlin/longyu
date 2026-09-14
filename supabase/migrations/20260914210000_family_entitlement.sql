-- V4.10A.1 — a participação em Family passa a valer acesso, no servidor.
--
-- Até aqui o plano Family existia inteiro menos a parte que importa: aceitar o
-- convite criava a participação e não dava Pro a ninguém. get_server_entitlement()
-- conhecia organização, assinatura individual, grant interno e pérola — família,
-- não. O membro entrava numa família paga e continuava no plano grátis.
--
-- A regra de quando a família concede acesso é explícita: a família está ativa
-- E quem paga continua pagando. Se a assinatura do dono cair, o acesso dos
-- membros cai junto, sem job, sem cron e sem cache — a próxima chamada já
-- responde a verdade.
--
-- A ordem das origens segue o resolvedor central de src/commercial/entitlements.ts:
-- organização, assinatura individual, família, pérola, grant interno. Aqui e lá
-- precisam concordar, senão a tela nomeia uma origem e o servidor outra.

begin;

/**
 * Participação que concede acesso, ou nada.
 *
 * Devolve linha só quando a família está ativa e o dono está pagando (Stripe
 * ativo/trialing) ou tem grant explícito — o caso do piloto contratado.
 *
 * Não usa economy_user_is_pro de propósito: aquela função vai passar a
 * considerar família, e a recursão entre as duas seria um laço infinito na
 * primeira família cujo dono é membro de outra.
 */
create or replace function public._user_family_entitlement(p_user_id uuid)
returns table (family_id uuid, family_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, m.role
  from public.family_memberships m
  join public.family_accounts f on f.id = m.family_id
  where m.user_id = p_user_id
    and m.status = 'active'
    and f.status = 'active'
    and (
      public._user_stripe_pro_active(f.owner_user_id)
      or public.user_has_entitlement_grant(f.owner_user_id)
    )
  limit 1;
$$;

comment on function public._user_family_entitlement(uuid) is
  'Participação Family que concede acesso: família ativa e dono pagando. Interna — o cliente lê por get_server_entitlement().';

revoke all on function public._user_family_entitlement(uuid) from public, anon, authenticated;
grant execute on function public._user_family_entitlement(uuid) to service_role;

/**
 * Entitlement do servidor, agora com família.
 *
 * Duas mudanças em relação à V4.4.1: o ramo family_membership entra depois da
 * assinatura individual (quem paga a própria conta é reportado como tal,
 * mesmo participando de uma família), e pérola passa a vir antes de grant
 * interno, para bater com a precedência declarada no resolvedor central.
 * Nenhuma das duas altera QUEM tem acesso; alteram o nome da origem, que é
 * justamente o que a tela mostra e o suporte lê.
 */
create or replace function public.get_server_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_pro boolean := false;
  v_source text := 'none';
  v_tier text := 'free';
  v_org_id uuid;
  v_org_role text;
  v_org_access text;
  v_family_id uuid;
  v_family_role text;
  v_pearl_expires timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'is_pro', false,
      'tier', 'free',
      'source', 'none',
      'organization_id', null,
      'organization_role', null,
      'family_id', null,
      'pearl_pro_expires_at', null
    );
  end if;

  select e.pearl_pro_expires_at into v_pearl_expires
  from public.user_economy e
  where e.user_id = v_uid;

  select org.organization_id, org.organization_role, org.tier, org.access_source
    into v_org_id, v_org_role, v_tier, v_org_access
  from public._user_organization_entitlement(v_uid) org;

  select fam.family_id, fam.family_role
    into v_family_id, v_family_role
  from public._user_family_entitlement(v_uid) fam;

  if v_org_id is not null then
    v_is_pro := true;
    v_source := 'organization';
  elsif public._user_stripe_pro_active(v_uid) then
    v_is_pro := true;
    v_source := 'individual_subscription';
    v_tier := 'pro';
  elsif v_family_id is not null then
    v_is_pro := true;
    v_source := 'family_membership';
    v_tier := 'pro';
  elsif v_pearl_expires is not null and v_pearl_expires > now() then
    v_is_pro := true;
    v_source := 'pearl';
    v_tier := 'pro';
  elsif public.user_has_entitlement_grant(v_uid) then
    v_is_pro := true;
    v_source := 'internal';
    v_tier := 'pro';
  else
    v_tier := 'free';
  end if;

  return jsonb_build_object(
    'ok', true,
    'is_pro', v_is_pro,
    'tier', v_tier,
    'source', v_source,
    'organization_id', v_org_id,
    'organization_role', v_org_role,
    'organization_access_source', v_org_access,
    'family_id', v_family_id,
    'family_role', v_family_role,
    'pearl_pro_expires_at', v_pearl_expires
  );
end;
$$;

revoke all on function public.get_server_entitlement() from public, anon;
grant execute on function public.get_server_entitlement() to authenticated;

comment on function public.get_server_entitlement() is
  'Entitlement: is_pro + tier + source. Organização, assinatura, família, pérola e grant interno, nessa ordem.';

/**
 * A economia precisa enxergar o mesmo Pro que a tela.
 *
 * Sem isto, o membro de família recebe as telas do Pro e as funções de
 * recompensa continuam tratando ele como grátis — a inconsistência aparece
 * como bônus faltando, no lugar mais difícil de diagnosticar.
 */
create or replace function public.economy_user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._user_stripe_pro_active(p_user_id)
      or public.user_has_entitlement_grant(p_user_id)
      or exists (select 1 from public._user_organization_entitlement(p_user_id))
      or exists (select 1 from public._user_family_entitlement(p_user_id));
$$;

revoke all on function public.economy_user_is_pro(uuid) from public, anon, authenticated;
grant execute on function public.economy_user_is_pro(uuid) to service_role;

commit;
