-- V4.10A.1 — Business: reserva de assento, colunas que faltavam e RPCs seguras.
--
-- Nenhuma tabela nova. A auditoria do P0 mostrou que organizations,
-- organization_members, organization_invites, organization_subscriptions,
-- os grants e o entitlement já existem desde a V4.4. Aqui só se corrige o que
-- estava errado e se expõe o que o painel precisa ler.
--
-- Três decisões estruturam o arquivo:
--
-- 1. seat_limit NÃO volta para organizations. A V4.4.1 o removeu de propósito
--    e declarou organization_subscriptions.seat_limit como fonte canônica.
--    Duas fontes de licença divergindo é a empresa com mais assentos do que
--    pagou. A licença continua saindo de organization_seat_entitlement().
--
-- 2. organization_active_seat_count() NÃO muda de significado. Ela conta
--    membros ativos, e continua contando exatamente isso. Quem passa a valer
--    para o limite é organization_reserved_seat_count(), nova e explícita.
--
-- 3. A função do trigger é VOLATILE, e isso não é estilo. Em READ COMMITTED,
--    cada consulta dentro de uma função volátil pega snapshot novo — então a
--    segunda transação, ao ser liberada do advisory lock, enxerga a linha que
--    a primeira acabou de commitar e recusa. Marcada STABLE, ela herdaria o
--    snapshot da instrução externa, contaria a menos, e as duas passariam.
--    Isso foi medido no plano Family e vale igual aqui.

begin;

-- ─── colunas realmente ausentes (P1.1, P1.2) ────────────────────────────────

alter table public.organizations
  add column if not exists timezone text;

comment on column public.organizations.timezone is
  'Fuso da organização, escolhido no provisionamento. Nulo significa desconhecido — nunca inferir para sempre.';

alter table public.organizations
  add column if not exists contract_reference text;

comment on column public.organizations.contract_reference is
  'Referência de contrato/CRM. Uso interno, nunca exibida publicamente.';

-- ─── reserva de assento (REGRA 6, P2) ───────────────────────────────────────

/**
 * Assentos reservados: quem já ocupa lugar e quem tem direito de ocupar.
 *
 * O defeito que isto corrige: organization_active_seat_count() conta só
 * membros ativos, então dez convites cabiam numa empresa com cinco vagas e o
 * limite estourava quando todos aceitassem.
 *
 * Conta três coisas:
 *   - membros ativos;
 *   - membros em 'invited' (o esquema permite esse estado desde a V4.4);
 *   - convites pendentes ainda dentro do prazo.
 *
 * Convite expirado não reserva (P2.2) e revogado libera na hora (P2.3),
 * porque ambos saem de 'pending'.
 *
 * Sobre dupla contagem (P2.4): o fluxo desta versão cria o convite SEM linha
 * de membro, e o aceite transforma o convite em 'accepted' e cria o membro
 * como 'active'. Como 'pending' e 'active' nunca coexistem para a mesma
 * pessoa, o líquido não muda no aceite. Se algum caminho futuro criar as duas
 * coisas ao mesmo tempo, esta conta reserva a mais — que é o lado seguro de
 * errar num limite de licença.
 */
create or replace function public.organization_reserved_seat_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.organization_members m
      where m.organization_id = p_org_id
        and m.seat_status in ('active', 'invited')
    )
    +
    (
      select count(*)
      from public.organization_invites i
      where i.organization_id = p_org_id
        and i.status = 'pending'
        and i.expires_at > now()
    );
$$;

comment on function public.organization_reserved_seat_count(uuid) is
  'Membros ativos/convidados + convites pendentes válidos. É esta contagem que o limite de licença usa.';

revoke all on function public.organization_reserved_seat_count(uuid) from public, anon, authenticated;
grant execute on function public.organization_reserved_seat_count(uuid) to service_role;

