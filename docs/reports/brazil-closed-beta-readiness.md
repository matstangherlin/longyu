# Brazil Closed Beta Readiness (V4.7.3)

Atualizado em: 2026-08-27T04:10:00Z  
Branch: `cursor/v47-3-staging-activation-1519`  
Base de codigo: V4.7.2 (`5610e7e`) empilhada em V4.7.1 (PR #197, **nao mergeada**) e V4.7.2 (PR #198, **nao mergeada**)  
Projeto de producao (nao tocar): MandarimProject `drjcfalvlbbeblmmyhwj`

## Decisao

**Estado atual: `NOT_READY`**

Esta decisao e **explicita e humana**. CI verde, Netlify preview ou este relatorio
nao promovem `READY_FOR_CLOSED_BETA_BR`.

### RELEASE-026 — Scoreboard (somente evidencia)

| Chave | Estado | Evidencia |
| --- | --- | --- |
| AUTOMATED_READY | FAIL | Gates de codigo existem; PRs #197/#198 nao estao em `main` |
| STAGING_READY | FAIL | `longyu-preview` INACTIVE; 2 project limit; branching Free recusado |
| PHYSICAL_QA_READY | NOT_RUN | Android / iPhone / desktop humanos nao executados |
| PAYMENTS_READY | NOT_RUN | Stripe Test Mode humano nao executado |
| READY_FOR_CLOSED_BETA_BR | **NOT_READY** | Criterio humano; nao inferir de CI |

`READY_FOR_CLOSED_BETA_BR` so pode ser marcado **manualmente** se todos os
criterios humanos/operacionais passarem. Esta remessa **para** para essa decisao.

### RELEASE-025 — Politica P0

P0: perda de progresso; auth bypass; pagamento incorreto; dados cruzados A≠B;
atividade impossivel no caminho inicial; crash/freeze.

P1: fluxo quebrado com workaround dificil.

P2: UX / copy / visual.

`READY_FOR_CLOSED_BETA_BR` exige **P0 = 0** com evidencia real (staging +
dispositivos + pagamentos). Nenhum P0 de fluxo real foi fechado aqui porque os
fluxos reais **nao rodaram**. Nao tratar "codigo sem P0 conhecido" como beta pronta.

## V4.7.3 — Staging Activation (execucao)

Log operacional: `docs/reports/staging-activation.md`.
Advisors de staging: `docs/reports/staging-supabase-advisors.md` (**BLOCKED**).

| ID | Item | Status |
| --- | --- | --- |
| STAGE-001 | Identificar staging | PASS (inventario) / BLOCKED (alvo INACTIVE) |
| STAGE-002 | Migrations staging | BLOCKED |
| STAGE-003 | Advisors apos DDL | BLOCKED / NOT_RUN |
| STAGE-004 | Edge Functions staging | BLOCKED |
| AUTH-005 | Signup real + email nova aba | NOT_RUN |
| AUTH-006 | Outro dispositivo | NOT_RUN |
| AUTH-007 | Missing draft (codigo presente; live) | NOT_RUN |
| AUTH-008 | Idempotencia finalize | NOT_RUN |
| PROGRESS-009 | Topic Mastery 4/4 real | NOT_RUN |
| PROGRESS-010 | Sync A→B | NOT_RUN |
| PROGRESS-011 | Failure recovery live | NOT_RUN |
| PED-012 | Foundation human QA | NOT_RUN |
| DEVICE-013 | Android Chrome fisico | NOT_RUN |
| DEVICE-014 | iPhone Safari fisico | NOT_RUN |
| DEVICE-015 | Chrome desktop fisico | NOT_RUN |
| STRIPE-016 | Test Mode checkout | NOT_RUN |
| STRIPE-017 | Cancelamento | NOT_RUN |
| STRIPE-018 | Webhook replay live | NOT_RUN |
| ECON-019 | Pearl staging harness | BLOCKED |
| RLS-020 | A≠B live | NOT_RUN |
| RECOVERY-021 | Forgot password real | NOT_RUN |
| TELEMETRY-022 | Funil live | NOT_RUN |
| COUNTRY-023 | BR default / pais ≠ ingles | PASS (codigo) |

Nao inventar HUMAN PASS. AUTH-007 tem copy e UI no repo
(`Precisamos finalizar seu ponto de partida.` + refazer Placement);
o cenario controlado com usuario cloud real permanece NOT_RUN.

### STAGE-001 inventario (MCP 2026-08-27)

| project_id | name | region | status | URL |
| --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | https://drjcfalvlbbeblmmyhwj.supabase.co |
| `wpnmygzxqvmpdlcuwrjp` | longyu-preview | us-west-1 | INACTIVE | https://wpnmygzxqvmpdlcuwrjp.supabase.co |
| `ylofdottauzcqcifnnpm` | atomurus | us-west-2 | ACTIVE_HEALTHY | https://ylofdottauzcqcifnnpm.supabase.co |

Hard fail se `LONGYU_STAGING_PROJECT_ID` == producao. Scripts:
`identify:staging`, `migrate:staging`, `deploy:staging-functions`,
`test:pearl-staging`, `test:rls:staging`.


`READY_FOR_CLOSED_BETA_BR` exige, todos PASS ao mesmo tempo:

- staging isolado
- auth real (email nova aba + outro dispositivo)
- Placement no servidor
- persistencia de progresso 4/4
- Stripe Test Mode humano
- Android fisico humano
- iPhone fisico humano
- desktop Chrome humano
- seguranca critica (RLS A≠B real + advisors revisados sem P0)

Nenhum desses itens humanos foi executado nesta remessa. Nao preencher PASS
automaticamente.

## Por que nao e `AUTOMATED_READY` ainda

1. PR #197 (V4.7.1 handoff) continua **draft, sem review, nao mergeada**.
   Quality + Security verdes; E2E cross-engine informativo FAILURE (`UNSTABLE`).
2. PR #198 (V4.7.2) continua **draft**, empilhada em #197, **nao retargetada para main**.
3. Esta PR V4.7.3 empilha em #198. Nao mergear #197, #198 nem esta PR automaticamente.
4. Staging isolado **nao subiu**. Tentativas registradas abaixo. V4.7.3 nao repetiu
   `restore_project` / `create_branch` (ultimo restore = 2 project limit).
5. Edge Functions novas (`commit-placement`, `finalize-onboarding`,
   `submit-business-lead`) **nao estao implantadas** em producao nem em staging.

Codigo desta remessa fecha guarda de staging, lista completa de Edge Functions
no deploy backend, advisors/relatorio honestos e o portao `test:staging-activation`.
Isso nao substitui QA fisico nem checkout Stripe humano.

---

## CODE

Status: **PASS** (gates de codigo; nao e promocao de beta)

| Item | Status | Evidencia |
| --- | --- | --- |
| Empilha em V4.7.2 sem merge | PASS | branch `cursor/v47-3-staging-activation-1519` |
| Guarda LONGYU_STAGING_PROJECT_ID | PASS | `scripts/lib/staging-guard.mjs` recusa producao |
| Edge list completa no deploy | PASS | 9 slugs em `deploy-backend` / `deploy-functions-env` |
| Empilha em V4.7.1 sem merge | PASS | branch criada de `80a7adf` |
| Sem seletor English | PASS | `src/lib/i18n/identity.ts` continua pt-BR → zh-CN |
| Pais canonico ISO 3166 | PASS | `CountrySelect` + `canonicalCountryCode` |
| Telemetria minima de release | PASS | `funnelEvents` + Review + Pro + pedagogia |
| Progress loading nao infinito (codigo) | PASS | `npm run test:progress-loading` |
| Placement V2 no servidor (codigo) | PASS | V4.7.1 + `test:placement-v2` |
| Webhook idempotente (codigo) | PASS | `test:subscription-webhook` |
| Sem English / SSO / SCIM / Admin / Atlas mass | PASS | fora de escopo; nao introduzidos |

Rodar: `npm run test:brazil-beta-readiness` (incluido em `validate:beta`).

---

## STAGING

Status: **BLOCKED**

### Tentativas (nao aplicar SQL em producao)

| Acao | Timestamp (UTC) | Resultado |
| --- | --- | --- |
| `get_cost` type=branch org Noba `cwvlptpndrekubhhtoln` | 2026-08-27 | `$0.01344/hora` |
| `confirm_cost` branch | 2026-08-27 | `confirmation_id` emitido |
| `create_branch` name=`v472-brazil-closed-beta` on MandarimProject | 2026-08-27 | **FAIL** `PaymentRequiredException`: branching so no plano Pro |
| `restore_project` longyu-preview `wpnmygzxqvmpdlcuwrjp` | 2026-08-27 | **FAIL** `ForbiddenException`: 2 project limit Free (`matstangherlin`) |
| `apply_migration` em `drjcfalvlbbeblmmyhwj` | — | **nao executado** (proibido por esta remessa) |
| Docker / `supabase start` local | 2026-08-27 | **indisponivel** neste ambiente (`DOCKER_MISSING`) |

Projetos visiveis:

| Projeto | Ref | Status | Papel |
| --- | --- | --- | --- |
| MandarimProject | `drjcfalvlbbeblmmyhwj` | ACTIVE_HEALTHY | producao — nao aplicar migrations novas |
| longyu-preview | `wpnmygzxqvmpdlcuwrjp` | INACTIVE | staging pretendido; restore bloqueado pelo limite Free |
| atomurus | `ylofdottauzcqcifnnpm` | ACTIVE_HEALTHY | outro produto; nao pausar daqui |

Desbloqueio humano (escolher um):

1. Upgrade MandarimProject para Pro e criar branch `v472-brazil-closed-beta`; ou
2. Pausar/apagar um projeto Free que nao seja MandarimProject e restaurar `longyu-preview` (hoje: **2 project limit**); ou
3. Provisionar um terceiro projeto pago so para staging.

### Migrations — producao vs repo

Producao aplicada ate `20260810175737` `beta_experience_telemetry`.

Repo **nao aplicado em producao** (aplicar **somente** em staging, nesta ordem):

| version | name | status em producao | resultado |
| --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | NOT_APPLIED | aguarda staging |
| 20260813180000 | pearl_pro_economy | NOT_APPLIED | aguarda staging |
| 20260814010000 | mastery_pass_telemetry | NOT_APPLIED | aguarda staging |
| 20260825043000 | business_foundation | NOT_APPLIED | aguarda staging |
| 20260825062000 | business_operational_hardening | NOT_APPLIED | aguarda staging |
| 20260826230000 | placement_onboarding | NOT_APPLIED | aguarda staging |
| 20260827023000 | placement_onboarding_handoff | NOT_APPLIED | aguarda staging |

Nao ha timestamp de apply em staging porque o ambiente nao subiu.

### BR-002 — Edge Functions

Producao (`drjcfalvlbbeblmmyhwj`) em 2026-08-27:

| slug | JWT | Status prod | Necessario no fluxo real |
| --- | --- | --- | --- |
| create-account | false | ACTIVE v8 | sim — versao do repo pode estar a frente |
| create-checkout-session | true | ACTIVE v10 | sim |
| create-billing-portal | true | ACTIVE v9 | sim |
| stripe-webhook | false | ACTIVE v11 | sim |
| delete-account | true | ACTIVE v10 | sim |
| issue-anon-ingestion-session | false | ACTIVE v3 | telemetria anonima |
| commit-placement | true (config) | **AUSENTE** | Placement autenticado |
| finalize-onboarding | true (config) | **AUSENTE** | handoff V4.7.1 |
| submit-business-lead | false (config) | **AUSENTE** | Business lead |

Arquivo no repo ≠ funcao implantada. Deploy so depois do staging existir.
Nao implantar estas funcoes novas em producao nesta PR.

Harness pronto, recusa producao: `npm run test:pearl-staging`.
Smoke RLS: `npm run test:rls` (requer staging + service_role). SQL:
`scripts/sql/rls-a-ne-b.sql` e `scripts/sql/business-rls-a-ne-b.sql`.

---

## AUTH

Status: **NOT_RUN** (codigo PASS; fluxo real BLOCKED por staging)

| ID | Cenario | Status |
| --- | --- | --- |
| AUTH-005 / BR-003 | Cadastro real ponta a ponta + email nova aba | NOT_RUN |
| AUTH-006 / BR-004 | Outro dispositivo / sem localStorage | NOT_RUN |
| AUTH-007 | Missing draft: heading + refazer Placement (live) | NOT_RUN (codigo PASS) |
| AUTH-008 / BR-021 | Finalize 2x: 1 attempt, 0 XP duplicado | NOT_RUN |
| BR-005 | Login / logout / retorno sem vazamento | NOT_RUN |
| RECOVERY-021 / BR-020 | Forgot password + progresso intacto | NOT_RUN |
| BR-022 | Falha de rede no signup/finalize | NOT_RUN |

Provas de banco exigidas quando o humano rodar BR-003 (nao inventar PASS):

- `auth.users`
- `profiles` (`onboarding_completed=true`)
- `placement_onboarding_drafts` (consumido)
- `placement_attempts`
- `user_progress`

Codigo de suporte: PR #197 (`finalize-onboarding`, draft server-side,
Journey so `cloud_ready`).

