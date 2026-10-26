# Checklist — aplicar o drift (o Matty executa)

Projeto de produção: `drjcfalvlbbeblmmyhwj` (MandarimProject). O agente não aplica nada. A ordem e o risco estão em `DRIFT_PRODUCAO.md`. Pare no primeiro erro.

## 0. Antes

1. Backup, nesta ordem, seguindo `docs/launch/production-backup-runbook.md`. O plano é free: não há PITR.
   - `npm run verify:production-backup` (o preflight não substitui o dump).
   - `npx supabase db dump` de schema e de dados, arquivo fora do git.
2. Staging ainda não existe (LGY-039, prompt 12). Sem staging, não aplique o pacote social nem placement. A coluna `instruction_locale` é o único passo que cabe discutir antes do staging, e mesmo assim só com o backup do passo 1.
3. `npm run assert:staging-schema` quando o projeto de staging existir. Ele recusa o ref de produção. `npm run test:rls:staging` no staging, nunca com a service role apontando para produção.

## 1. Coluna `instruction_locale`

1. No SQL Editor do **staging** (ou, se ainda não houver staging, só depois do backup e de um ok seu), cole `supabase/pending/qa-03-profiles-instruction-locale.sql`.
2. Confira: `\d public.profiles` mostra `instruction_locale text not null default 'pt-BR'`.
3. `NOTIFY` já está no arquivo. Se o 400 continuar, rode `notify pgrst, 'reload schema';` de novo.

## 2. Social

Só no staging primeiro.

1. Cole `supabase/pending/qa-03-social-minimum.sql`.
2. Não cole `005_social.sql`.
3. Confira as duas tabelas, as três funções e se `profiles_select_social` **não** voltou.

## 3. Produção

Uma migration por vez, na ordem 1 depois 2. Janela curta. Entre uma e outra:

```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run check:schema-health
```

A anon key é a pública. Não use `service_role`. O script recusa outro método que não GET/HEAD/OPTIONS.

Depois das duas:

1. Abra /jornada, /perfil e /conta com a conta de teste. O select de `instruction_locale` não pode mais ser 400.
2. /amigos pode continuar sem 404 só depois do social **e** do prompt 04 (o gate do cliente). Enquanto o domínio social estiver em `knownMissingBackend.json`, o health check lista essas faltas como aviso, não como falha.
3. Atualize `docs/launch/production-migration-ledger.json` numa PR seguinte, com o que foi aplicado de verdade. Não edite o ledger no escuro.

Edge Functions (`commit-placement`, `finalize-onboarding`, checkout, delete-account, anon ingestion) não entram neste checklist. São o prompt 05.

`npm run test:schema-health` fica fora da suíte `release-truth`. Incluir o passo obrigaria regenerar `docs/release/gate-registry.json` e `product-truth.json`, e o gate de convergência recusa essa regeneração neste PR.

## Se der errado

1. Rode o `.down.sql` do arquivo que acabou de aplicar. O da coluna deixa o `DROP` comentado de propósito. O do social dropa funções e tabelas novas.
2. Se o `.down.sql` não bastar, restaure o dump do passo 0. Não há PITR.
3. Não improvise um segundo `alter` por cima do erro.
