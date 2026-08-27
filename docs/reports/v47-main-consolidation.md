# V4.7 — Consolidação na main

Atualizado em: 2026-08-27T04:20:00Z (pré-merge; SHA pós-merge no fim)

Esta remessa é **somente Git/código**. Não aplica migration em MandarimProject,
não faz deploy de Edge em produção, não altera Stripe Live.

## CONSOL-001 — Estado antes da operação

| Ref | SHA | Base | State |
| --- | --- | --- | --- |
| `origin/main` | `11ee35aced812e50757663e5b97a536a9db52663` | — | `test(e2e): mark custom Journey seeds as E2E local sessions` |
| #197 | `80a7adf357253e82360506e60a445322a8480479` | `main` | OPEN draft |
| #198 | `5610e7e84841822fc8e961f8aadd207d1d77cab7` | #197 branch | OPEN draft |
| #199 | `708ae4c4fcf6b4cc73c999726a9b61e0d246bb5c` (+ commits de compat) | era #198; retarget `main` | OPEN draft |

## CONSOL-002 — Ancestralidade

`git rev-list --left-right --count origin/main...origin/cursor/v47-3-staging-activation-1519`

- ahead_by = 5 (depois da flag de compat: +1)
- behind_by = 0
- #197 é ancestral de #199: sim
- #198 é ancestral de #199: sim

Sem cherry-pick. Sem rebase (main não andou).

Commits (main → cumulativo):

1. `80a7adf` V4.7.1 handoff
2. `b6a1b1c` V4.7.2 beta readiness
3. `5610e7e` e2e CountrySelect
4. `3285294` V4.7.3 staging guard
5. `708ae4c` PR #199 no audit
6. (este) flag `VITE_CLOUD_ONBOARDING_V2_ENABLED` + relatório

## CONSOL-005 — Famílias presentes

### V4.7.1

- `onboarding_completed=false` em `create-account`
- `cloud_pending_onboarding` / `cloud_ready` + `RequireCloudSession`
- `placement_onboarding_drafts` + `finalize-onboarding` + `/finalizar-cadastro`
- locale identity + `docs/reports/i18n-readiness.md`

### V4.7.2

- `CountrySelect` ISO, default BR, país ≠ idioma
- release telemetry
- RLS A≠B extensions
- `test:brazil-beta-readiness` + relatório

### V4.7.3

- `scripts/lib/staging-guard.mjs` recusa MandarimProject `drjcfalvlbbeblmmyhwj`
- `identify:staging` / `migrate:staging` / `deploy:staging-functions`
- lista canônica de Edge Functions
- `docs/reports/staging-activation.md` + advisors BLOCKED

## CONSOL-007 — Auto-deploy

**Sim: merge na `main` publica o frontend de produção.**

- Netlify `netlify.toml` `[context.production]` aponta `VITE_BACKEND_MODE=supabase` para MandarimProject `drjcfalvlbbeblmmyhwj`.
- Workflow CI em `push` para `main` (quality + e2e). Não aplica SQL.
- Não há workflow de `functions deploy` no push da main (`deploy-leagues.yml` e similares são manuais).

CODE MERGED ≠ BACKEND DEPLOYED.

## CONSOL-008 — Compatibilidade com backend antigo

Sem flag, o frontend V4.7.1 **quebraria** produção:

1. `profiles.onboarding_completed` não existe (última migration prod: `20260810175737` `beta_experience_telemetry`).
2. `readServerOnboardingCompleted` recebe erro PostgREST → `null` → todos os cloud users viram `cloud_pending_onboarding`.
3. Journey bloqueada; redirect para `/finalizar-cadastro`.
4. Edge `finalize-onboarding` **ausente** → 404. Contas existentes sem entrada.

Mitigação (obrigatória para merge):

- `VITE_CLOUD_ONBOARDING_V2_ENABLED=false` em `[context.production]`.
- Default da flag: off em `production_beta`, on em preview/dev.
- Com a flag off: sessão Supabase autenticada = `cloud_ready` (fluxo atual). Não lê a coluna nova. Não chama `finalize-onboarding`.
- Confirm-email em produção usa o caminho pré-handoff (`commit-placement` se houver pending em sessionStorage), igual à main anterior.
- **Não** reativa criação de identidade local.

`commit-placement` já estava ausente em produção na main atual; signup novo com pending já degradava. Esta flag não piora contas existentes.

Ligar V2 em produção só depois de: staging isolado + migrations + Edges `commit-placement` / `finalize-onboarding` / `create-account` atualizado.

## CONSOL-013 — Beta

| chave | estado |
| --- | --- |
| AUTOMATED CODE | a preencher após gates |
| STAGING | BLOCKED / NOT_RUN |
| PHYSICAL QA | NOT_RUN |
| PAYMENTS | NOT_RUN |
| READY_FOR_CLOSED_BETA_BR | **NOT_READY** |

## CONSOL-014 — Estratégia

Merge normal (`--no-ff` se via git) da PR cumulativa #199 em `main`. Sem squash. Histórico V4.7.1 → V4.7.2 → V4.7.3 preservado.

## CONSOL-016 / 017 — PRs

Após main conter a árvore:

- #199 MERGED (cumulativa, base `main`)
- #197 CLOSED `SUPERSEDED_BY_CUMULATIVE_MAIN`
- #198 CLOSED `SUPERSEDED_BY_CUMULATIVE_MAIN`

Não mergear #197 nem #198 depois. Outras PRs antigas (#195 etc.) não mexidas.

## SHA depois do merge

A preencher após `git fetch origin main`.

| campo | valor |
| --- | --- |
| PR usada | #199 |
| HEAD mergeado | TBD |
| main SHA depois | TBD |
| CI main | TBD |
| Security HEAD | TBD |