---

## PLACEMENT

Status: **NOT_RUN** (codigo PASS)

| ID | Cenario | Status |
| --- | --- | --- |
| BR-008 iniciante real | NOT_RUN |
| BR-008 intermediario controlado | NOT_RUN |
| BR-008 avancado controlado | NOT_RUN |

Contrato de codigo (nao substitui servidor real):

- cliente nao autoriza skip/mastery
- hint nao vira mastery
- Placement versionado (v2)
- commit via `commit_placement_result` / `finalize-onboarding`

---

## PROGRESS

Status: **NOT_RUN** (codigo PASS)

| ID | Cenario | Status |
| --- | --- | --- |
| PROGRESS-010 / BR-006 A | desktop → celular | NOT_RUN |
| PROGRESS-010 / BR-006 B | duas sessoes / merge | NOT_RUN |
| PROGRESS-011 / BR-007 | loading infinito em rede lenta real | NOT_RUN |
| PROGRESS-009 / BR-009 | Topic Mastery 0/4 → 4/4 com reload | NOT_RUN |

Codigo: `CLOUD_SYNC_TIMEOUT_MS = 12_000`, planner fallback, `validate:sync-merge`,
`test:topic-mastery-path`, `test:progress-loading`.

---

## PEDAGOGY

Status: **NOT_RUN**

