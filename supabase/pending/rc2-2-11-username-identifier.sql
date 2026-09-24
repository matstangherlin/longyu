-- RC2.2.11 · AP–BC — nome de usuário + login por identificador.
--
-- STATUS: CODE_READY_AWAITING_CLOUD_APPLY
--   Este arquivo NÃO está em supabase/migrations/ de propósito: nada o aplica
--   automaticamente (nem `db:apply-api`, nem o rehearsal efêmero). O owner o
--   promove para supabase/migrations/<timestamp>_username_identifier_login.sql,
--   registra no manifest (docs/backend/migration-manifest.json) e aplica.
--   Não foi aplicado em produção nem em QA.
--
-- Reusa public.profiles como autoridade (005_social.sql já criou
-- `profiles.username` + índice único em lower(username)). Nenhuma segunda
-- tabela de usuário.
--
-- Garantias:
--   * nunca existe caminho público username → email;
--   * resolve_login_identity devolve só o id e só para service_role;
--   * rate limit persistente por IP / identificador / combinação.

-- 1. Formato v2: 3–20, a-z 0-9 _ . (sem ponto na borda nem "..").
--    NOT VALID: nomes antigos (até 24, sem ponto) continuam válidos até o
--    owner rodar a validação; todo INSERT/UPDATE novo já segue a regra.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles drop constraint if exists profiles_username_format_v2;
alter table public.profiles
  add constraint profiles_username_format_v2
  check (
    username is null
    or (username ~ '^[a-z0-9_]([a-z0-9_]|[.](?![.])){1,18}[a-z0-9_]$' and username = lower(username))
  ) not valid;

-- Índice único sem caixa já existe (profiles_username_unique em lower(username)).
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- 2. Registro canônico de nomes reservados (espelha src/lib/username.ts).
create table if not exists public.reserved_usernames (
  name text primary key check (name = lower(name))
);
alter table public.reserved_usernames enable row level security;
-- Sem policies: só service_role / funções security definer leem.

insert into public.reserved_usernames (name) values
  ('admin'),
  ('administrator'),
  ('administrador'),
  ('root'),
  ('system'),
  ('sistema'),
  ('staff'),
  ('moderator'),
  ('moderador'),
  ('mod'),
  ('support'),
  ('suporte'),
  ('help'),
  ('ajuda'),
  ('official'),
  ('oficial'),
  ('security'),
  ('seguranca'),
  ('owner'),
  ('null'),
  ('undefined'),
  ('anonymous'),
  ('anonimo'),
  ('guest'),
  ('convidado'),
  ('user'),
  ('usuario'),
  ('voce'),
  ('you'),
  ('me'),
  ('longyu'),
  ('longyu_app'),
  ('longyuapp'),
  ('dragon'),
  ('dragao'),
  ('laoshi'),
  ('teacher'),
  ('professor'),
  ('api'),
  ('www'),
  ('mail'),
  ('email'),
  ('login'),
  ('logout'),
  ('signup'),
  ('signin'),
  ('cadastro'),
  ('entrar'),
  ('sair'),
  ('conta'),
  ('account'),
  ('perfil'),
  ('profile'),
  ('settings'),
  ('ajustes'),
  ('jornada'),
  ('journey'),
  ('cultura'),
  ('culture'),
  ('revisao'),
  ('review'),
  ('imersao'),
  ('immersion'),
  ('ligas'),
  ('league'),
  ('loja'),
  ('shop'),
  ('pro'),
  ('amigos'),
  ('friends'),
  ('conquistas'),
  ('achievements'),
  ('atlas'),
  ('comecar'),
  ('privacy'),
  ('privacidade'),
  ('terms'),
  ('termos'),
  ('status'),
  ('billing')
on conflict (name) do nothing;

-- 3. O próprio aluno reivindica o nome (autenticado, só o próprio perfil).
--    Reservado e já usado respondem o MESMO código: não vira oráculo de quem existe.
create or replace function public.claim_own_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := lower(trim(coalesce(p_username, '')));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if left(v_name, 1) = '@' then
    v_name := substr(v_name, 2);
  end if;
  if v_name !~ '^[a-z0-9_]([a-z0-9_]|[.](?![.])){1,18}[a-z0-9_]$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_format');
  end if;
  if exists (select 1 from public.reserved_usernames r where r.name = v_name) then
    return jsonb_build_object('ok', false, 'code', 'username_unavailable');
  end if;
  begin
    update public.profiles set username = v_name, updated_at = now() where id = v_uid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'username_unavailable');
  end;
  return jsonb_build_object('ok', true, 'username', v_name);
end;
$$;

revoke all on function public.claim_own_username(text) from public;
revoke all on function public.claim_own_username(text) from anon;
grant execute on function public.claim_own_username(text) to authenticated;

-- 4. Resolução username → id (NUNCA email), só para a Edge sign-in-identifier.
create or replace function public.resolve_login_identity(p_username text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.username is not null
    and lower(p.username) = lower(trim(coalesce(p_username, '')))
  limit 1;
$$;

revoke all on function public.resolve_login_identity(text) from public;
revoke all on function public.resolve_login_identity(text) from anon;
revoke all on function public.resolve_login_identity(text) from authenticated;
grant execute on function public.resolve_login_identity(text) to service_role;

-- 5. Rate limit de login por identificador (persistente, como 018_signup_rate_limits).
create table if not exists public.login_rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_rate_events_bucket_created_idx
  on public.login_rate_events (bucket, created_at desc);
alter table public.login_rate_events enable row level security;

create or replace function public.check_and_record_login_rate(
  p_ip_hash text,
  p_identifier_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_bucket text;
  id_bucket text;
  combo_bucket text;
  n int;
begin
  if p_ip_hash is null or length(trim(p_ip_hash)) < 8
     or p_identifier_hash is null or length(trim(p_identifier_hash)) < 8 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_input');
  end if;
  ip_bucket := 'ip:' || trim(p_ip_hash);
  id_bucket := 'id:' || trim(p_identifier_hash);
  combo_bucket := 'combo:' || trim(p_ip_hash) || ':' || trim(p_identifier_hash);

  select count(*) into n from public.login_rate_events
  where bucket = ip_bucket and created_at > now() - interval '15 minutes';
  if n >= 20 then return jsonb_build_object('allowed', false, 'reason', 'ip_15m'); end if;

  select count(*) into n from public.login_rate_events
  where bucket = id_bucket and created_at > now() - interval '15 minutes';
  if n >= 8 then return jsonb_build_object('allowed', false, 'reason', 'identifier_15m'); end if;

  select count(*) into n from public.login_rate_events
  where bucket = combo_bucket and created_at > now() - interval '15 minutes';
  if n >= 5 then return jsonb_build_object('allowed', false, 'reason', 'combo_15m'); end if;

  insert into public.login_rate_events (bucket) values (ip_bucket), (id_bucket), (combo_bucket);
  delete from public.login_rate_events where created_at < now() - interval '24 hours';
  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_and_record_login_rate(text, text) from public;
revoke all on function public.check_and_record_login_rate(text, text) from anon;
revoke all on function public.check_and_record_login_rate(text, text) from authenticated;
grant execute on function public.check_and_record_login_rate(text, text) to service_role;

comment on function public.check_and_record_login_rate(text, text) is
  'Rate limit do login por identificador: IP 20/15m; identificador 8/15m; combo 5/15m. Só service_role.';
