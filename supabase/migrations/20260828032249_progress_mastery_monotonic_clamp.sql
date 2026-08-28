-- V4.7.8 HOST-002 / HOST-003 — clamp mastery 0..4 + SECURITY DEFINER search_path.
-- Does not edit frozen 20260828030000_progress_mastery_monotonic.sql.
-- VALID LEVELS = integer 0..4.
-- Sanitize (do not crash):
--   null, "", "abc", array, non-object entry → 0
--   -1 → 0; 5 / 999 → 4; 2.5 → trunc then clamp (2)
--   lessonMasteryById null/array → {}
-- Do not cast arbitrary jsonb text to integer (can raise 22P02).
-- Trigger also runs on INSERT so the first write is clamped.
-- Not applied to MandarimProject this remessa.

begin;

create or replace function public.longyu_clamp_mastery_level(p_raw jsonb)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text;
  n numeric;
  s text;
begin
  if p_raw is null then
    return 0;
  end if;
  t := pg_catalog.jsonb_typeof(p_raw);
  if t = 'number' then
    n := (p_raw #>> '{}')::numeric;
  elsif t = 'string' then
    s := p_raw #>> '{}';
    if s is null or s !~ '^-?[0-9]+(\.[0-9]+)?$' then
      return 0;
    end if;
    n := s::numeric;
  else
    return 0;
  end if;
  return pg_catalog.greatest(0, pg_catalog.least(4, pg_catalog.trunc(n)))::integer;
exception
  when others then
    return 0;
end;
$$;

create or replace function public.longyu_mastery_entry_level(p_entry jsonb)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_entry is null then
    return 0;
  end if;
  if pg_catalog.jsonb_typeof(p_entry) = 'object' then
    return public.longyu_clamp_mastery_level(p_entry -> 'level');
  end if;
  return public.longyu_clamp_mastery_level(p_entry);
end;
$$;

create or replace function public.longyu_merge_mastery_maps(p_old jsonb, p_new jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  old_map jsonb := '{}'::jsonb;
  new_map jsonb := '{}'::jsonb;
  merged jsonb := '{}'::jsonb;
  key text;
  old_lvl integer;
  new_lvl integer;
  entry jsonb;
begin
  old_map := coalesce(p_old, '{}'::jsonb);
  new_map := coalesce(p_new, '{}'::jsonb);
  if pg_catalog.jsonb_typeof(old_map) is distinct from 'object' then
    old_map := '{}'::jsonb;
  end if;
  if pg_catalog.jsonb_typeof(new_map) is distinct from 'object' then
    new_map := '{}'::jsonb;
  end if;

  for key in
    select distinct k from (
      select pg_catalog.jsonb_object_keys(old_map) as k
      union
      select pg_catalog.jsonb_object_keys(new_map) as k
    ) keys
  loop
    old_lvl := public.longyu_mastery_entry_level(old_map -> key);
    new_lvl := public.longyu_mastery_entry_level(new_map -> key);
    if new_map ? key then
      entry := new_map -> key;
      if pg_catalog.jsonb_typeof(entry) is distinct from 'object' or entry is null then
        entry := pg_catalog.jsonb_build_object('level', pg_catalog.greatest(old_lvl, new_lvl));
      else
        entry := entry || pg_catalog.jsonb_build_object('level', pg_catalog.greatest(old_lvl, new_lvl));
      end if;
    else
      entry := old_map -> key;
      if pg_catalog.jsonb_typeof(entry) is distinct from 'object' or entry is null then
        entry := pg_catalog.jsonb_build_object('level', old_lvl);
      else
        entry := entry || pg_catalog.jsonb_build_object('level', old_lvl);
      end if;
    end if;
    merged := merged || pg_catalog.jsonb_build_object(key, entry);
  end loop;

  return merged;
end;
$$;

create or replace function public.merge_progress_mastery_monotonic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_map jsonb := '{}'::jsonb;
  new_map jsonb := '{}'::jsonb;
  merged jsonb := '{}'::jsonb;
  old_lessons text[] := '{}';
  new_lessons text[] := '{}';
  union_lessons text[];
begin
  if tg_op = 'INSERT' then
    old_map := '{}'::jsonb;
    old_lessons := '{}';
  else
    old_map := coalesce(old.client_snapshot #> '{progress,lessonMasteryById}', '{}'::jsonb);
    old_lessons := coalesce(old.completed_lessons, '{}');
  end if;

  if tg_op = 'UPDATE' and new.client_snapshot is null then
    new.client_snapshot := coalesce(old.client_snapshot, '{}'::jsonb);
  end if;
  if new.client_snapshot is not null
     and pg_catalog.jsonb_typeof(new.client_snapshot) is distinct from 'object' then
    if tg_op = 'UPDATE' then
      new.client_snapshot := coalesce(old.client_snapshot, '{}'::jsonb);
    else
      new.client_snapshot := '{}'::jsonb;
    end if;
  end if;

  if new.client_snapshot is not null then
    new_map := coalesce(new.client_snapshot #> '{progress,lessonMasteryById}', '{}'::jsonb);
    merged := public.longyu_merge_mastery_maps(old_map, new_map);
    if new.client_snapshot -> 'progress' is null
       or pg_catalog.jsonb_typeof(new.client_snapshot -> 'progress') is distinct from 'object' then
      new.client_snapshot := pg_catalog.jsonb_set(new.client_snapshot, '{progress}', '{}'::jsonb, true);
    end if;
    new.client_snapshot := pg_catalog.jsonb_set(
      new.client_snapshot,
      '{progress,lessonMasteryById}',
      merged,
      true
    );
  end if;

  new_lessons := coalesce(new.completed_lessons, '{}');
  select coalesce(pg_catalog.array_agg(distinct x), '{}')
    into union_lessons
  from pg_catalog.unnest(old_lessons || new_lessons) as x
  where x is not null and pg_catalog.length(pg_catalog.btrim(x)) > 0;
  new.completed_lessons := coalesce(union_lessons, '{}');

  return new;
end;
$$;

drop trigger if exists trg_progress_mastery_monotonic on public.user_progress;
create trigger trg_progress_mastery_monotonic
  before insert or update on public.user_progress
  for each row
  execute function public.merge_progress_mastery_monotonic();

comment on function public.longyu_clamp_mastery_level(jsonb) is
  'VALID LEVELS = integer 0..4. Sanitize malformed jsonb without raising.';
comment on function public.longyu_mastery_entry_level(jsonb) is
  'Read lessonMasteryById entry; non-object entries sanitize to 0..4.';
comment on function public.longyu_merge_mastery_maps(jsonb, jsonb) is
  'GREATEST clamped level per key; null/array maps become {}.';
comment on function public.merge_progress_mastery_monotonic() is
  'HOST-002/003: monotonic GREATEST mastery, clamp 0..4, search_path empty, INSERT+UPDATE.';

revoke all on function public.longyu_clamp_mastery_level(jsonb) from public, anon, authenticated;
revoke all on function public.longyu_mastery_entry_level(jsonb) from public, anon, authenticated;
revoke all on function public.longyu_merge_mastery_maps(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.merge_progress_mastery_monotonic() from public, anon, authenticated;

commit;
