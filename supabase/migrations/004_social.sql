-- Social: follows, public profiles, activity feed (Fase social leve).

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_key text,
  add column if not exists league_tier text not null default 'jade',
  add column if not exists public_weekly_xp integer not null default 0,
  add column if not exists public_streak integer not null default 0,
  add column if not exists show_in_search boolean not null default true;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

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

-- Espelha stats públicos a partir do snapshot do cliente (sem expor o snapshot).
create or replace function public.sync_profile_public_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  progress jsonb;
begin
  if new.client_snapshot is null then
    return new;
  end if;

  progress := new.client_snapshot -> 'progress';

  update public.profiles
  set
    name = coalesce(nullif(trim(new.client_snapshot -> 'account' ->> 'name'), ''), name),
    league_tier = coalesce(nullif(progress ->> 'leagueTier', ''), league_tier),
    public_weekly_xp = greatest(0, coalesce((progress ->> 'weeklyXp')::integer, public_weekly_xp)),
    public_streak = greatest(0, coalesce((progress ->> 'streak')::integer, public_streak)),
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_public_stats on public.user_progress;
create trigger trg_sync_profile_public_stats
  after insert or update of client_snapshot on public.user_progress
  for each row
  execute function public.sync_profile_public_stats();

create or replace view public.public_profiles
with (security_invoker = true) as
select
  p.id as user_id,
  p.name as display_name,
  p.username,
  p.avatar_key,
  p.league_tier,
  p.public_weekly_xp as weekly_xp,
  p.public_streak as streak,
  p.created_at as joined_at,
  p.show_in_search
from public.profiles p
where p.username is not null;

-- Busca segura: só campos públicos; respeita privacidade de busca.
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
set search_path = public
as $$
  with me as (select auth.uid() as uid)
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_key,
    p.league_tier,
    p.weekly_xp,
    p.streak,
    p.joined_at
  from public.public_profiles p
  cross join me
  where
    p.user_id <> me.uid
    and (
      p.show_in_search = true
      or exists (
        select 1 from public.user_follows f
        where f.follower_id = me.uid and f.following_id = p.user_id
      )
    )
    and (
      p.username ilike '%' || trim(search_query) || '%'
      or p.display_name ilike '%' || trim(search_query) || '%'
    )
  order by p.weekly_xp desc, p.display_name asc
  limit 24;
$$;

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
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_key,
    p.league_tier,
    p.weekly_xp,
    p.streak,
    p.joined_at
  from public.public_profiles p
  where lower(p.username) = lower(trim(target_username))
  limit 1;
$$;

alter table public.user_follows enable row level security;
alter table public.social_activity_events enable row level security;

drop policy if exists "profiles_select_social" on public.profiles;
create policy "profiles_select_social"
on public.profiles for select
to authenticated
using (
  auth.uid() = id
  or (
    username is not null
    and (
      show_in_search = true
      or exists (
        select 1 from public.user_follows f
        where f.follower_id = auth.uid() and f.following_id = profiles.id
      )
      or exists (
        select 1 from public.user_follows f
        where f.following_id = auth.uid() and f.follower_id = profiles.id
      )
    )
  )
);

drop policy if exists "user_follows_select_own" on public.user_follows;
create policy "user_follows_select_own"
on public.user_follows for select
to authenticated
using (follower_id = auth.uid() or following_id = auth.uid());

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own"
on public.user_follows for insert
to authenticated
with check (follower_id = auth.uid() and following_id <> auth.uid());

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own"
on public.user_follows for delete
to authenticated
using (follower_id = auth.uid());

drop policy if exists "social_activity_insert_own" on public.social_activity_events;
create policy "social_activity_insert_own"
on public.social_activity_events for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "social_activity_select_friends" on public.social_activity_events;
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

grant select on public.public_profiles to authenticated;
grant execute on function public.search_public_profiles(text) to authenticated;
grant execute on function public.get_public_profile_by_username(text) to authenticated;
