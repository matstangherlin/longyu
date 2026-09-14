-- V4.10A.1 — o fluxo de convite Family, do lado do servidor.
--
-- A V4.10A criou as tabelas com RLS de leitura e nenhuma policy de escrita: o
-- browser podia ler a própria família e mais nada. Isso estava certo enquanto
-- não havia fluxo. Agora há, e a escolha aqui é deliberada — as policies de
-- escrita continuam não existindo. Tudo passa por estas RPCs.
--
-- O motivo é o token. Se o cliente pudesse inserir em family_invites, ele
-- escolheria o token_hash, e o convite valeria o que o cliente quisesse que
-- valesse. Aqui o segredo nasce no servidor, com gen_random_uuid() duas vezes
-- (244 bits do gerador forte do Postgres), volta uma única vez na resposta e
-- nunca mais existe em lugar nenhum: a tabela guarda só o sha256.
--
-- O limite de seis continua sendo do trigger, não destas funções. Elas
-- conferem antes para dar erro bonito; quem recusa de verdade é o servidor.

begin;

-- ─── criar convite (P11) ────────────────────────────────────────────────────

/**
 * Cria um convite e devolve o token em claro UMA vez.
 *
 * Quem chama é o dono da família. O email é normalizado para que "Ana@X.com" e
 * "ana@x.com" não ocupem dois lugares.
 */
create or replace function public.create_family_invite(p_email text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select id into v_family_id
  from public.family_accounts
  where owner_user_id = auth.uid() and status <> 'canceled';

  if v_family_id is null then
    raise exception 'NO_FAMILY' using errcode = 'no_data_found';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from public.family_invites i
    where i.family_id = v_family_id
      and lower(i.email) = v_email
      and i.status = 'pending'
      and i.expires_at > now()
  ) then
    raise exception 'INVITE_ALREADY_PENDING' using errcode = 'unique_violation';
  end if;

  -- Segredo do servidor. Dois UUID v4 = 244 bits do gerador forte do Postgres;
  -- o cliente nunca escolhe, nunca adivinha, e só vê este valor nesta resposta.
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.family_invites (family_id, email, token_hash, invited_by, expires_at)
  values (v_family_id, v_email, encode(sha256(v_token::bytea), 'hex'), auth.uid(), v_expires)
  returning id into v_invite_id;

  return jsonb_build_object('invite_id', v_invite_id, 'token', v_token, 'expires_at', v_expires);
end;
$$;

comment on function public.create_family_invite(text) is
  'Cria convite Family e devolve o token em claro uma única vez. A tabela guarda apenas o hash.';

-- ─── revogar convite (P13) ──────────────────────────────────────────────────

create or replace function public.revoke_family_invite(p_invite_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  update public.family_invites i
  set status = 'revoked'
  where i.id = p_invite_id
    and i.status = 'pending'
    and exists (
      select 1 from public.family_accounts f
      where f.id = i.family_id and f.owner_user_id = auth.uid() and f.status <> 'canceled'
    );

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

comment on function public.revoke_family_invite(uuid) is
  'Revoga convite pendente. Só o dono da família, e o lugar volta na hora.';

-- ─── aceitar convite (P12) ──────────────────────────────────────────────────

/**
 * Aceita o convite a partir do token do link.
 *
 * O token chega em claro porque veio da URL de quem foi convidado; ele é
 * transformado em hash na hora da comparação e não é gravado em lugar nenhum.
 * Nem aqui nem no cliente ele entra em log ou telemetria.
 */
create or replace function public.accept_family_invite(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_invite public.family_invites%rowtype;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_token), '') = '' then
    raise exception 'INVALID_INVITE' using errcode = 'no_data_found';
  end if;

  v_hash := encode(sha256(trim(p_token)::bytea), 'hex');

  select * into v_invite
  from public.family_invites i
  where i.token_hash = v_hash
    and i.status = 'pending'
    and i.expires_at > now();

  if v_invite.id is null then
    raise exception 'INVALID_INVITE' using errcode = 'no_data_found';
  end if;

  if exists (
    select 1 from public.family_memberships m
    where m.user_id = auth.uid() and m.status = 'active' and m.family_id <> v_invite.family_id
  ) then
    raise exception 'ALREADY_IN_ANOTHER_FAMILY' using errcode = 'unique_violation';
  end if;

  -- O convite sai de 'pending' antes da participação entrar: os dois estados
  -- nunca coexistem, então o aceite não consome dois lugares.
  update public.family_invites set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = v_invite.id;

  insert into public.family_memberships (family_id, user_id, role, status, joined_at)
  values (v_invite.family_id, auth.uid(), 'member', 'active', now())
  on conflict (family_id, user_id) do update
    set status = 'active', joined_at = coalesce(public.family_memberships.joined_at, now());

  return jsonb_build_object('family_id', v_invite.family_id);
