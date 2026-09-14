-- V4.10A — Plano Family: uma assinatura, seis contas independentes.
--
-- O contrato TypeScript de Family existia desde a V4.8.6 sem nada no banco.
-- Esta migration dá corpo a ele: famílias, participações e convites.
--
-- Duas decisões estruturam o arquivo inteiro:
--
-- 1. Family é COMPARTILHAMENTO DE ASSINATURA, não painel parental. O dono
--    paga e convida; ele não ganha nenhuma visão do que os outros estudam.
--    Por isso nenhuma tabela daqui referencia progresso, e nenhuma policy
--    concede leitura sobre dados de aprendizagem de terceiro.
--
-- 2. O limite de seis é do servidor. A aplicação também confere, para
--    desabilitar o botão, mas quem recusa de verdade é o trigger abaixo —
--    senão dois convites simultâneos passam pela checagem da aplicação e
--    estouram o limite sem ninguém ter feito nada errado.

begin;

-- ─── famílias ───────────────────────────────────────────────────────────────
create table if not exists public.family_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.family_accounts is
  'Assinatura Family. Compartilha acesso, nunca progresso: o dono não enxerga o que os membros estudam.';

-- Um dono tem no máximo uma família ativa.
create unique index if not exists family_accounts_owner_active_idx
  on public.family_accounts (owner_user_id)
  where status <> 'canceled';

-- ─── participações ──────────────────────────────────────────────────────────
create table if not exists public.family_memberships (
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  status text not null default 'active'
    check (status in ('active', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

comment on table public.family_memberships is
  'Participação numa família. Resolve acesso e nada mais — não carrega estado de aprendizagem.';

-- Uma pessoa participa de no máximo uma família ativa por vez.
create unique index if not exists family_memberships_user_active_idx
  on public.family_memberships (user_id)
  where status = 'active';

-- ─── convites ───────────────────────────────────────────────────────────────
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254),
  -- Nunca o token em claro. O servidor guarda só o hash; quem tem o link tem
  -- o segredo, e um vazamento desta tabela não vira convite utilizável.
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.family_invites.token_hash is
  'Hash do token do convite. O valor em claro só existe no link enviado — nunca no banco, em log ou em analytics.';

-- Um convite pendente por email, por família.
create unique index if not exists family_invites_pending_email_idx
  on public.family_invites (family_id, lower(email))
  where status = 'pending';

create index if not exists family_invites_family_status_idx
  on public.family_invites (family_id, status);

-- ─── limite de assentos, imposto pelo servidor ──────────────────────────────

/**
 * Lugares ocupados numa família: membros ativos mais convites ainda válidos.
 *
 * Convite pendente ocupa lugar de propósito. Sem isso o dono manda seis
 * convites para cinco vagas, todos aceitam, e a família passa de seis contas.
 * O lugar volta quando o convite expira ou é revogado.
 */
create or replace function public.family_seats_used(p_family_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.family_memberships m
      where m.family_id = p_family_id
        and m.status = 'active'
    )
    +
    (
      select count(*)
      from public.family_invites i
      where i.family_id = p_family_id
        and i.status = 'pending'
        and i.expires_at > now()
    );
$$;

comment on function public.family_seats_used(uuid) is
  'Membros ativos + convites pendentes válidos. Convite pendente reserva lugar para evitar overbooking.';

create or replace function public.family_max_members()
returns integer
language sql
immutable
set search_path = ''
as $$ select 6; $$;

comment on function public.family_max_members() is
  'Seis contas no total: o dono mais cinco convidados. Espelha FAMILY_MAX_MEMBERS no cliente.';

/**
 * Recusa a gravação que faria a família passar de seis lugares.
 *
 * Roda como trigger para que duas transações simultâneas não passem as duas
 * por uma checagem feita antes da escrita. O lock advisory serializa as
 * escritas de assento da mesma família — é o que impede a corrida.
 */
create or replace function public.enforce_family_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_used integer;
  v_limit integer := public.family_max_members();
begin
  v_family_id := coalesce(new.family_id, old.family_id);

  -- Só conta quem passa a ocupar lugar agora.
  if tg_table_name = 'family_memberships' and new.status is distinct from 'active' then
    return new;
  end if;
  if tg_table_name = 'family_invites' and new.status is distinct from 'pending' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_family_id::text, 0));

  v_used := public.family_seats_used(v_family_id);

  if v_used > v_limit then
    raise exception 'FAMILY_FULL: % lugares ocupados, limite é %', v_used, v_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists family_memberships_seat_limit on public.family_memberships;
create constraint trigger family_memberships_seat_limit
  after insert or update on public.family_memberships
  deferrable initially immediate
  for each row
  execute function public.enforce_family_seat_limit();

drop trigger if exists family_invites_seat_limit on public.family_invites;
create constraint trigger family_invites_seat_limit
  after insert or update on public.family_invites
  deferrable initially immediate
  for each row
  execute function public.enforce_family_seat_limit();

-- Uma família sempre tem exatamente um dono ativo.
create unique index if not exists family_memberships_single_owner_idx
  on public.family_memberships (family_id)
  where role = 'owner' and status = 'active';

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.family_accounts enable row level security;
alter table public.family_memberships enable row level security;
alter table public.family_invites enable row level security;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships m
    where m.family_id = p_family_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_accounts f
    where f.id = p_family_id
      and f.owner_user_id = auth.uid()
      and f.status <> 'canceled'
  );
$$;

revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.is_family_owner(uuid) from public, anon;
revoke all on function public.family_seats_used(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
grant execute on function public.family_seats_used(uuid) to authenticated;

-- Membro enxerga a própria família. Só isso: nome do plano e quantos lugares,
-- nunca o que os outros estudaram.
drop policy if exists family_accounts_select_member on public.family_accounts;
create policy family_accounts_select_member
  on public.family_accounts
  for select
  to authenticated
  using (public.is_family_member(id) or owner_user_id = auth.uid());

-- Membro lê a própria participação; o dono lê as da família dele, porque
-- precisa saber quem ocupa lugar para gerenciar convites.
drop policy if exists family_memberships_select_scope on public.family_memberships;
create policy family_memberships_select_scope
  on public.family_memberships
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_family_owner(family_id));

-- Convite é assunto do dono. Nenhum membro lê a lista de convites.
drop policy if exists family_invites_select_owner on public.family_invites;
create policy family_invites_select_owner
  on public.family_invites
  for select
  to authenticated
  using (public.is_family_owner(family_id));

commit;