QA humano obrigatorio dos primeiros temas (nao preencher daqui):

- O que e mandarim?
- O que e pinyin?
- O que e tom?
- O que e Hanzi?
- Cumprimentos
- Primeira conversa

Checklist humano: enunciado, acao executavel, resposta nao revelada, audio,
pinyin, Hanzi, nenhum exercicio morto.

---

## PAYMENTS

Status: **NOT_RUN**

| ID | Cenario | Status |
| --- | --- | --- |
| STRIPE-016 / BR-014 | Checkout Stripe Test Mode humano | NOT_RUN |
| STRIPE-017 / BR-015 | Cancelamento + `current_period_end` + sem Pro eterno | NOT_RUN |
| STRIPE-018 / BR-016 | Reenvio de webhook (idempotencia real) | NOT_RUN |

Codigo automatizado (nao substitui humano): `test:subscription-webhook`,
`test:entitlements`, `test:stripe-e2e` se chaves existirem.

Entitlement: `serverIsPro` efemero no persist (`partialize` zera). Logout/login
precisa reconsultar o servidor — isso e o desenho, nao cache eterno.

---

## SECURITY

Status: **FOLLOW_UP** no advisor de **producao**; RLS real **NOT_RUN**

### BR-018 RLS A≠B

Status: **NOT_RUN** / **BLOCKED** (precisa staging com migrations V4.7.1 + Business).

