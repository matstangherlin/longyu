# V4.7.6 — Staging Backend Activation + Live Validation

Atualizado em: 2026-08-28T00:32:00Z  
Branch: `cursor/v476-staging-live-validation-3618`  
Decisão desta remessa: **`STAGING_BLOCKED_BY_INFRASTRUCTURE`**

**Não é autorização de closed beta.** Automação não preenche PASS humano.
`PHYSICAL_QA_READY`, `PAYMENTS_READY` e `READY_FOR_CLOSED_BETA_BR` **estão fora desta remessa** e não são marcados.

Produção (não tocar): MandarimProject `drjcfalvlbbeblmmyhwj`.  
Atomurus (não usar como banco Longyu, não pausar): `ylofdottauzcqcifnnpm`.

Aceite V4.7.6 só fecha com evidência live nos cinco campos operacionais (staging, auth, placement, sync, security staging) e P0 = 0. **Nenhum desses campos é PASS nesta remessa.**

## Scoreboard (REPORT-032)

| Campo | Valor | Evidência |
| --- | --- | --- |
| `CODE_READY` | **PASS** no SHA `b2a5818` | PR #203: Portão de qualidade, E2E Chromium, E2E Firefox, Security (CodeQL / npm audit / gitleaks) SUCCESS. **Não promove** nenhum outro campo. |
| `CROSS_BROWSER_READY` | **PASS** no SHA `b2a5818` | Firefox job SUCCESS (gate). WebKit SUCCESS informativo. |
| `STAGING_READY` | **BLOCKED_BY_INFRASTRUCTURE** | Humano: preview **sem utilidade**; **não** pausar atomurus. MandarimProject é o backend que importa — **sem DDL**. Sem ambiente isolado. |
| `AUTH_READY` | **BLOCKED** | AUTH-011…016 exigem staging `ACTIVE_HEALTHY`. Não executado. |
| `PLACEMENT_READY` | **BLOCKED** | Contrato de código: servidor recalcula evidência. Intercept live **não rodou**. |
| `SYNC_READY` | **BLOCKED** | 0/4 → 1/4 → 2/4 → 4/4 live **não rodou**. |
| `SECURITY_STAGING_READY` | **BLOCKED** | RLS A≠B e advisors **no staging** não rodaram. Advisors de produção não relabelam este campo. |
| `PHYSICAL_QA_READY` | **NOT_RUN** | Fora desta remessa. |
| `PAYMENTS_READY` | **NOT_RUN** | Fora desta remessa. Stripe Live **não** usado. |
| `READY_FOR_CLOSED_BETA_BR` | **NOT_READY** | Decisão humana. Permanece NOT_READY. |

Nenhum campo operacional acima é `PASS`.

## PRE-001 — Confirmar main

`git fetch origin main` em 2026-08-28T00:31Z.

