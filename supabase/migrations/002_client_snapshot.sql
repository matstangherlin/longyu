-- Snapshot completo do cliente para migração gradual (Fase C).
alter table public.user_progress
  add column if not exists client_snapshot jsonb,
  add column if not exists client_snapshot_version integer not null default 1;

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);