Nao executar o harness contra MandarimProject de producao.

Codigo atualizado para quando o staging existir:

- `scripts/test-rls-smoke.mjs` agora cobre `placement_attempts`,
  `placement_onboarding_drafts` e `organizations` se as tabelas existirem
- `scripts/sql/rls-a-ne-b.sql` idem
- Business: `scripts/sql/business-rls-a-ne-b.sql` (ja existia)

### BR-019 Advisors (producao `drjcfalvlbbeblmmyhwj`, 2026-08-27)

Advisor de **staging** nao rodou (ambiente BLOCKED). Abaixo e o dump de
**producao**, schema atrasado em relacao ao repo.

#### Security (57 findings)

| Finding | Qtde | Classificacao | Justificativa |
| --- | --- | --- | --- |
| `authenticated_security_definer_function_executable` | 27 | EXPECTED | RPCs intencionais (`ensure_own_profile`, economy, ligas, referrals, entitlement, beta feedback/pedagogy). Body usa `auth.uid()` / gates. Nao tratar SECURITY DEFINER como bug automatico. |
| `function_search_path_mutable` | 14 | FOLLOW_UP | Helpers antigos (`iso_week_key`, `economy_*`, `sanitize_pedagogy_metadata`, ...). Hardening parcial ja existe; completar `SET search_path` em staging, nao em producao nesta PR. |
| `rls_enabled_no_policy` | 13 | EXPECTED | Tabelas de servico (`beta_anon_ingestion_*`, `economy_story_sessions`, `league_xp_events`, `referral_*`, `signup_*`). RLS on + revoke de `anon`/`authenticated`; so `service_role`. |
| `anon_security_definer_function_executable` | 2 | EXPECTED | `submit_beta_feedback` e `submit_beta_pedagogy_event` com token anonimo + rate limit + sanitizacao. |
| `auth_leaked_password_protection` | 1 | FOLLOW_UP | Ligar HaveIBeenPwned no painel Auth do **staging** e depois producao. Ops, nao codigo desta PR. |

