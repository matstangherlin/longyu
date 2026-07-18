-- Consentimento de analytics pedagógicos no perfil (não só localStorage).
-- Default false: o aluno precisa escolher explicitamente.

alter table public.profiles
  add column if not exists pedagogy_analytics_consent boolean not null default false,
  add column if not exists pedagogy_analytics_consented_at timestamptz,
  add column if not exists pedagogy_analytics_revoked_at timestamptz;

comment on column public.profiles.pedagogy_analytics_consent is
  'Opt-in para eventos pedagógicos anônimos de melhoria do curso.';
comment on column public.profiles.pedagogy_analytics_consented_at is
  'Quando o aluno permitiu dados de melhoria pela última vez.';
comment on column public.profiles.pedagogy_analytics_revoked_at is
  'Quando o aluno revogou o consentimento pela última vez.';

-- Aluno autenticado pode atualizar só o próprio consentimento (já há policy de update own).
-- Garante default false em linhas antigas sem a coluna.
update public.profiles
set pedagogy_analytics_consent = false
where pedagogy_analytics_consent is distinct from true
  and pedagogy_analytics_consented_at is null;
