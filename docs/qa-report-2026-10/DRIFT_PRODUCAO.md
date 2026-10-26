# Drift de produção — LGY-001, LGY-002, LGY-003, LGY-039

Leitura de 26/10/2026 (America/São Paulo). Nada daqui foi aplicado. O ledger (`docs/launch/production-migration-ledger.json`) foi lido em 08/10/2026: 36 linhas em produção, 58 arquivos no repo, 19 `MATCH`, 29 `REPO_ONLY`, 11 `UNKNOWN`, 6 `PROD_ONLY`, status `BLOCKED`.

## O que já se sabe, em dez linhas

1. O ledger só marca `MATCH` quando o SQL normalizado é igual. Nome igual com corpo diferente fica `UNKNOWN`. Não reaplicar esses arquivos.
2. `001`–`010` estão `REPO_ONLY` como baseline pré-histórico. Os objetos podem existir com outro nome de migration. Não replayar o bloco.
3. `005_social.sql` está nesse grupo. Ao vivo (24–25/10) `user_follows`, `social_activity_events` e `search_public_profiles` responderam 404.
4. `20260808070849_secure_social_profile_boundary.sql` está `MATCH`, mas o arquivo pula as RPCs quando `user_follows` não existe. `MATCH` não prova que o social existe.
5. `20260826230000_placement_onboarding.sql` e `20260827023000_placement_onboarding_handoff.sql` estão `REPO_ONLY`. Os dois dizem "staging only". O lote B (`rc2-3-10d-batch-b-placement.json`) chama o handoff de irreversível sem backup.
6. `instruction_locale` nasce nesse handoff. O cliente em `src/services/courseDirectionSync.ts` faz `select` e `update` dessa coluna. Ela não está em `knownMissingBackend.json`, então o 400 aparece em /jornada, /perfil e /conta.
7. O lote A (`rc2-3-10-league-memberships-policy-recursion`) está `BLOCKED`: falta backup verificado e aprovação do dono. O plano free não tem PITR (`production-backup-runbook.md`, 08/10/2026).
8. `claim_mission` (arquivo `20260808140000_economy_anti_cheat_qi.sql`) está `UNKNOWN` com SQL aplicado fora do histórico. Não reexecutar.
9. Não há projeto de staging (`LONGYU_STAGING_PROJECT_ID` vazio no checklist). `assert:staging-schema` recusa o projeto de produção.
10. `course_direction` não é coluna em nenhuma migration, e o `main` não seleciona essa coluna. O 400 ao vivo citou `instruction_locale`.

## Leitura GET/OPTIONS em 26/10/2026

`npm run check:schema-health` contra produção, só a anon key pública. Exit 1.

| Resultado | Objetos |
|---|---|
| `missing_column` | `profiles.instruction_locale` (reproduz o 400 do LGY-001) |
| `ok` | `profiles.native_language`, `profiles.updated_at` |
| `missing_table` (aviso, gated) | `user_follows`, `social_activity_events` |
| `not_verifiable` | as quatro RPCs. O OpenAPI do PostgREST não veio em `GET /rest/v1/`. A query `pg_proc` está na saída do script |
| `missing_function` | `finalize-onboarding`, `commit-placement` (bloqueiam o exit), `submit-business-lead` (aviso, gated) |
| `ok` | `create-checkout-session`, `create-billing-portal`, `delete-account`, `issue-anon-ingestion-session` |

Checkout, portal, delete-account e anon ingestion **estão** publicadas. O 404 do relatório não vale para essas quatro. Vale para placement e para `submit-business-lead`.

## Inventário que o front usa

`gated` segue `knownMissingBackend.json` → `domains`. O bloco `notGatedHere` (placement) não é gate: o health check trata como falta bloqueante.

