# OWNER_NEXT_ACTIONS - RC2.3.10B (1 página)

Estado: `cloud.certification = BLOCKED`. Nada abaixo exige copiar senha, chave ou token para o repositório, para o PR ou para o chat. Onde um valor é público (SHA, versão), diz isso.

## NÃO FAÇA (ainda)

- **Não rode** a Action "Apply Beta Feedback" (nem `npm run db:apply-api`) contra produção: ela reaplica **todas** as migrations do repositório em ordem e sobrescreve funções de segurança mais novas (`004`, `006`, `013`, `017`). **Não rode** "Deploy Leagues": reaplica `004_leagues.sql`, que recria a policy com recursão.
- **Não rode** "Configure Supabase Auth" nem `configure-supabase-auth`: ele **substitui** a lista de Redirect URLs e não inclui `longyu.noba.com://auth/callback`.
- Não aplique nenhuma migration de `supabase/pending/` à mão. Só via `PRODUCTION_MIGRATION_READY`.

## FAÇA AGORA

1. **Prova do SHA no ar** (`OA-PROD-WEB-SHA`, 2 min). Abra `https://singular-meringue-7838cd.netlify.app/version.json`. Anote `commitSha`, `curriculumFingerprint`, `buildChannel` (todos públicos) e cole no PR #322. Se `commitSha` não for um SHA de `main` depois de `ec26ffc`: Netlify > Deploys > último deploy > log > procure `[netlify-ignore]`.
2. **Triage com guardrails** (`OA-JEV-CONSOLE-CHECK`, 5 min, **só depois do merge** em `main`).
   1. TypeSafe console: anote só o número de créditos restantes.
   2. GitHub > Actions > **Deploy Edge Function (manual, from main)** > **Run workflow**.
   3. Branch `main`; function `triage-feedback`; confirm `DEPLOY-triage-feedback`; expected_sha = SHA do merge; **Run**.
   4. Confira em Supabase > Edge Functions > `triage-feedback` que a versão passou de 1 para 2.
3. **Smoke de nuvem** (`OA-CLOUD-SMOKE-RUN`, 3 min, depois do item 1).
   1. GitHub > Settings > Secrets and variables > Actions: confirme que existem os **nomes** `VITE_SUPABASE_ANON_KEY`, `LONGYU_QA_EMAIL`, `LONGYU_QA_PASSWORD` (conta QA semeada, nunca aluno real). Não abra os valores.
   2. Actions > **Cloud smoke (manual, production)** > Run workflow > expected_sha = o `commitSha` do item 1.
   3. Anexe o artifact `cloud-smoke-report` ao PR (não contém segredo).
4. **Redirect URLs de login** (`OA-AUTH-REDIRECT-URLS`, 3 min). Supabase Dashboard > projeto **MandarimProject** > Authentication > URL Configuration > Redirect URLs > **Add URL**, uma por vez, sem apagar as existentes:
   - `https://singular-meringue-7838cd.netlify.app/auth/callback`
   - `longyu.noba.com://auth/callback`
   Save changes.
5. **Backup antes de qualquer migration** (`OA-DATA-EXPORT`, 20 min, plano free não tem backup). Siga `docs/launch/production-backup-runbook.md` §2 a §5 num terminal seu. Guarde o arquivo **fora do repositório**, criptografado. No PR cole só: data, ref do projeto, SHA candidato e contagem de linhas por tabela. Ensaie antes com `npm run backup:production-preflight -- --dest <pasta fora do repo>` (dry-run, não conecta a nada).
6. **Decisões** (responda no PR, sem clique técnico):
   - `OA-LEAGUE-POLICY-FIX`: aprovar `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` para a primeira migration controlada? (recomendado: sim)
   - `OA-TELEMETRY-RETENTION-DECISION`: A = 30 dias bruto + agregados (recomendado), B = 60, C = 90.
   - `OA-PRIVACY-SNAPSHOT-EMAIL`: remover o e-mail dos snapshots novos? (recomendado: sim, mudança de código na RC2.3.11)
   - `OA-JEV-TMP-TABLE`: exportar e depois apagar `public._jev_triage_tmp`? (só depois do item 5)
   - `OA-MIGRATION-RECONCILIATION-DECISION`: manter o histórico como está e tratar o ledger como fonte de verdade (recomendado, não destrutivo).

## DEPOIS (nesta ordem, cada um depende do anterior)

1. Item 5 concluído + decisões do item 6 -> `OA-273-RUNBOOK-APPROVAL` (aprovar o runbook de schema diff + export).
2. Agente reaplica `OA-SCHEMA-DIFF` e prepara o pedido `PRODUCTION_MIGRATION_READY` (SHA, diff <= 7 dias, ledger, backup verificado, revisão, down, sua aprovação). Só então migrations: league fix, placement (2 arquivos, o segundo é irreversível sem backup), retenção em dry-run.
3. Depois das migrations: deploy de `commit-placement` e `finalize-onboarding`; só então `create-account` novo. Nunca antes (`docs/launch/rc2-3-10b-edge-parity.json`).
4. Diff fonte-vs-repo das Edge Functions implantadas (`DIFF_FIRST`) e das 3 funções econômicas `PROD_ONLY` (`docs/launch/rc2-3-10b-prod-only-classification.json`).
5. Config de provedores, sem pressa: domínio no Resend, SMTP no Supabase Auth, Google/Apple/Microsoft, projeto Sentry, ensaio de rollback, teste OAuth no Android físico.
6. Aceite final do dono (`OA-OWNER-CLOUD-ACCEPTANCE`) por último.

Referências: `docs/reports/rc2-3-10b-closure.md` (matriz), `docs/release/owner-actions.json` (lista completa).