Nenhum ERROR do linter. Nenhum P0 novo aberto por este dump.

RPCs SECURITY DEFINER autenticadas (EXPECTED): `add_league_weekly_xp`,
`attribute_referral`, `claim_league_week_reward`, `claim_mission`,
`complete_referral_lesson_session`, `consume_charge`, `ensure_league_membership`,
`ensure_own_profile`, `ensure_referral_code`, `get_league_standings`,
`get_referral_dashboard`, `get_server_economy`, `get_server_entitlement`,
`grant_lesson_reward`, `grant_story_energy`, `is_beta_admin`,
`migrate_local_economy`, `open_chest`, `process_referral_pipeline`, `spend_qi`,
`start_referral_lesson_session`, `start_story_energy_session`,
`submit_beta_feedback`, `submit_beta_pedagogy_event`, `sync_league_week`,
`update_beta_feedback_admin`.

#### Performance (61 findings)

| Finding | Qtde | Classificacao | Justificativa |
| --- | --- | --- | --- |
| `unused_index` | 32 | FOLLOW_UP | Nao dropar indice em producao sem prova de query plan em staging. |
| `auth_rls_initplan` | 24 | FOLLOW_UP | Padrao `auth.uid()` em policies; wrap `(select auth.uid())` depois do staging. Nao e P0 de vazamento. |
| `unindexed_foreign_keys` | 5 | FOLLOW_UP | `economy_story_sessions.story_id`, `league_weekly_results.league_tier_id`, `referrals.referral_code_id`, `subscriptions.user_id`, `transactions.user_id`. |

---

## ANDROID

Status: **NOT_RUN** (DEVICE-013)

HUMAN PASS somente apos Chrome Android fisico: onboarding, Placement, signup,
Journey, 4/4, audio, Hanzi Builder, teclado, free production, transfer, Review,
Missoes, Pro, portrait, landscape.

Registrar modelo / OS / browser / build. WebKit CI **nao** conta.

---

## IPHONE

Status: **NOT_RUN** (DEVICE-014)

HUMAN PASS somente apos Safari iPhone fisico. Alem do smoke: safe area,
keyboard, sticky CTA, audio, scroll, modal, bottom nav.

---

## DESKTOP

Status: **NOT_RUN** (DEVICE-015)

HUMAN PASS somente apos Chrome desktop real (resolucoes principais): Journey,
Player, Review, Profile, Account, Pro, Business, Missoes.

---

## BR-023 / BR-024 / BR-025 (codigo nesta PR)

| ID | Status | Notas |
| --- | --- | --- |
| BR-023 Brasil only | PASS | interface_locale=pt-BR, instruction_locale=pt-BR, target_language=zh-CN. Sem seletor English. `COURSE_PROFILE.futureSourceLanguages` continua documentacao futura, nao UI. |
| BR-024 Country field | PASS | Select ISO 3166; default BR; servidor normaliza; pais **nao** infere idioma. |
| BR-025 Release telemetry | PASS (cliente) | Eventos minimos no funil + pedagogia. Sem PII (filtro de chaves). Persistencia servidor do funil de Review/Pro continua FOLLOW_UP ate staging (pedagogia ja tem RPC). |

Eventos cobertos no cliente:

