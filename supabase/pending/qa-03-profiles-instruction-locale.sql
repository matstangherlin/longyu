-- LGY-001. Só a coluna que o cliente lê em src/services/courseDirectionSync.ts.
-- Não aplica 20260827023000_placement_onboarding_handoff.sql: aquele arquivo
-- é "staging only", faz backfill de country_code e o lote B o marca como
-- irreversível sem backup. Esta migration é aditiva.

begin;

alter table public.profiles
  add column if not exists instruction_locale text not null default 'pt-BR';

comment on column public.profiles.instruction_locale is
  'Língua usada para ensinar. Coluna isolada do handoff de placement (LGY-001).';

notify pgrst, 'reload schema';

commit;