| Objeto | Quem cria | Ledger / snapshot 08/10 | Gate | Aplicar? |
|---|---|---|---|---|
| `profiles.instruction_locale` | `20260827023000` (junto com o handoff) | `REPO_ONLY` | não | sim, pelo arquivo novo `qa-03-profiles-instruction-locale.sql`, não pelo handoff |
| `profiles.native_language` | `001_initial_schema.sql` | baseline pré-histórico; a tabela `profiles` existe | não | não. Conferir com o health check |
| `profiles.updated_at` | schema inicial | idem | não | não |
| `profiles.course_direction` | não existe no repo | — | — | não criar. O `main` não lê essa coluna |
| `user_follows` | `005_social.sql` | `REPO_ONLY`; 404 ao vivo | social | sim, por `qa-03-social-minimum.sql` |
| `social_activity_events` | `005_social.sql` | idem | social | o mesmo arquivo |
| `search_public_profiles` | `005`, endurecido em `20260808070849` | hardening `MATCH` mas pulou a função | social | o mesmo arquivo reexecuta o bloco |
| `get_public_profile_by_username` | idem | idem | social | idem |
| `get_public_profiles_by_ids` | `20260808070849` | idem | social | idem |
| `claim_mission` | última definição em `20260808140000_economy_anti_cheat_qi.sql` | `UNKNOWN`, placeholder | não | não reaplicar. O health check diz se a RPC está no OpenAPI |
| `finalize-onboarding` | `supabase/functions/finalize-onboarding` | ausente; flag V2 off | não (`notGatedHere`) | não neste PR. Deploy é o prompt 05 |
| `commit-placement` | `supabase/functions/commit-placement` | ausente; ainda alcançável com a flag V2 off | não | prompt 05, depois do SQL de placement |
| `submit-business-lead` | `supabase/functions/submit-business-lead` | 404 ao vivo; o checklist antigo dizia publicada | business | prompt 05. Fora da beta (decisão do prompt 05: esconder) |
| `create-checkout-session` | Edge | o checklist de agosto marca checkout publicado; CORS é LGY-004 | não | não redeployar aqui. Prompt 05 |
| `create-billing-portal` | Edge | idem | não | prompt 05 |
| `delete-account` | Edge | idem | não | prompt 05 |
| `issue-anon-ingestion-session` | Edge | conferir no health check | não | prompt 05 se vier 404 |

## Ordem proposta

Nada entra em produção até o backup do runbook e um ok explícito. Staging ainda não existe (prompt 12). Enquanto não houver staging, o único candidato pequeno é o item 1.

| Ordem | Arquivo | Risco | Reversão |
|---|---|---|---|
| 1 | `supabase/pending/qa-03-profiles-instruction-locale.sql` | Aditivo. `ADD COLUMN … DEFAULT` trava `profiles` por um instante. Não backfill. | `.down.sql` com o `DROP COLUMN` comentado. Manter a coluna é mais seguro |
| 2 | `supabase/pending/qa-03-social-minimum.sql` | Cria tabelas vazias, policies e três RPCs `security definer` com `search_path` vazio. Também acrescenta colunas em `profiles` (`show_in_search`, `league_tier`, `avatar_key`, XP/streak públicos) se faltarem. Não mexe em username | `.down.sql` dropa funções e as duas tabelas. Drop de coluna fica comentado |
| — | `20260826230000_placement_onboarding.sql` | Schema novo de placement. Cabeçalho: staging only | não aplicar neste lote |
| — | `20260827023000_placement_onboarding_handoff.sql` | Backfill de `country_code`. Lote B: irreversível sem backup. A coluna `instruction_locale` já está coberta pelo item 1 | não aplicar neste lote |
| — | `005_social.sql` | Recria a policy `profiles_select_social`, que o hardening já removeu, e mexe no check de username que `rc2-2-11` já aplicou | não replayar |
| — | lote A `rc2-3-10-league-memberships-policy-recursion.sql` | Já tem `.down.sql`. Bloqueado por backup e aprovação | fora deste PR |
| — | Edge Functions | Deploy, não SQL | prompt 05, depois do SQL de que elas dependem |

O DAG de `scripts/release/build-migration-dependency-dag.mjs` não inclui os arquivos novos de `supabase/pending/`. A ordem acima é a dependência real: a coluna não depende de placement; o social não depende da coluna; placement continua atrás dos dois.

## O que não fazer

Não rodar `supabase db push`, `npm run db:push` nem `npm run db:apply-api`. Não reexecutar migration `UNKNOWN`. Não publicar o front novo por cima deste schema sem `npm run check:schema-health` verde para os itens sem gate.