- signup (`signup_started` / `signup_submitted`)
- placement completion
- Journey entry
- lesson started/completed (pedagogia)
- mastery pass (pedagogia)
- Review started/completed
- Pro offer shown
- checkout start
- subscription activated (retorno `?checkout=success`)

---

## BR-017 Economy staging

Status: **BLOCKED** (mesmo motivo de STAGING)

`npm run test:pearl-staging` recusa `drjcfalvlbbeblmmyhwj`. Nao rodado.

---

## BR-026 / BR-027

Este arquivo e o relatorio. Decisao: **`NOT_READY`**.

Estados nao atingidos: `AUTOMATED_READY`, `STAGING_READY`, `PHYSICAL_QA_READY`,
`PAYMENTS_READY`, `READY_FOR_CLOSED_BETA_BR`.

---

## BR-028 — Sem grandes features

Nao criados: English, Spanish, Business Admin, SSO, SCIM, novos engines,
expansao Atlas, novo sistema de moedas.

---

## BR-029 — PRs abertas (nao mergear cegamente)

| PR | Titulo | Classificacao | Acao |
| --- | --- | --- | --- |
| #199 | V4.7.3 — Staging Activation + Real Beta Validation | STILL_NEEDED | Esta remessa. Draft. Nao mergear. Decisao humana `NOT_READY`. |
| #198 | V4.7.2 — Brazil Closed Beta Readiness | STILL_NEEDED | Empilhada em #197. Nao retargetar/mergear automaticamente. |
| #197 | V4.7.1 — Authoritative Onboarding + Placement Handoff | STILL_NEEDED | Gate desta remessa. Review humano. Nao mergear automaticamente. |
| #195 | percentual de progresso nao fica carregando | CLOSE_SAFE | Ja documentado em `docs/reports/pr-195-superseded.md`. Main/V4.7.1 ja tem timeout + planner lock. |
| #193 | e2e atalho 1 so depois do listen_select em M1 | SUPERSEDED | 1 arquivo (`e2e/mobile-device.spec.ts`) atras de V4.7. Helpers de listen_select ja estao na main. Nao rebase. |
| #190 | V4.6 — Paid Beta Release Candidate | SUPERSEDED | RC V4.6 antiga; dirty vs main. Nao mergear. |
| #181 | Remove toast “Resgatando Perola...” | CLOSE_SAFE | `economySyncMessage: null` + gate `validate:economy-server` ja na main. |
| #117 | workflow para aplicar security migrations em producao | STILL_NEEDED | Ops. Perigoso mergear durante o atraso de schema. Revisar a parte, **nao** como parte desta beta. |
| #100 | Convide amigos sempre visivel | SUPERSEDED | `nav.tsx` ja expoe `/convide`. Branch dirty vs main. |
| #137–#72 Dependabot | bumps de deps / actions | STILL_NEEDED | Manutencao isolada. Nao e blocker da closed beta BR. |

---

## Aceite final (checklist humano)

| # | Criterio | Status |
| --- | --- | --- |
| 1 | Signup real | NOT_RUN |
| 2 | Email nova aba | NOT_RUN |
| 3 | Outro dispositivo | NOT_RUN |
| 4 | Placement no servidor | NOT_RUN (codigo pronto; Edge/staging BLOCKED) |
| 5 | Journey so apos onboarding real | NOT_RUN (codigo V4.7.1) |
| 6 | 4/4 persiste reload/login | NOT_RUN |
| 7 | Sync nao perde progresso | NOT_RUN |
| 8 | Android humano PASS | NOT_RUN |
| 9 | iPhone humano PASS | NOT_RUN |
| 10 | Desktop humano PASS | NOT_RUN |
| 11 | Stripe Test Mode humano PASS | NOT_RUN |
| 12 | cancelamento/restore PASS | NOT_RUN |
| 13 | Pearl/economy staging PASS | BLOCKED |
| 14 | RLS A≠B PASS | NOT_RUN |
| 15 | Security advisors revisados | PASS (producao classificada; staging BLOCKED) |
| 16 | nenhum P0 conhecido aberto | PASS neste corte de codigo; staging/auth reais podem revelar P0 |
| 17 | relatorio de readiness completo | PASS (este arquivo) |
| 18 | decisao final explicitamente humana | **NOT_READY** |

Nao mergear esta PR automaticamente. Parar para revisao e QA humano.
