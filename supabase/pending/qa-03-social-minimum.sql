-- LGY-002. Pacote mínimo de social. NÃO é replay de supabase/migrations/005_social.sql.
-- 005 também mexe em username e recria a policy profiles_select_social, que
-- 20260808070849 já removeu em produção. Aquele arquivo rodou e pulou as RPCs
-- porque public.user_follows não existia.
-- Este arquivo só cria as tabelas, as colunas que as RPCs leem, as policies
-- das tabelas novas e reexecuta o bloco de funções já revisado.
-- Aplicar só depois de backup e de staging. Não rodar db:apply-api.

begin;

alter table public.profiles
  add column if not exists avatar_key text,
  add column if not exists league_tier text not null default 'jade',
  add column if not exists public_weekly_xp integer not null default 0,
  add column if not exists public_streak integer not null default 0,
  add column if not exists show_in_search boolean not null default true;

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_follower_idx on public.user_follows (follower_id);
create index if not exists user_follows_following_idx on public.user_follows (following_id);

create table if not exists public.social_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('lesson_complete', 'league_up', 'streak', 'achievement')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists social_activity_events_user_created_idx
  on public.social_activity_events (user_id, created_at desc);

alter table public.user_follows enable row level security;
alter table public.social_activity_events enable row level security;

drop policy if exists "user_follows_select_own" on public.user_follows;
drop policy if exists "user_follows_insert_own" on public.user_follows;
drop policy if exists "user_follows_delete_own" on public.user_follows;
drop policy if exists "social_activity_insert_own" on public.social_activity_events;
drop policy if exists "social_activity_select_friends" on public.social_activity_events;

create policy "user_follows_select_own"
on public.user_follows for select
to authenticated
using (follower_id = auth.uid() or following_id = auth.uid());

create policy "user_follows_insert_own"
on public.user_follows for insert
to authenticated
with check (follower_id = auth.uid() and following_id <> auth.uid());

create policy "user_follows_delete_own"
on public.user_follows for delete
to authenticated
using (follower_id = auth.uid());

create policy "social_activity_insert_own"
on public.social_activity_events for insert
to authenticated
with check (user_id = auth.uid());

create policy "social_activity_select_friends"
on public.social_activity_events for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_follows f
    where f.follower_id = auth.uid() and f.following_id = social_activity_events.user_id
  )
);

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

revoke all on table public.user_follows from public, anon;
revoke all on table public.social_activity_events from public, anon;
grant select, insert, delete on table public.user_follows to authenticated;
grant select, insert on table public.social_activity_events to authenticated;

notify pgrst, 'reload schema';

commit;
