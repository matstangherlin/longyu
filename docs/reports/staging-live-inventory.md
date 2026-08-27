# Staging live inventory (V4.7.5 discovery)

Consultado via MCP Supabase em **2026-08-27T22:18Z**. Org **Noba** `cwvlptpndrekubhhtoln`, plano **free**.

**Nenhuma migration, Edge, pause ou upgrade foi aplicada.** MandarimProject permanece intocado. atomurus permanece intocado.

`STAGING_READY` permanece **NOT_READY**. Isto não promove AUTH / PLACEMENT / SYNC / SECURITY / READY_FOR_CLOSED_BETA_BR.

## STG-001 — Disponibilidade

| project_id | nome | region | status | papel |
| --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | **produção — HARD FAIL** como alvo de staging |
| `wpnmygzxqvmpdlcuwrjp` | longyu-preview | us-west-1 | INACTIVE | staging pretendido |
| `ylofdottauzcqcifnnpm` | atomurus | us-west-2 | ACTIVE_HEALTHY | outro produto — não usar |

`list_migrations` em `longyu-preview`: **timeout** (projeto pausado). `list_edge_functions` no mesmo id: lista vazia (metadata alcançável; runtime de funções não é evidência de staging saudável).

Tentativa `restore_project` em `wpnmygzxqvmpdlcuwrjp` (2026-08-27T22:17Z):

```text
ForbiddenException: The following organization members have reached their maximum
limits for the number of active free projects within organizations where they are
an administrator or owner: matstangherlin (2 project limit). To continue, these
users will need to either delete, pause or upgrade one or more of these projects.
```

Custo consultado (não confirmado, não cobrado):

| Ação | Recorrência | Valor |
| --- | --- | --- |
| Novo projeto | monthly | 0 |
| Branch Supabase | hourly | 0.01344 |

Novo projeto Free **ainda esbarra no limite de 2**. Branch em MandarimProject já falhou nesta org com `PaymentRequiredException` (plano Free) — **não repetido**.

### Decisão humana necessária (um de)

1. **Upgrade** da org Noba (Free → plano que permita 3º projeto e/ou branching).
2. **Autorização explícita** para pausar `atomurus` (outro produto) e então restaurar `longyu-preview`. **Não** pausar MandarimProject.
3. **Autorização explícita** + confirmação de custo para um projeto/branch pago isolado, com `LONGYU_STAGING_PROJECT_ID` ≠ `drjcfalvlbbeblmmyhwj`.

Sem uma dessas decisões: STG-003…STG-011 permanecem **NOT_RUN**.

## STG-002 — Migrations (repo vs produção vs staging)

Watermark de produção **vivo** (MCP `list_migrations`): último registro `20260810175737` `beta_experience_telemetry`. Confirma o inventário anterior.

Staging: **inconsultável** (INACTIVE / timeout). Não inventar APPLIED.

### Pendentes no repo (depois do watermark) — NÃO aplicar em produção

| version | name | production | staging |
| --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | NOT_APPLIED | BLOCKED |
| 20260813180000 | pearl_pro_economy | NOT_APPLIED | BLOCKED |
| 20260814010000 | mastery_pass_telemetry | NOT_APPLIED | BLOCKED |
| 20260825043000 | business_foundation | NOT_APPLIED | BLOCKED |
| 20260825062000 | business_operational_hardening | NOT_APPLIED | BLOCKED |
| 20260826230000 | placement_onboarding | NOT_APPLIED | BLOCKED |
| 20260827023000 | placement_onboarding_handoff | NOT_APPLIED | BLOCKED |

Prova SQL read-only em MandarimProject (sem PII):

| objeto | em produção? |
| --- | --- |
| `public.placement_onboarding_drafts` | ausente |
| `public.placement_attempts` | ausente |
| `public.business_leads` | ausente |
| `public.pearl_ledger` | ausente |
| `profiles.onboarding_completed` | presente (schema inicial, default false) |
| `profiles.country_code` | ausente |

