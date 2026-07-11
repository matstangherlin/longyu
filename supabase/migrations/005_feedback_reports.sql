-- Feedback interno: relatos de beta salvos no Supabase com RLS.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in (
    'bug',
    'conteúdo incorreto',
    'dificuldade pedagógica',
    'design',
    'sugestão',
    'conta/sync',
    'pagamento',
    'outro'
  )),
  severity text not null check (severity in ('baixa', 'média', 'alta', 'bloqueadora')),
  message text not null check (char_length(trim(message)) between 10 and 4000),
  expected_behavior text check (expected_behavior is null or char_length(trim(expected_behavior)) <= 2000),
  route text not null default '',
  lesson_id text,
  step_id text,
  app_version text not null default '',
  build_sha text not null default '',
  browser text not null default '',
  platform text not null default '',
  viewport text not null default '',
  status text not null default 'novo' check (status in (
    'novo',
    'analisando',
    'reproduzido',
    'corrigido',
    'não reproduzido',
    'encerrado'
  )),
  admin_notes text,
  submitter_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_reports_user_id_idx on public.feedback_reports (user_id);
create index if not exists feedback_reports_status_idx on public.feedback_reports (status);
create index if not exists feedback_reports_created_at_idx on public.feedback_reports (created_at desc);
create index if not exists feedback_reports_submitter_hash_idx on public.feedback_reports (submitter_hash, created_at desc)
  where user_id is null;

create or replace function public.touch_feedback_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_reports_set_updated_at on public.feedback_reports;
create trigger feedback_reports_set_updated_at
  before update on public.feedback_reports
  for each row execute function public.touch_feedback_reports_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.feedback_reports enable row level security;

-- Usuário autenticado insere apenas relatos próprios.
create policy "feedback_reports_insert_own"
  on public.feedback_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Usuário comum não lê relatos (nem os próprios) — confirmação vem do retorno do insert.
-- Somente admin lista e atualiza.
create policy "feedback_reports_select_admin"
  on public.feedback_reports
  for select
  to authenticated
  using (public.is_admin());

create policy "feedback_reports_update_admin"
  on public.feedback_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