-- A guarda passa a olhar o reservado, não só o ativo.
create or replace function public.organization_seats_within_entitlement(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.organization_reserved_seat_count(p_org_id)
      <= public.organization_seat_entitlement(p_org_id);
$$;

comment on function public.organization_seats_within_entitlement(uuid) is
  'Reservados (ativos + convidados + convites pendentes) dentro da licença contratada. Organização sem licença responde false: ela tem gente e não tem contrato, e é isso que a operação precisa enxergar.';

/**
 * A organização já tem licença contratada?
 *
 * organization_seat_entitlement() devolve 0 tanto para "licença de zero
 * assentos" quanto para "ainda não tem licença nenhuma", e a diferença entre
 * as duas é o que decide se o limite se aplica.
 *
 * Sem isto o trigger recusa o PRIMEIRO membro de toda organização nova: o
 * provisionamento real cria a organização, coloca o dono e só depois anexa a
 * assinatura — nessa ordem, o dono chegava quando a licença ainda era 0 e era
 * barrado. Foi o ensaio efêmero do CI que mostrou isso, com a mesma sequência
 * que produção usa.
 *
 * Deixar passar não abre buraco: sem assinatura ativa e sem grant,
 * _user_organization_entitlement() não concede acesso a ninguém daquela
 * organização. Linhas numa organização sem licença não viram assento de
 * ninguém — e no instante em que a licença aparece, o limite passa a valer
 * para toda escrita seguinte.
 */
create or replace function public.organization_has_seat_license(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_subscriptions s
    where s.organization_id = p_org_id
      and (
        s.status in ('trialing', 'active')
        or (
          s.status = 'canceled'
          and s.current_period_end is not null
          and s.current_period_end > now()
        )
      )
  )
  or exists (
    select 1
    from public.organization_entitlement_grants g
    where g.organization_id = p_org_id
      and g.status = 'active'
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

comment on function public.organization_has_seat_license(uuid) is
  'Existe licença contratada (assinatura ativa ou grant) para esta organização? Distingue "licença zero" de "ainda sem licença".';

revoke all on function public.organization_has_seat_license(uuid) from public, anon, authenticated;
grant execute on function public.organization_has_seat_license(uuid) to service_role;

-- ─── concorrência do último assento (P3) ────────────────────────────────────

/**
 * Recusa a gravação que faria a organização passar da licença contratada.
 *
 * Roda como trigger porque duas requisições simultâneas passariam as duas por
 * uma checagem feita antes da escrita. O advisory lock serializa as escritas
 * de assento da mesma organização; a volatilidade da função garante que a
 * segunda enxergue o que a primeira commitou.
 */
create or replace function public.enforce_organization_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_reserved integer;
  v_entitlement integer;
begin
  v_org_id := coalesce(new.organization_id, old.organization_id);

  -- Só conta quem passa a ocupar lugar agora.
  --
  -- Os ramos são separados de propósito. As duas tabelas nomeiam o estado
  -- diferente — seat_status aqui, status ali — e o PL/pgSQL avalia o acesso ao
  -- campo mesmo quando a comparação de tg_table_name é falsa. Numa condição só,
  -- gravar um membro estoura com "record new has no field status".
  if tg_table_name = 'organization_members' then
    if new.seat_status not in ('active', 'invited') then
      return new;
    end if;
  elsif tg_table_name = 'organization_invites' then
    if new.status is distinct from 'pending' then
      return new;
    end if;
  end if;

  -- Organização ainda sem licença não é medida. Fora daqui, o primeiro membro
  -- de toda empresa nova seria recusado, porque a assinatura só é anexada
  -- depois. A checagem vem antes do lock de propósito: não há o que serializar
  -- quando não há limite a impor.
  if not public.organization_has_seat_license(v_org_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_org_id::text, 0));

  v_entitlement := public.organization_seat_entitlement(v_org_id);
  v_reserved := public.organization_reserved_seat_count(v_org_id);

  if v_reserved > v_entitlement then
    raise exception 'BUSINESS_SEATS_FULL: % reservados, licenca e %', v_reserved, v_entitlement
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_seat_limit on public.organization_members;
create constraint trigger organization_members_seat_limit
  after insert or update on public.organization_members
  deferrable initially immediate
  for each row
  execute function public.enforce_organization_seat_limit();

drop trigger if exists organization_invites_seat_limit on public.organization_invites;
create constraint trigger organization_invites_seat_limit
  after insert or update on public.organization_invites
  deferrable initially immediate
  for each row
  execute function public.enforce_organization_seat_limit();

-- ─── RPCs do painel (REGRA 7, P5, P6) ───────────────────────────────────────
--
-- As funções internas de assento continuam service_role. O painel não ganha
-- execute nelas: ele chama estas duas, que têm shape mínimo e checam
-- autorização por dentro. O organizationId vindo do browser nunca é aceito
-- sem essa checagem.

/**
 * Visão geral da empresa. Agrega no servidor — o navegador nunca baixa
 * snapshot de ninguém para somar (P18 do contrato anterior, P5 deste).
 */
create or replace function public.get_business_overview(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org public.organizations%rowtype;
  v_role text;
  v_entitlement integer;
  v_reserved integer;
  v_active integer;
  v_pending integer;
  v_active_7d integer;
  v_lessons_7d integer;
  v_progress numeric;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select m.role into v_role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.seat_status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'manager') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;

  v_entitlement := public.organization_seat_entitlement(p_organization_id);
  v_reserved := public.organization_reserved_seat_count(p_organization_id);
  v_active := public.organization_active_seat_count(p_organization_id);

  select count(*) into v_pending
  from public.organization_invites i
  where i.organization_id = p_organization_id
    and i.status = 'pending'
    and i.expires_at > now();

  select
    count(*) filter (where p.last_active >= (current_date - 7)),
    coalesce(sum(coalesce(array_length(p.completed_lessons, 1), 0)), 0)
  into v_active_7d, v_lessons_7d
  from public.organization_members m
  join public.user_progress p on p.user_id = m.user_id
  where m.organization_id = p_organization_id
    and m.seat_status = 'active';

  -- Progresso médio sobre o currículo congelado (134 lições). É uma conta
  -- explícita sobre dado real, não uma nota inventada de fluência.
  select coalesce(avg(least(100.0, coalesce(array_length(p.completed_lessons, 1), 0) * 100.0 / 134)), 0)
  into v_progress
  from public.organization_members m
  join public.user_progress p on p.user_id = m.user_id
  where m.organization_id = p_organization_id
    and m.seat_status = 'active';

  return jsonb_build_object(
    'organization_id', v_org.id,
    'name', v_org.name,
    'plan', v_org.plan,
    'status', v_org.status,
    'viewer_role', v_role,
    'seat_entitlement', v_entitlement,
    'seats_active', v_active,
    'seats_pending', v_pending,
    'seats_reserved', v_reserved,
    'seats_available', greatest(0, v_entitlement - v_reserved),
    'active_learners_7d', coalesce(v_active_7d, 0),
    'lessons_completed_total', coalesce(v_lessons_7d, 0),
    'average_journey_progress', round(v_progress, 1)
  );
end;
$$;

comment on function public.get_business_overview(uuid) is
  'Agregado do painel Business. Valida papel por dentro; nunca devolve dado pedagógico individual.';

/**
 * Lista de colaboradores, paginada no servidor.
 *
 * Devolve só o que o P6.1 permite. Nada de resposta livre, transcrição de
 * fala, erro individual, resposta de saúde ou snapshot bruto — esses campos
 * não são filtrados aqui, eles simplesmente não são lidos.
 */
create or replace function public.get_business_members(
  p_organization_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_rows jsonb;
  v_total integer;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select m.role into v_role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.seat_status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'manager') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_total
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.seat_status <> 'removed';

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.display_name), '[]'::jsonb)
  into v_rows
  from (
    select
      m.user_id,
      pr.name as display_name,
      m.role,
      m.seat_status,
      m.joined_at,
      up.last_active,
      coalesce(array_length(up.completed_lessons, 1), 0) as lessons_completed,
      round(least(100.0, coalesce(array_length(up.completed_lessons, 1), 0) * 100.0 / 134), 1)
        as journey_progress_percent,
      coalesce(lm.weekly_xp, 0) as weekly_xp
    from public.organization_members m
    left join public.profiles pr on pr.id = m.user_id
    left join public.user_progress up on up.user_id = m.user_id
    left join public.league_memberships lm on lm.user_id = m.user_id
    where m.organization_id = p_organization_id
      and m.seat_status <> 'removed'
    order by pr.name
    limit v_limit
    offset v_offset
  ) t;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'members', v_rows);
end;
$$;

comment on function public.get_business_members(uuid, integer, integer) is
  'Colaboradores paginados. Campos permitidos apenas; dado pedagógico privado não é lido.';

revoke all on function public.get_business_overview(uuid) from public, anon;
revoke all on function public.get_business_members(uuid, integer, integer) from public, anon;
grant execute on function public.get_business_overview(uuid) to authenticated;
grant execute on function public.get_business_members(uuid, integer, integer) to authenticated;

commit;