Ordem de aplicação **quando** staging estiver `ACTIVE_HEALTHY`: uma por uma, validar schema/RLS/RPC, parar no primeiro erro. Scripts com alvo MandarimProject saem 2 (`HARD FAIL`).

## STG-004 — Edge Functions (identidade, sem deploy)

Esperadas pelo RC (`src/lib/releaseCandidate.ts`): nove slugs.

### Produção (MandarimProject) — ACTIVE

| slug | version | verify_jwt | updated_at (UTC) | SHA fonte (ezbr) |
| --- | --- | --- | --- | --- |
| create-checkout-session | 10 | true | 2026-08-04T07:46:28Z | `ae00f519…d73241` |
| create-billing-portal | 9 | true | 2026-08-04T07:46:54Z | `f9666afb…6821c5` |
| stripe-webhook | 11 | false | 2026-08-08T13:45:38Z | `168827ae…a6f6c6` |
| delete-account | 10 | true | 2026-08-08T07:51:07Z | `2d435219…ff5c64c` |
| create-account | 8 | false | 2026-08-08T20:07:36Z | `04e0c375…1fd5e18` |
| issue-anon-ingestion-session | 3 | false | 2026-08-08T13:44:40Z | `5713d1e8…f3f47bf` |

### Ausentes em produção (esperado — V4.7.1+ ainda não vai a prod)

| slug | verify_jwt (repo `config.toml`) |
| --- | --- |
| commit-placement | true |
| finalize-onboarding | true |
| submit-business-lead | false |

**Não implantar estas três em MandarimProject nesta remessa.** Destino: staging isolado.

Staging (`longyu-preview`): lista de funções vazia.

## Advisors

Security e Performance Advisors **rodaram em produção** como baseline. **Não** são STG-009.

| Advisor | projeto | status | totais |
| --- | --- | --- | --- |
| Security | MandarimProject | BASELINE_ONLY | 57 (INFO 13, WARN 44). Sem ERROR. |
| Performance | MandarimProject | BASELINE_ONLY | 61 (INFO 37, WARN 24). Sem ERROR. |
| Security | longyu-preview | NOT_RUN | INACTIVE |
| Performance | longyu-preview | NOT_RUN | INACTIVE |

Security produção (contagem, não remediação aqui):

- 27 `authenticated_security_definer_function_executable` (RPCs de economia/referral — padrão conhecido)
- 14 `function_search_path_mutable`
- 13 `rls_enabled_no_policy` (tabelas service-role / sem policy client)
- 2 `anon_security_definer_function_executable` (`submit_beta_feedback`, `submit_beta_pedagogy_event`)
- 1 `auth_leaked_password_protection` desligado

Isto **não** marca `SECURITY_READY = PASS`. STG-009 exige A≠B e advisors **depois** das migrations no staging.

## STG-011 — Observability (código no repo; runtime NOT_RUN)

Cliente envia `x-longyu-correlation-id` / `x-longyu-session-id` / `x-longyu-op` em signup, placement, finalize, checkout, portal, delete-account, anon ingestion, business lead. Logs `[longyu-ops]` **sem** email/senha/token.

Edges no repo leem o header (create-account, commit-placement, finalize-onboarding) e o webhook loga `stripeEventId` + type. **Não implantado** em MandarimProject nem em longyu-preview.

## RLS produção (baseline, não é STG-009)

Read-only `pg_policies` em MandarimProject:

| tabela | policies |
| --- | --- |
| profiles | insert_own, select_own, update_own |
| user_progress | insert_own, select_own, update_own |
| user_srs | insert_own, select_own, update_own |
| user_economy | select_own |
| subscriptions | select_own |

A≠B live (USER_A vs USER_B) **não** rodou. `SECURITY_READY` permanece NOT_READY.

## STG-003…STG-010

NOT_RUN. Bloqueados por STG-001.

Produção: **zero DDL, zero Edge nova, zero pause, zero Stripe Live.**
