# Staging Activation Log (V4.7.3 / V4.7.4 / V4.7.5 / V4.7.6)

## V4.7.6 — live identity (BLOCKED_BY_INFRASTRUCTURE)

Atualizado em: 2026-08-28T00:06:00Z  
Relatório: `docs/reports/v476-staging-live-validation.md`.

PRE-001: `origin/main` `b2a5818` (#203). Qualidade + Chromium + Firefox + Security SUCCESS.  
PRE-002 rollback: pausa acidental do atomurus **revertida** (`ACTIVE_HEALTHY`). `longyu-preview` INACTIVE (humano: sem utilidade). MandarimProject intocado.  
STG-003: `REFUSING_TO_USE_PRODUCTION_AS_STAGING`. Opções A/D revogadas.  
STG-005…SEC-029 / AUTH / SYNC: **NOT_RUN**. Scoreboard operacional **BLOCKED_BY_INFRASTRUCTURE**.

---

# Staging Activation Log (V4.7.3 / V4.7.4 / V4.7.5)

Atualizado em: 2026-08-27T22:18:00Z

## V4.7.5 — live MCP (não aplicar)

Consulta autenticada. Relatório: `docs/reports/staging-live-inventory.md`.

| ID | Status | Nota |
| --- | --- | --- |
| STG-001 | BLOCKED | `longyu-preview` INACTIVE. `restore_project` → `ForbiddenException` **2 project limit** (`matstangherlin`). Org Noba **free**. |
| STG-002 | INVENTORY_LIVE | Watermark produção confirmado `20260810175737` `beta_experience_telemetry`. Sete migrations do repo **não** aplicadas. Staging inconsultável (timeout). |
| STG-003…STG-011 | NOT_RUN | Sem `ACTIVE_HEALTHY` isolado. |

**Não** pausar `atomurus`. **Não** pausar MandarimProject. **Não** implantar `commit-placement` / `finalize-onboarding` / `submit-business-lead` em produção.

Decisão humana (um de): upgrade da org; autorização para pausar atomurus e restaurar preview; projeto/branch pago isolado com confirmação de custo.

---

## V4.7.4 — reconfirmação (não aplicar)

Esta remessa **não** sobe staging. `STAGING_READY = NOT_READY`.

| ID | Status | Nota |
| --- | --- | --- |
| STG-001 | BLOCKED | `longyu-preview` `wpnmygzxqvmpdlcuwrjp` INACTIVE. Não improvisar em MandarimProject. |
| STG-002 | INVENTORY_ONLY | `npm run inventory:staging-migrations`. Ver `docs/reports/staging-migration-inventory.md`. |
| STG-003…STG-011 | NOT_RUN | Exigem staging ACTIVE_HEALTHY. V4.7.5 depois do merge da RC. |

Decisão humana necessária (um de): restaurar `longyu-preview`; liberar slot Free; upgrade + branch; projeto pago isolado. **Não** pausar `atomurus` nem tocar produção sem autorização.

---

# Staging Activation Log (V4.7.3)

Atualizado em: 2026-08-27T04:10:00Z
Branch: `cursor/v47-3-staging-activation-1519`
Pré-condições humanas **não** cumpridas:

1. PR #197 continua draft, sem review, **não mergeada**. Quality + Security verdes; E2E cross-engine informativo FAILURE.
2. PR #198 continua draft, empilhada em #197 (não em `main`), **não mergeada**.
3. Staging isolado **não** está `ACTIVE_HEALTHY`.

Nenhuma migration nova foi aplicada em produção. Nenhuma Edge nova foi implantada em produção.

## STAGE-001 — Identificar staging

Inventário MCP `list_projects` em 2026-08-27T03:50:00Z (org Noba `cwvlptpndrekubhhtoln`):

| project_id | project name | region | status | Supabase URL | Papel |
| --- | --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | https://drjcfalvlbbeblmmyhwj.supabase.co | **produção — HARD FAIL** |
| `wpnmygzxqvmpdlcuwrjp` | longyu-preview | us-west-1 | INACTIVE | https://wpnmygzxqvmpdlcuwrjp.supabase.co | staging pretendido |
| `ylofdottauzcqcifnnpm` | atomurus | us-west-2 | ACTIVE_HEALTHY | https://ylofdottauzcqcifnnpm.supabase.co | outro produto — não usar |

Proteção: `LONGYU_STAGING_PROJECT_ID` + `scripts/lib/staging-guard.mjs`.
`npm run identify:staging` com id de produção sai 2 (`HARD FAIL`).

Alvo selecionável hoje: `wpnmygzxqvmpdlcuwrjp` — **BLOCKED** (`INACTIVE`).

## STAGE-002 — Migrations

Não executado (staging INACTIVE). `npm run migrate:staging` recusa produção e **para no primeiro erro**.

Pendentes vs produção `20260810175737` `beta_experience_telemetry`:

| version | name | status | timestamp | duration | error |
| --- | --- | --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260813180000 | pearl_pro_economy | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260814010000 | mastery_pass_telemetry | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260825043000 | business_foundation | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260825062000 | business_operational_hardening | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260826230000 | placement_onboarding | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |
| 20260827023000 | placement_onboarding_handoff | BLOCKED | 2026-08-27T04:10:00Z | — | staging INACTIVE |

## STAGE-004 — Edge Functions

Não implantado. `npm run deploy:staging-functions` recusa produção.

| slug | version | verify_jwt | deployed_at | smoke status |
| --- | --- | --- | --- | --- |
| create-account | repo | false | — | NOT_RUN |
| commit-placement | repo | true | — | NOT_RUN |
| finalize-onboarding | repo | true | — | NOT_RUN |
| submit-business-lead | repo | false | — | NOT_RUN |
| create-checkout-session | repo | true | — | NOT_RUN |
| create-billing-portal | repo | true | — | NOT_RUN |
| stripe-webhook | repo | false | — | NOT_RUN |
| delete-account | repo | true | — | NOT_RUN |
| issue-anon-ingestion-session | repo | false | — | NOT_RUN |

`scripts/deploy-backend.mjs` e `deploy-functions-env.mjs` agora listam as nove funções.
Deploy de produção destas funções **não** foi feito nesta remessa.
