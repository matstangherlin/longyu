-- Perfis de conta permanecem privados. Toda leitura entre usuarios passa por
-- RPCs com colunas publicas enumeradas e regras explicitas de visibilidade.
begin;

drop policy if exists "profiles_select_social" on public.profiles;

-- A view historica e curada, mas uma leitura direta nao consegue distinguir
-- busca publica de relacao social. Os RPCs abaixo sao a unica API cross-user.
do $$
begin
  if to_regclass('public.public_profiles') is not null then
    execute 'revoke all privileges on table public.public_profiles from public, anon, authenticated';
  end if;
end;
$$;

-- Producao ainda pode nao ter o modulo social. Nesse caso a migration fecha a
-- policy perigosa (se existir) e nao ativa funcionalidade nova por acidente.
do $migration$
begin
  if to_regclass('public.user_follows') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'show_in_search'
     ) then
    execute $function$
      create or replace function public.search_public_profiles(search_query text)
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and p.id <> auth.uid()
          and p.username is not null
          and length(trim(coalesce(search_query, ''))) between 2 and 48
          and (
            p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where f.follower_id = auth.uid()
                and f.following_id = p.id
            )
          )
          and (
            p.username ilike '%' || trim(search_query) || '%'
            or p.name ilike '%' || trim(search_query) || '%'
          )
        order by p.public_weekly_xp desc, p.name asc
        limit 24
      $body$;
    $function$;

    execute $function$
      create or replace function public.get_public_profile_by_username(target_username text)
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and p.username is not null
          and lower(p.username) = lower(trim(coalesce(target_username, '')))
          and (
            p.id = auth.uid()
            or p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where (f.follower_id = auth.uid() and f.following_id = p.id)
                 or (f.following_id = auth.uid() and f.follower_id = p.id)
            )
          )
        limit 1
      $body$;
    $function$;

    execute $function$
      create or replace function public.get_public_profiles_by_ids(target_user_ids uuid[])
      returns table (
        user_id uuid,
        display_name text,
        username text,
        avatar_key text,
        league_tier text,
        weekly_xp integer,
        streak integer,
        joined_at timestamptz
      )
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          p.id,
          p.name,
          p.username,
          p.avatar_key,
          p.league_tier,
          p.public_weekly_xp,
          p.public_streak,
          p.created_at
        from public.profiles p
        where auth.uid() is not null
          and coalesce(cardinality(target_user_ids), 0) between 1 and 100
          and p.id = any(target_user_ids)
          and p.username is not null
          and (
            p.id = auth.uid()
            or p.show_in_search = true
            or exists (
              select 1
              from public.user_follows f
              where (f.follower_id = auth.uid() and f.following_id = p.id)
                 or (f.following_id = auth.uid() and f.follower_id = p.id)
            )
          )
        order by p.name asc
      $body$;
    $function$;
  end if;
end;
$migration$;

do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.search_public_profiles(text)',
    'public.get_public_profile_by_username(text)',
    'public.get_public_profiles_by_ids(uuid[])'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        signature
      );
      execute format('grant execute on function %s to authenticated', signature);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