| Item | Valor |
| --- | --- |
| `origin/main` SHA | `b2a5818af1182277ac61c699970b1e3e868ded12` |
| mensagem | `fix(ops): use Web Crypto for correlation ids` |
| merged via | [#203](https://github.com/matstangherlin/longyu/pull/203) 2026-08-27T23:32:09Z |
| `LONGYU_RC` | `v4.7.4-rc.1` |
| Journey fingerprint (`npm run rc:identity`) | `fb7ac3c5d18a` |
| Placement version | `2` |
| schema expected version | `1` |
| store version | `20` |
| Edges esperadas (repo) | `create-account` (verify_jwt false), `commit-placement` (true), `finalize-onboarding` (true), `submit-business-lead` (false), `create-checkout-session` (true), `create-billing-portal` (true), `stripe-webhook` (false), `delete-account` (true), `issue-anon-ingestion-session` (false) |
| Web Crypto correlation | `src/lib/opsCorrelation.ts` usa `crypto.randomUUID` / `getRandomValues`; sem Web Crypto **lança** antes do invoke |

Main **não mudou** depois da validação do SHA `b2a5818`. Chromium/Firefox/Security **não** reexecutados nesta passagem (mesmo SHA).

Gates daquele SHA (GitHub, não inventado):

| Gate | Conclusão |
| --- | --- |
| Portão de qualidade (`validate:beta` + build) | SUCCESS |
| Testes E2E (Playwright / Chromium) | SUCCESS |
| E2E cross-engine Firefox | SUCCESS |
| E2E WebKit | SUCCESS (informativo) |
| npm audit / CodeQL / gitleaks | SUCCESS |

## PRE-002 — Estado vivo + rollback da pausa do atomurus

Reconsulta MCP 2026-08-28T00:06Z.

| project_id | nome | região | status | papel |
| --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | **produção Longyu — único backend que importa; HARD FAIL como staging** |
| `wpnmygzxqvmpdlcuwrjp` | longyu-preview | us-west-1 | **INACTIVE** | **sem utilidade** (decisão humana). Não é caminho de staging. |
| `ylofdottauzcqcifnnpm` | atomurus | us-west-2 | **ACTIVE_HEALTHY** | outro produto. **Não pausar.** |

Org Noba `cwvlptpndrekubhhtoln` plan **free** (`2 project limit` do owner `matstangherlin`).

### Rollback (2026-08-27T23:55Z → 2026-08-28T00:06Z)

Automação interpretou “prossiga no que está faltando” como opção D e pausou atomurus. Humano **revogou**: não pode pausar atomurus; preview não tem utilidade; MandarimProject é o que importa.

| passo | resultado |
| --- | --- |
| `pause_project(atomurus)` | executado por engano → ficou INACTIVE |
| `restore_project(longyu-preview)` | chegou a `ACTIVE_HEALTHY` (slot livre) |
| humano: não pausar atomurus / preview sem utilidade | — |
| `pause_project(longyu-preview)` | INACTIVE de novo |
| `restore_project(atomurus)` | **ACTIVE_HEALTHY** |
| MandarimProject | **ACTIVE_HEALTHY**; watermark inalterado `20260810175737` `beta_experience_telemetry` |
| migrations / Edge em qualquer projeto | **zero** |

### Reconsulta 2026-08-28T00:32Z (esta passagem)

MCP `list_projects` + `get_project` + `get_organization` + `restore_project(preview)` **sem pausar nada**.

| project_id | nome | status |
| --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` MandarimProject | produção | ACTIVE_HEALTHY |
| `wpnmygzxqvmpdlcuwrjp` longyu-preview | staging pretendido nesta spec | **INACTIVE** |
| `ylofdottauzcqcifnnpm` atomurus | outro produto | ACTIVE_HEALTHY |

Org Noba plan **free**. `restore_project(wpnmygzxqvmpdlcuwrjp)` → `ForbiddenException` **2 project limit** (`matstangherlin`). Atomurus **não** pausado. MandarimProject **não** escrito (watermark `20260810175737` `beta_experience_telemetry`). **PARADA** — spec §4.

`get_cost` (nada criado, sem `confirm_cost`): projeto isolado monthly **0** (ainda bloqueado pelo cap Free); branch hourly **0.01344** (branch em MandarimProject **não** é staging isolado Longyu).

## Decisão humana (obrigatória)

**`STAGING_BLOCKED_BY_INFRASTRUCTURE`**

Esta spec lista:

| Ação humana | Estado nesta conversa |
| --- | --- |
| Liberar slot Free | Só há MandarimProject + atomurus ativos. Humano **já proibiu** pausar atomurus. |
| Upgrade Supabase (org Noba) | Aberto (**B**) |
| Projeto staging pago isolado | Aberto (**C**); cotado $0/mês mas o cap Free de 2 projetos ainda impede criar o 3º |
| Branch paga | Cotada $0.01344/h; **não criada**. Branch em produção ≠ staging Longyu isolado |
| Autorização explícita para pausar outro projeto | **Revogada** para atomurus |

Não usar produção como staging. Sem workaround.

## STG-003 — Hard guard

Scripts exigem `LONGYU_STAGING_PROJECT_ID`.

| Alvo | Código |
| --- | --- |
| produção `drjcfalvlbbeblmmyhwj` | `REFUSING_TO_USE_PRODUCTION_AS_STAGING` |
| atomurus `ylofdottauzcqcifnnpm` | `REFUSING_FOREIGN_PRODUCT_AS_STAGING` |
| vazio | `REFUSING_EMPTY_STAGING_PROJECT_ID` |
| id não listado | `REFUSING_UNKNOWN_STAGING_PROJECT` |

Allowlist padrão: só `wpnmygzxqvmpdlcuwrjp`. Projeto isolado pago só com `LONGYU_STAGING_ALLOWED_PROJECT_IDS` **depois** de autorização humana. Allowlist **não** contorna produção nem atomurus.

`migrate:staging` / `deploy:staging-functions` / harnesses também exigem `ACTIVE_HEALTHY` no projeto remoto.

## STG-004 — Staging identity

**BLOCKED.** Sem `ACTIVE_HEALTHY` não há identity live.

Pretendido (metadata pausada, não consultável):

| campo | valor |
| --- | --- |
| project id | `wpnmygzxqvmpdlcuwrjp` |
| nome | longyu-preview |
| região | us-west-1 |
| URL | https://wpnmygzxqvmpdlcuwrjp.supabase.co |
| database version | 17.6.1.155 (Management API; banco pausado) |
| status | INACTIVE |
| timestamp | 2026-08-27T23:46Z |

Nenhum secret registrado.

## STG-005 — Migration inventory vivo

Três estados. Produção **não** modificada.

**Produção** (`list_migrations` MandarimProject, 2026-08-27T23:46Z). Watermark:

`20260810175737` `beta_experience_telemetry` (34 versões timestamped).

**Staging:** inconsultável (INACTIVE). Não assumir banco vazio.

**Repo** (listagem do diretório nesta sessão; não confiar em lista memorizada). Depois do watermark de produção, as sete migrations timestamped do repo **continuam** sendo:

| version | name | status |
| --- | --- | --- |
| 20260812180000 | production_help_telemetry | BLOCKED (não aplicada) |
| 20260813180000 | pearl_pro_economy | BLOCKED |
| 20260814010000 | mastery_pass_telemetry | BLOCKED |
| 20260825043000 | business_foundation | BLOCKED |
| 20260825062000 | business_operational_hardening | BLOCKED |
| 20260826230000 | placement_onboarding | BLOCKED |
| 20260827023000 | placement_onboarding_handoff | BLOCKED |

Nenhuma migration nova além dessa lista nesta HEAD.

## STG-006 — Migration dry audit

**NOT_RUN.** Sem staging `ACTIVE_HEALTHY` não há schema remoto para conferir dependências. SQL do repo existe; dry-run vivo **não** executado. Nenhum write.

## STG-007 — Aplicar migrations

**NOT_RUN / BLOCKED.** `--apply` recusado sem `ACTIVE_HEALTHY`. MandarimProject intocado. Nenhuma migration posterior aplicada.

## STG-008 — Schema contract

**BLOCKED.** Esperado quando o staging existir:

Tabelas: `placement_attempts`, `placement_onboarding_drafts`, `business_leads`, `pearl_ledger`.

`profiles`: `country_code`, `interface_locale`, `instruction_locale`, `native_language`, `target_language`, `onboarding_completed`.

Script: `npm run assert:staging-schema` (recusa produção/atomurus/desconhecido; SQL só após healthy).

## STG-009 — Edge Functions

**NOT_RUN.** `deploy:staging-functions` exige `ACTIVE_HEALTHY` e recusa produção.

Árvore do repo (fonte desta RC) a implantar **só em staging**:

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

Produção (`list_edge_functions` MandarimProject, 2026-08-27T23:46Z) confirma as seis ACTIVE acima. Nenhum `deploy_edge_function` nesta remessa.

## STG-010 — Secrets

Classificação **sem valores** (`npm run audit:staging-secrets`). Staging vault inalcançável:

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

Stripe Live **não** foi usado.

## AUTH-011 — Conta real

**BLOCKED.** Sem staging `ACTIVE_HEALTHY`.

Harness `npm run v476:auth-identity` cria user via **Admin API `email_confirm` (FIXTURE)**. Isso **não** é AUTH-011 (signup real na Landing) nem AUTH-013 (e-mail em nova aba). Sem credenciais = exit 2 BLOCKED.

## AUTH-012 — Placement draft

**BLOCKED.** Exige signup + `placement_onboarding_drafts` no staging.

## AUTH-013 — Nova aba (crítico)

**NOT_RUN.** (Mapeamento: AUTH-009 da remessa anterior.) Fechar aba original, limpar storage, confirmar em outro contexto: **não executado**.

## AUTH-014 — Outro dispositivo

**NOT_RUN.**

## AUTH-015 — Missing draft

**NOT_RUN.** Copy de código já existe (`Precisamos finalizar seu ponto de partida.` / refazer Placement). Live **não** rodou.

## AUTH-016 — Idempotência

**NOT_RUN.** Finalize duas vezes / concorrente: não executado.

## PLACEMENT-017 — Client distrust

Contrato no repo (não é PASS live):

`supabase/functions/commit-placement/index.ts` lê `declaredExperience` + `answers`. **Não** lê `score`, `skippedLessonIds` nem `masteredByPlacement` do body. Recalcula com `evaluatePlacementEvidence`.

Harness: `npm run v476:placement-authority` (`scripts/v476-placement-authority.mjs`). Sem staging/Edge = **BLOCKED**. Intercept HTTP de browser: **NOT_RUN**.

## PLACEMENT-018 / PLACEMENT-019

**NOT_RUN.** TRUE_BEGINNER / BASIC / INTERMEDIATE / ADVANCED / INCONSISTENT / HINT_DEPENDENT exigem commit live.

## SYNC-020 … SYNC-023

**BLOCKED.** Harness `npm run v476:sync-identity`: device A grava 1 lição, device B lê e grava 2, A relê; tenta regressão via upsert cru. Sem credenciais = exit 2. Anti-regressão do app hoje é sobretudo no client (`supabaseLearningRepository`). 4/4 live, conflito concorrente e reload no meio: **NOT_RUN**.

## FAIL-024 — Network failures

**NOT_RUN.** Offline / timeout Edge / 500 / double click exigem staging + UI.

## OBS-025 — Correlation runtime

Código de correlação está em `main` (`src/lib/opsCorrelation.ts`, SHA `b2a5818`). Headers: `x-longyu-correlation-id`, `x-longyu-session-id`, `x-longyu-op`. Runtime staging: **NOT_RUN**. Nenhum log de Edge de staging foi puxado.

## OBS-026 — Observability must not break product

**Decisão de contrato (código, não evidência live):** **A** para geração de IDs.

`randomId()` exige Web Crypto (`randomUUID` ou `getRandomValues`). Se ambos faltarem, **lança** `Web Crypto RNG unavailable for ops correlation` **antes** de `functions.invoke` (signup, placement, finalize, checkout, etc.). A operação **não começa**. Não há “frontend acha que falhou + servidor processou”.

Envio: os headers vão no **mesmo** `invoke` que o body. Não há retry automático de Edge a partir da correlação.

Degradação permitida: `noteOps` no `console` é best-effort; falha de `sessionStorage` (modo privado) cai para memória e ainda exige Web Crypto.

O que **não** pode ocorrer continua proibido: processar no backend + UI sem confirmação + retry duplicando. Runtime live **NOT_RUN**.

## OBS-027 — Teste de contrato (código)

`npm run validate:client-diagnostics` afirma:

- `randomId()` lança `Web Crypto RNG unavailable for ops correlation` se não houver Web Crypto;
- `edgeOpsInit` ocorre **antes** de `functions.invoke` em signup, placement, finalize e checkout.

Isso **não** promove `STAGING_READY`. Live OBS-025 continua NOT_RUN.

## SEC-027 — USER A ≠ USER B

**NOT_RUN.** `npm run test:rls:staging` recusa produção, atomurus, URL mismatch e id desconhecido. Sem `ALLOW_STAGING_SECURITY_TESTS` + credenciais de staging.

## SEC-028 — Service role boundaries

**NOT_RUN** no staging. Auditoria de grants SECURITY DEFINER exige schema healthy.

## SEC-029 — Advisors

**NOT_RUN.** Não relabelar advisors de MandarimProject. Ver `docs/reports/staging-supabase-advisors.md` (BLOCKED).

## REC-030 — Password recovery

**NOT_RUN.**

## BUS-031 — Business smoke

**NOT_RUN.** Lead form / anti-spam / RLS de organization exigem staging. Sem Business Admin novo. Segurança não é opcional; smoke B2C não-crítico pode ser FOLLOW_UP **depois** de evidência, não agora.

## PROD-033 — Zero production writes

Zero `apply_migration` / `deploy_edge_function` / Stripe Live / flag Netlify production nesta remessa.

`list_migrations` MandarimProject **depois** do merge da #203: watermark **inalterado** `20260810175737` `beta_experience_telemetry`.

GitHub App **Supabase Preview** no push da `main` `b2a5818`: **FAILURE** fail-closed (`Remote migration versions not found in local migrations directory.`). Dashboard aponta para produção. **Não aplicou DDL.** Não copiar o watermark de produção para o repo para “ficar verde”. Não desligar o app nesta remessa.

`list_branches` MandarimProject: só o git default `main` (`MIGRATIONS_FAILED`). Nenhum preview branch novo. Isso **não** é staging Longyu.

`VITE_CLOUD_ONBOARDING_V2_ENABLED=false` no Netlify production permanece.

## BUG-034

Nenhum P0/P1 de staging revelado: live **não rodou**. Nenhum feature novo.

## CI-035

SHA desta branch após a guarda STG-003: ver HEAD do PR. Gates locais desta correção: `test:staging-activation` + `test:v476-live-validation`. Chromium/Firefox da RC permanecem os do SHA `b2a5818`.

## Como desbloquear

Depois de um staging `ACTIVE_HEALTHY` (opção A/B/C/D):

`identify:staging` → dry audit → `migrate:staging` **uma a uma** (parar no primeiro erro) → `assert:staging-schema` → `deploy:staging-functions` → auth/placement/sync/RLS/advisors live.

#203 já está em `main`.

## Comandos

```bash
npm run test:v476-live-validation   # portão de código (validate:beta)
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:live
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run audit:staging-secrets
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:placement-authority
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:auth-identity
LONGYU_STAGING_PROJECT_ID=wpnmygzxqvmpdlcuwrjp npm run v476:sync-identity
```
