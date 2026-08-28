-- V4.7.7 — server-side monotonic mastery / completed_lessons.
-- Client last-write-wins on user_progress.client_snapshot can regress 2/4 → 1/4.
-- BEFORE UPDATE merges lessonMasteryById by GREATEST(level) and unions completed_lessons.
-- Not applied to MandarimProject this remessa.

begin;

create or replace function public.merge_progress_mastery_monotonic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_map jsonb := '{}'::jsonb;
  new_map jsonb := '{}'::jsonb;
  merged jsonb := '{}'::jsonb;
  key text;
  old_lvl integer;
  new_lvl integer;
  entry jsonb;
  old_lessons text[] := '{}';
  new_lessons text[] := '{}';
  union_lessons text[];
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  old_map := coalesce(old.client_snapshot #> '{progress,lessonMasteryById}', '{}'::jsonb);
  new_map := coalesce(new.client_snapshot #> '{progress,lessonMasteryById}', '{}'::jsonb);
  if jsonb_typeof(old_map) is distinct from 'object' then
    old_map := '{}'::jsonb;
  end if;
  if jsonb_typeof(new_map) is distinct from 'object' then
    new_map := '{}'::jsonb;
  end if;

  for key in
    select distinct k from (
      select jsonb_object_keys(old_map) as k
      union
      select jsonb_object_keys(new_map) as k
    ) keys
  loop
    old_lvl := coalesce(nullif(old_map -> key ->> 'level', '')::integer, 0);
    new_lvl := coalesce(nullif(new_map -> key ->> 'level', '')::integer, 0);
    if new_map ? key then
      entry := new_map -> key;
      if jsonb_typeof(entry) is distinct from 'object' or entry is null then
        entry := jsonb_build_object('level', greatest(old_lvl, new_lvl));
      else
        entry := entry || jsonb_build_object('level', greatest(old_lvl, new_lvl));
      end if;
    else
      entry := old_map -> key;
    end if;
    merged := merged || jsonb_build_object(key, entry);
  end loop;

  if new.client_snapshot is null then
    new.client_snapshot := coalesce(old.client_snapshot, '{}'::jsonb);
  end if;
  if jsonb_typeof(new.client_snapshot) is distinct from 'object' then
    new.client_snapshot := coalesce(old.client_snapshot, '{}'::jsonb);
  end if;
  if new.client_snapshot -> 'progress' is null
     or jsonb_typeof(new.client_snapshot -> 'progress') is distinct from 'object' then
    new.client_snapshot := jsonb_set(new.client_snapshot, '{progress}', '{}'::jsonb, true);
  end if;
  new.client_snapshot := jsonb_set(
    new.client_snapshot,
    '{progress,lessonMasteryById}',
    merged,
    true
  );

  old_lessons := coalesce(old.completed_lessons, '{}');
  new_lessons := coalesce(new.completed_lessons, '{}');
  select coalesce(array_agg(distinct x), '{}')
    into union_lessons
  from unnest(old_lessons || new_lessons) as x
  where x is not null and length(trim(x)) > 0;
  new.completed_lessons := coalesce(union_lessons, '{}');

  return new;
end;
$$;

drop trigger if exists trg_progress_mastery_monotonic on public.user_progress;
create trigger trg_progress_mastery_monotonic
  before update on public.user_progress
  for each row
  execute function public.merge_progress_mastery_monotonic();

comment on function public.merge_progress_mastery_monotonic() is
  'Server-side monotonic mastery: GREATEST(level) per lessonMasteryById key; union completed_lessons.';

revoke all on function public.merge_progress_mastery_monotonic() from public, anon, authenticated;

commit;
