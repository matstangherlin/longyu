-- Fecha farming de Pro por plus-addressing, limpa grant anon de is_beta_admin,
-- e limita abuso de snapshot/liga pública declarada pelo cliente.

begin;

create or replace function public.canonicalize_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_email, '')));
  local_part text;
  domain text;
  at_pos integer;
begin
  if v = '' then
    return '';
  end if;

  at_pos := position('@' in v);
  if at_pos < 2 then
    return v;
  end if;

  local_part := left(v, at_pos - 1);
  domain := substring(v from at_pos + 1);

  if position('+' in local_part) > 0 then
    local_part := split_part(local_part, '+', 1);
  end if;

  if domain = 'googlemail.com' then
    domain := 'gmail.com';
  end if;

  if domain = 'gmail.com' then
    local_part := replace(local_part, '.', '');
  end if;

  return local_part || '@' || domain;
end;
$$;

revoke all on function public.canonicalize_email(text) from public;
grant execute on function public.canonicalize_email(text) to authenticated, service_role;

create or replace function public._user_email_hash(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(
    digest(public.canonicalize_email(coalesce(u.email, '')), 'sha256'),
    'hex'
  )
  from auth.users u
  where u.id = p_user_id;
$$;

revoke all on function public._user_email_hash(uuid) from public;
grant execute on function public._user_email_hash(uuid) to service_role;

-- is_beta_admin: só authenticated (remove resíduo de grant a anon).
revoke all on function public.is_beta_admin() from public, anon, authenticated;
grant execute on function public.is_beta_admin() to authenticated;

-- Stats sociais / snapshot: limites de abuso de armazenamento e valores.
alter table public.profiles
  drop constraint if exists profiles_league_tier_allowed;

alter table public.profiles
  add constraint profiles_league_tier_allowed
  check (
    league_tier is null
    or league_tier in ('bronze', 'prata', 'ouro', 'jade', 'dragao', 'mestre', 'celestial')
  );

alter table public.profiles
  drop constraint if exists profiles_name_length;

alter table public.profiles
  add constraint profiles_name_length
  check (name is null or char_length(name) <= 80);

alter table public.user_progress
  drop constraint if exists user_progress_client_snapshot_size;

alter table public.user_progress
  add constraint user_progress_client_snapshot_size
  check (
    client_snapshot is null
    or octet_length(client_snapshot::text) <= 262144
  );

-- Trigger social: não copia league_tier/nome inválidos.
create or replace function public.sync_profile_public_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  progress jsonb;
  v_name text;
  v_tier text;
  v_weekly integer;
  v_streak integer;
begin
  if new.client_snapshot is null then
    return new;
  end if;

  progress := new.client_snapshot -> 'progress';
  v_name := nullif(trim(new.client_snapshot -> 'account' ->> 'name'), '');
  if v_name is not null then
    v_name := left(v_name, 80);
  end if;

  v_tier := nullif(trim(progress ->> 'leagueTier'), '');
  if v_tier is not null
     and v_tier not in ('bronze', 'prata', 'ouro', 'jade', 'dragao', 'mestre', 'celestial') then
    v_tier := null;
  end if;

  begin
    v_weekly := greatest(0, least(coalesce((progress ->> 'weeklyXp')::integer, 0), 5000));
  exception when others then
    v_weekly := null;
  end;

  begin
    v_streak := greatest(0, least(coalesce((progress ->> 'streak')::integer, 0), 3650));
  exception when others then
    v_streak := null;
  end;

  update public.profiles
  set
    name = coalesce(v_name, name),
    league_tier = coalesce(v_tier, league_tier),
    public_weekly_xp = coalesce(v_weekly, public_weekly_xp),
    public_streak = coalesce(v_streak, public_streak),
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

commit;
