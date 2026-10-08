# OWNER_NEXT_ACTIONS - RC2.3.10B (1 página)

Estado: `cloud.certification = BLOCKED`. Nada abaixo exige copiar senha, chave ou token para o repositório, para o PR ou para o chat. Onde um valor é público (SHA, versão), diz isso.

## NÃO FAÇA (ainda)

- **Apply Beta Feedback** e **Deploy Leagues** agora falham fechados (RC2.3.10C): não reaplicam o histórico nem `004_leagues.sql`. `npm run db:apply-api` também recusa o projeto de produção. Não contorne isso com SQL solto no editor.
- **Não rode** "Configure Supabase Auth" nem `configure-supabase-auth`: ele **substitui** a lista de Redirect URLs e não inclui `longyu.noba.com://auth/callback`.
- Não aplique nenhuma migration de `supabase/pending/` à mão. Só via `PRODUCTION_MIGRATION_READY`.

## FAÇA AGORA

1. **SHA no ar: já identificado pelo agente, você só confirma** (`OA-PROD-WEB-SHA`, 1 min, opcional). Em 2026-10-08 o site serve `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` (`ec26ffc`, o `[release]` do #320): `version.json` e o bundle em execução trazem o mesmo SHA e ele está na `main` (`docs/launch/rc2-3-10b-web-sha.json`, `docs/reports/rc2-3-10b-production-web-sha.md`). A `main` está 1 commit à frente (#321, sem `[release]`), então o Netlify pulou o deploy: é o esperado. O que o agente **não** consegue ver é o registro do deploy no Netlify (sem token). Para fechar o gate: Netlify > Deploys > confirme que o deploy publicado é o de `ec26ffc` e responda no PR #322. Se `version.json` mostrar outro SHA no futuro, rode `npm run web-sha:rc2-3-10b`.
2. **Triage com guardrails** (`OA-JEV-CONSOLE-CHECK`, 5 min, **só depois do merge** em `main`).
   1. TypeSafe console: anote só o número de créditos restantes.
   2. GitHub > Actions > **Deploy Edge Function (manual, from main)** > **Run workflow**.
   3. Branch `main`; function `triage-feedback`; confirm `DEPLOY-triage-feedback`; expected_sha = SHA do merge; **Run**.
   4. Confira em Supabase > Edge Functions > `triage-feedback` que a versão passou de 1 para 2.
3. **Smoke de nuvem** (`OA-CLOUD-SMOKE-RUN`, 3 min; já pode rodar, o SHA do item 1 é conhecido).
   1. GitHub > Settings > Secrets and variables > Actions: confirme que existem os **nomes** `VITE_SUPABASE_ANON_KEY`, `LONGYU_QA_EMAIL`, `LONGYU_QA_PASSWORD` (conta QA semeada, nunca aluno real). Não abra os valores.
   2. Actions > **Cloud smoke (manual, production)** > Run workflow > expected_sha = `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` (ou o `commitSha` atual, se um novo `[release]` foi publicado).
   3. Anexe o artifact `cloud-smoke-report` ao PR (não contém segredo).
4. **Redirect URLs de login** (`OA-AUTH-REDIRECT-URLS`, 3 min). Supabase Dashboard > projeto **MandarimProject** > Authentication > URL Configuration > Redirect URLs > **Add URL**, uma por vez, sem apagar as existentes:
   - `https://singular-meringue-7838cd.netlify.app/auth/callback`
   - `longyu.noba.com://auth/callback`
   Save changes.
5. **Backup antes de qualquer migration** (`OA-DATA-EXPORT`, 20 min, plano free não tem backup). Siga `docs/launch/production-backup-runbook.md` §2 a §5 num terminal seu. Guarde o arquivo **fora do repositório**, criptografado. No PR cole só: data, ref do projeto, SHA candidato e contagem de linhas por tabela. Ensaie antes com `npm run backup:production-preflight -- --dest <pasta fora do repo>` (dry-run, não conecta a nada).
6. **Decisões** (responda no PR, sem clique técnico):
   - `OA-LEAGUE-POLICY-FIX`: aprovar `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` para a primeira migration controlada? (recomendado: sim; revisão em `docs/reports/rc2-3-10b-league-policy-review.md`: o helper está correto, `search_path` vazio, sem EXECUTE para `anon`. Mudança de comportamento a aceitar: depois do fix, `authenticated` consegue ler direto as linhas da mesma divisão/semana, um subconjunto do que `get_league_standings` já devolve. Alternativa menor: policy só da própria linha, sem helper.)
   - `OA-TELEMETRY-RETENTION-DECISION`: A = 30 dias bruto + agregados (recomendado), B = 60, C = 90.
   - `OA-PRIVACY-SNAPSHOT-EMAIL`: remover o e-mail dos snapshots novos? (recomendado: sim, mudança de código na RC2.3.11). **Escopo ampliado (novo, `F-SPEECH-1`):** o snapshot da nuvem copia todos os campos da conta, inclusive o texto das respostas escritas **ou ditadas** que o aluno errou (`mistakeHistory.userAnswer`). Não é áudio. Decida: snapshot por lista permitida (recomendado) ou citar "respostas escritas" na política de privacidade. Detalhe: `docs/reports/rc2-3-10b-speech-privacy.md`.
   - `OA-JEV-TMP-TABLE`: exportar e depois apagar `public._jev_triage_tmp`? (só depois do item 5)
   - `OA-MIGRATION-RECONCILIATION-DECISION`: manter o histórico como está e tratar o ledger como fonte de verdade (recomendado, não destrutivo).

## DEPOIS (nesta ordem, cada um depende do anterior)

1. Item 5 concluído + decisões do item 6 -> `OA-273-RUNBOOK-APPROVAL` (aprovar o runbook de schema diff + export).
2. Agente reaplica `OA-SCHEMA-DIFF` (diff por coluna já feito em 2026-10-08: `docs/launch/rc2-3-10b-schema-column-diff.json`, 79 achados, `BLOCKED`; refazer se tiver mais de 7 dias) e prepara o pedido `PRODUCTION_MIGRATION_READY` (SHA, diff <= 7 dias, ledger, backup verificado, revisão, down, sua aprovação). Só então migrations: league fix, placement (2 arquivos, o segundo é irreversível sem backup), retenção em dry-run.
3. Depois das migrations (elas também criam as 9 colunas de `profiles` que faltam, entre elas `instruction_locale`, hoje lida e escrita pelo app e inexistente na produção; o app falha em silêncio e o curso escolhido não volta da conta): deploy de `commit-placement` e `finalize-onboarding`; só então `create-account` novo. Nunca antes (`docs/launch/rc2-3-10b-edge-parity.json`).
4. Diff fonte-vs-repo das Edge Functions implantadas (`DIFF_FIRST`) e das 3 funções econômicas `PROD_ONLY` (`docs/launch/rc2-3-10b-prod-only-classification.json`).
5. Config de provedores, sem pressa: domínio no Resend, SMTP no Supabase Auth, Google/Apple/Microsoft, projeto Sentry, ensaio de rollback, teste OAuth no Android físico.
6. Aceite final do dono (`OA-OWNER-CLOUD-ACCEPTANCE`) por último.

## Novos achados desta rodada (nada foi aplicado)

- **Prova estática, sem pendência do dono:** o aluno não executa o Jev (nenhum host/chave no código nem nos 167 chunks do site no ar); a gravação de voz não é enviada (cache do aparelho, apagada); o traço do hànzì não é guardado (só contadores). `docs/launch/rc2-3-10b-static-proofs.json`. Ressalva honesta: o reconhecimento de fala pode ser processado pelo serviço do navegador/Android; a política deve dizer "não enviamos sua gravação", não "o áudio nunca sai do aparelho".
- **Produção:** `anon` tem privilégio total de tabela em 31 das 37 tabelas (só a RLS protege). As migrations de menor privilégio estão no repo e não aplicadas; entram no `PRODUCTION_MIGRATION_READY` junto com o league fix.
- **Economia:** os atributos das 17 funções batem com o repo, mas 3 delas (`claim_mission`, `grant_story_energy`, `grant_lesson_reward`) têm corpo que nenhum arquivo do repo descreve. Não chame a economia de endurecida antes do diff de corpo (`DIFF_FIRST`).

Referências: `docs/reports/rc2-3-10b-closure.md` (matriz), `docs/release/owner-actions.json` (lista completa), `docs/reports/rc2-3-10b-schema-column-diff.md`.