end;
$$;

comment on function public.accept_family_invite(text) is
  'Aceita convite Family pelo token do link. O token nunca é gravado, só comparado por hash.';

-- ─── remover membro (P13) ───────────────────────────────────────────────────

create or replace function public.remove_family_member(p_user_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select id into v_family_id
  from public.family_accounts
  where owner_user_id = auth.uid() and status <> 'canceled';

  if v_family_id is null then
    raise exception 'NO_FAMILY' using errcode = 'no_data_found';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'OWNER_CANNOT_LEAVE' using errcode = 'check_violation';
  end if;

  update public.family_memberships m
  set status = 'removed'
  where m.family_id = v_family_id and m.user_id = p_user_id and m.status = 'active';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

comment on function public.remove_family_member(uuid) is
  'Remove membro da família. O acesso Pro cai na hora; o progresso da pessoa continua dela.';

-- ─── visão da família (P10) ─────────────────────────────────────────────────

/**
 * O que a tela do dono precisa, e nada além.
 *
 * Membro recebe a mesma chamada e enxerga menos: nome do plano, quantos
 * lugares, e a própria participação. A lista de convites é do dono — um membro
 * não tem por que saber quem mais foi chamado.
 *
 * Nenhum campo de aprendizagem aparece aqui. Não é filtro: não é lido.
 */
create or replace function public.get_family_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family public.family_accounts%rowtype;
  v_is_owner boolean;
  v_members jsonb;
  v_invites jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select f.* into v_family
  from public.family_accounts f
  where f.status <> 'canceled'
    and (
      f.owner_user_id = auth.uid()
      or exists (
        select 1 from public.family_memberships m
        where m.family_id = f.id and m.user_id = auth.uid() and m.status = 'active'
      )
    )
  limit 1;

  if v_family.id is null then
    return jsonb_build_object('family', null);
  end if;

  v_is_owner := v_family.owner_user_id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id,
           'name', p.name,
           'role', m.role,
           'status', m.status,
           'joined_at', m.joined_at
         ) order by m.joined_at nulls first), '[]'::jsonb)
  into v_members
  from public.family_memberships m
  left join public.profiles p on p.id = m.user_id
  where m.family_id = v_family.id
    and m.status = 'active'
    and (v_is_owner or m.user_id = auth.uid());

  if v_is_owner then
    select coalesce(jsonb_agg(jsonb_build_object(
             'invite_id', i.id,
             'email', i.email,
             'expires_at', i.expires_at
           ) order by i.created_at), '[]'::jsonb)
    into v_invites
    from public.family_invites i
    where i.family_id = v_family.id and i.status = 'pending' and i.expires_at > now();
  else
    v_invites := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'family', jsonb_build_object(
      'family_id', v_family.id,
      'status', v_family.status,
      'is_owner', v_is_owner,
      'seats_used', public.family_seats_used(v_family.id),
      'seats_total', public.family_max_members()
    ),
    'members', v_members,
    'invites', v_invites
  );
end;
$$;

comment on function public.get_family_overview() is
  'Visão da família para a tela: lugares, membros e convites pendentes. Nenhum dado de aprendizagem.';

-- ─── privilégios ────────────────────────────────────────────────────────────
--
-- As RPCs são a única porta de escrita: family_invites e family_memberships
-- continuam sem policy de insert/update/delete, então nem o dono grava direto.

revoke all on function public.create_family_invite(text) from public, anon;
revoke all on function public.revoke_family_invite(uuid) from public, anon;
revoke all on function public.accept_family_invite(text) from public, anon;
revoke all on function public.remove_family_member(uuid) from public, anon;
revoke all on function public.get_family_overview() from public, anon;

grant execute on function public.create_family_invite(text) to authenticated;
grant execute on function public.revoke_family_invite(uuid) to authenticated;
grant execute on function public.accept_family_invite(text) to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;
grant execute on function public.get_family_overview() to authenticated;

commit;
