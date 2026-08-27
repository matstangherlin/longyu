# V4.7.6 — Staging Backend Activation & Live Identity Validation

Atualizado em: 2026-08-27T22:49:41Z  
Branch: `cursor/v476-staging-live-validation-3618`  
Base: `origin/main` `79abef6` (não empilhada na #203)

**Não é autorização de closed beta.** Automação não preenche PASS humano.
`PHYSICAL_QA_READY`, `PAYMENTS_READY` e `READY_FOR_CLOSED_BETA_BR` **estão fora desta remessa** e não são marcados.

Produção (não tocar): MandarimProject `drjcfalvlbbeblmmyhwj`.  
Atomurus (não usar como banco Longyu, não pausar): `ylofdottauzcqcifnnpm`.

## Scoreboard

| Campo | Valor | Evidência |
| --- | --- | --- |
| `STAGING_READY` | **BLOCKED** | `longyu-preview` `wpnmygzxqvmpdlcuwrjp` está `INACTIVE`. `restore_project` recusado (`ForbiddenException`, **2 project limit** Free, owner `matstangherlin`). Org Noba `cwvlptpndrekubhhtoln` plan **free**. |
| `AUTH_READY` | **BLOCKED** | Signup / nova aba / segundo device exigem staging `ACTIVE_HEALTHY`. Não executado. |
| `PLACEMENT_READY` | **BLOCKED** | Contrato de código: servidor recalcula evidência (ver PLACEMENT-012). Intercept live **não rodou**. |
| `SYNC_READY` | **BLOCKED** | 1/4 → 2/4 cross-device exige conta real no staging. Não executado. |
| `SECURITY_STAGING_READY` | **BLOCKED** | RLS A≠B e advisors **no staging** exigem `ACTIVE_HEALTHY`. Não executado. Advisors de produção não relabelam este campo. |

Nenhum campo acima é `PASS`.

## PRE-001 — Estado de #203

#203 **não está mergeada**.

| Item | Valor em 2026-08-27T22:49:41Z |
| --- | --- |
| URL | https://github.com/matstangherlin/longyu/pull/203 |
| state | OPEN |
| mergedAt | null |
| HEAD | `b2a5818` |
| `origin/main` | `79abef6` |
| Portão de qualidade (`validate:beta` + build) | **IN_PROGRESS** |
| E2E Chromium | não iniciado neste rollup |
| E2E Firefox | não iniciado neste rollup |
| npm audit | SUCCESS |
| CodeQL (javascript-typescript) | SUCCESS |
| Secret scan (gitleaks) | SUCCESS |
| CodeQL (check extra) | SUCCESS neste HEAD (`b2a5818`; o HEAD anterior `c5ca7b1` tinha 3 high `js/insecure-randomness`) |
| mergeStateStatus | BLOCKED |

Esta remessa **não** empilha código da #203. V4.7.6 parte de `main` e permanece BLOCKED até:

1. #203 mergeada na `main` com qualidade + Chromium + Firefox + Security **PASS neste HEAD**;
2. staging isolado `ACTIVE_HEALTHY` com `LONGYU_STAGING_PROJECT_ID` ≠ `drjcfalvlbbeblmmyhwj`.

## STG-002 — Staging obrigatório

Inventário MCP `list_projects` (2026-08-27T22:42Z):

| project_id | nome | região | status | papel |
| --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | **produção — HARD FAIL** |
| `wpnmygzxqvmpdlcuwrjp` | longyu-preview | us-west-1 | INACTIVE | staging pretendido |
| `ylofdottauzcqcifnnpm` | atomurus | us-west-2 | ACTIVE_HEALTHY | outro produto — HARD FAIL como Longyu |

`requireStagingProjectId` agora recusa produção **e** atomurus.

`restore_project(wpnmygzxqvmpdlcuwrjp)` nesta sessão:

`ForbiddenException`: membros da org no limite máximo de projetos Free ativos — `matstangherlin (2 project limit)`.

Custo cotado (não confirmado, **não criado**):

| Ação | recorrência | amount | decisão |
| --- | --- | --- | --- |
| novo projeto | monthly | 0 | recusado pelo limite de 2 projetos, não por preço |
| branch Supabase | hourly | 0.01344 | **não confirmado**; branching em produção não é staging isolado Longyu |

`list_branches` em MandarimProject devolveu o branch git default `main` (`MIGRATIONS_FAILED` / preview `ACTIVE_HEALTHY`). **Não** é um ambiente Longyu de staging. Nada foi criado, mergeado ou resetado.

## STG-003 — Estado saudável

Alvo pretendido `wpnmygzxqvmpdlcuwrjp`:

| campo | valor |
| --- | --- |
| project id | `wpnmygzxqvmpdlcuwrjp` |
| nome | longyu-preview |
| região | us-west-1 |
| URL | https://wpnmygzxqvmpdlcuwrjp.supabase.co |
| database version | 17.6.1.155 (metadata Management API; banco pausado) |
| status | **INACTIVE** (não `ACTIVE_HEALTHY`) |
| timestamp | 2026-08-27T22:42Z |

`npm run identify:staging` / `v476:live` param com BLOCKED. Nenhuma migration aplicada. Nenhum deploy.

## STG-004 — Migration baseline

**Staging:** inconsultável (INACTIVE). Não assumir banco vazio; também não inventar lista remota.

**Produção** (read-only `list_migrations` MandarimProject, 2026-08-27T22:42Z). Watermark:

`20260810175737` `beta_experience_telemetry`

Aplicadas em produção (não reaplicar lá):

`pedagogy_analytics_consent` … `beta_experience_telemetry` (34 versões timestamped na API; baseline V4.7.3/V4.7.5 inalterada).

**Repo vs produção — plano ordenado SOMENTE para staging** (não executado):

| version | name | status |
| --- | --- | --- |
| 20260812180000 | production_help_telemetry | BLOCKED |
| 20260813180000 | pearl_pro_economy | BLOCKED |
| 20260814010000 | mastery_pass_telemetry | BLOCKED |
| 20260825043000 | business_foundation | BLOCKED |
| 20260825062000 | business_operational_hardening | BLOCKED |
| 20260826230000 | placement_onboarding | BLOCKED |
| 20260827023000 | placement_onboarding_handoff | BLOCKED |

`migrate:staging` agora exige `ACTIVE_HEALTHY` no project_id guardado antes de qualquer POST.

## STG-005 — Aplicar migrations

**NOT_RUN / BLOCKED.** `--apply` recusado sem `ACTIVE_HEALTHY`. MandarimProject intocado.

## STG-006 — Schema assertions

**BLOCKED.** Esperado quando o staging existir:

Tabelas: `placement_attempts`, `placement_onboarding_drafts`, `business_leads`, `pearl_ledger`.

`profiles`: `country_code`, `interface_locale`, `instruction_locale`, `native_language`, `target_language`, `onboarding_completed`.

Script: `npm run assert:staging-schema` (recusa produção/atomurus; SQL só após healthy).

## STG-007 — Edge deployment

**NOT_RUN.** `deploy:staging-functions` exige `ACTIVE_HEALTHY` e recusa produção.

Árvore do repo a implantar **só em staging**:

| slug | verify_jwt (config.toml) | staging | produção (não implantar delta) |
| --- | --- | --- | --- |
| create-account | false | NOT_RUN | v8 ACTIVE (não atualizar) |
| commit-placement | true | NOT_RUN | **ausente em prod — não implantar lá** |
| finalize-onboarding | true | NOT_RUN | **ausente em prod — não implantar lá** |
| create-checkout-session | true | NOT_RUN | v10 ACTIVE |
| create-billing-portal | true | NOT_RUN | v9 ACTIVE |
| stripe-webhook | false | NOT_RUN | v11 ACTIVE |
| delete-account | true | NOT_RUN | v10 ACTIVE |
| issue-anon-ingestion-session | false | NOT_RUN | v3 ACTIVE |
| submit-business-lead | false | NOT_RUN | **ausente em prod — não implantar lá** |

Nenhum `deploy_edge_function` MCP nesta remessa.

## STG-008 — Secrets

Classificação **sem valores** (`npm run audit:staging-secrets`). Runner local desta sessão, staging vault inalcançável:

| nome | status | nota |
| --- | --- | --- |
| LONGYU_STAGING_PROJECT_ID | MISSING neste processo | pretendido: `wpnmygzxqvmpdlcuwrjp` |
| STAGING_SUPABASE_URL | MISSING | live |
| STAGING_SUPABASE_ANON_KEY | MISSING | live |
| STAGING_SUPABASE_SERVICE_ROLE_KEY | MISSING | live |
| SUPABASE_ACCESS_TOKEN | MISSING neste processo Node | MCP OAuth separado; não copiado para o runner |
| VITE_TURNSTILE_SITE_KEY | NOT_REQUIRED | opcional até signup público |
| TURNSTILE_SECRET_KEY | NOT_REQUIRED | opcional até signup público |
| STRIPE_SECRET_KEY | MISSING | somente Test Mode; `sk_live` é LIVE_REFUSED |
| STRIPE_WEBHOOK_SECRET | MISSING | Test Mode |
| STRIPE_PRICE_PRO_* | MISSING | Test Mode |
| BUSINESS_LEAD_NOTIFY_WEBHOOK_URL | NOT_REQUIRED | opcional |
| BUSINESS_LEAD_NOTIFY_TOKEN | NOT_REQUIRED | opcional |
| LONGYU_QA_EMAIL / PASSWORD | MISSING | AUTH live |

Vault do projeto INACTIVE **não** foi listado. Stripe Live **não** foi usado.

## AUTH-009 … AUTH-011

**BLOCKED.** Sem staging `ACTIVE_HEALTHY`.

Harness fail-closed (não promove PASS):

- `npm run v476:auth-identity` — cria user via **Admin API `email_confirm` (FIXTURE)**. Isso **não** é AUTH-009 (e-mail real em nova aba). Segundo `signIn` cobre AUTH-011 só como mesmo `user_id`, sem sessionStorage.
- AUTH-009/010 (link de confirmação em aba nova, sem sessionStorage original, draft → finalize) permanece **NOT_RUN** até inbox real + Edges `create-account` / `finalize-onboarding` no staging.

## PLACEMENT-012 — Server authority (código + harness)

Contrato no repo (não é PASS live):

`supabase/functions/commit-placement/index.ts` lê `declaredExperience` + `answers` (questionId, answer, hintUsed, responseMode). **Não** lê `score`, `skippedLessonIds` nem `masteredByPlacement` do body. Recalcula com `evaluatePlacementEvidence` e grava `p_score_summary` / `p_mastered_by_placement` / `p_recommended_lesson_id` a partir da analysis.

`src/services/placementCommit.ts` envia só evidência.

Harness live: `npm run v476:placement-authority` (`scripts/v476-placement-authority.mjs`) envia score/skip/mastery forjados. Sem staging/Edge = **BLOCKED**. Intercept HTTP de browser: **NOT_RUN**.

## PLACEMENT-013 — Casos

**NOT_RUN.** Fixtures de iniciante/intermediário/avançado/inconsistente/hints exigem commit live.

## SYNC-014 … SYNC-017

**BLOCKED.** Harness `npm run v476:sync-identity`: device A grava 1 lição, device B lê e grava 2, A relê; tenta regressão via upsert cru. Sem credenciais de staging o script sai 2. Anti-regressão do app hoje é sobretudo no client (`supabaseLearningRepository`); o probe live falha se o servidor aceitar snapshot menor.

## SEC-018 — RLS A≠B

**NOT_RUN.** `npm run test:rls:staging` recusa produção e URL mismatch. Sem `ALLOW_STAGING_SECURITY_TESTS` + credenciais de staging.

## SEC-019 — Advisors no staging

**NOT_RUN.** Não relabelar advisors de MandarimProject. Ver `docs/reports/staging-supabase-advisors.md` (BLOCKED).

## OBS-020 — Correlation IDs

Código de correlação está na #203 (não nesta branch `main`). Runtime staging: **NOT_RUN**. Nenhum log de Edge de staging foi puxado.

## PROGRESS-021 / RECOVERY-022

**NOT_RUN.**

## PROD-024

Zero alterações no MandarimProject nesta remessa: sem `apply_migration`, sem `deploy_edge_function`, sem Stripe Live, sem flag Netlify production.

## Como desbloquear (humano)

Um de:

1. Upgrade da org Noba **ou** pausar/excluir um projeto Free que **não** seja MandarimProject, depois restaurar `longyu-preview`.
2. Autorização explícita: “pode pausar o atomurus e restaurar o longyu-preview”.
3. Confirmar custo de branch/projeto pago isolado (`confirm_cost`) com `LONGYU_STAGING_PROJECT_ID` ≠ `drjcfalvlbbeblmmyhwj`.

Depois: merge da #203 → rebase desta branch em `main` → `identify:staging` → `migrate:staging` (parar no primeiro erro) → `deploy:staging-functions` → auth/placement/sync/RLS live.

## Comandos

```bash
npm run test:v476-live-validation   # portão de código (validate:beta)
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:live
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run audit:staging-secrets
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:placement-authority
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:auth-identity
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:sync-identity
```
