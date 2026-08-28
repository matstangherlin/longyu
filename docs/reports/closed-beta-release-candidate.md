# Closed Beta — Release Candidate (V4.7.4)

**Não é autorização de closed beta paga.** Cada campo abaixo é independente.
Nenhum campo deriva automaticamente de outro. Automação **não** preenche PASS físico
nem PASS operacional. **CODE_READY não promove** nenhum outro campo.

- **LONGYU_RC:** `v4.7.4-rc.1`
- **Identidade viva:** `npm run rc:identity` (SHA + Journey fingerprint + Placement + schema + Edges)
- **Branch desta finalização:** `cursor/v474-rc-finalization-3618` (empilha em #201)
- **Produção:** **não alterada** (sem migration MandarimProject, sem Edge nova, sem Stripe Live)

QA posterior deve citar `v4.7.4-rc.1` **e** o `git_sha` impresso por `rc:identity` naquele checkout.
Se o código do produto mudar, o rótulo vira `rc.2`. Não chamar HEADs diferentes de “a mesma RC”.

## Scoreboard (campos independentes)

| Campo | Valor | O que falta para virar PASS |
| --- | --- | --- |
| `CODE_READY` | `PASS` (`b2a5818`) | Evidência: CI da #203 nesse SHA (qualidade + Chromium + Firefox + Security). **Não promove** nenhum outro campo. |
| `CROSS_BROWSER_READY` | `PASS` (`b2a5818`) | Firefox gate SUCCESS. WebKit informativo SUCCESS. |
| `STAGING_READY` | `BLOCKED_BY_INFRASTRUCTURE` | Humano 2026-08-28: preview sem utilidade; não pausar atomurus; MandarimProject é o backend que importa (sem DDL). Ver `docs/reports/v476-staging-live-validation.md`. |
| `AUTH_READY` | `NOT_RUN` | Signup real + e-mail em nova aba + finalize. Exige staging (V4.7.6). |
| `PLACEMENT_READY` | `NOT_RUN` | Servidor recalcula evidência bruta. Exige staging (V4.7.6). |
| `SYNC_READY` | `NOT_RUN` | Cross-device 1/4 → 2/4 sem regressão. Exige staging (V4.7.6). |
| `PHYSICAL_QA_READY` | `NOT_RUN` | `docs/reports/physical-qa-contract.md` em Android Chrome, iPhone Safari e desktop Chrome. Automação não preenche. |
| `PAYMENTS_READY` | `NOT_RUN` | `docs/reports/stripe-test-mode-checklist.md` em Stripe **Test Mode** no staging. |
| `SECURITY_STAGING_READY` | `BLOCKED` | RLS A≠B live + advisors **no staging**. Scripts de fronteira no `validate:beta` não substituem. |
| `SECURITY_READY` | `NOT_READY` | Mesmo bloqueio de `SECURITY_STAGING_READY`. |
| `READY_FOR_CLOSED_BETA_BR` | `NOT_READY` | Só decisão humana depois de todos os campos operacionais. **Permanece NOT_READY nesta remessa.** |

## O que esta remessa entrega

1. **Firefox determinístico:** atalhos 1–0 em capture no `document` (`DigitN` / `NumpadN`). Opções com `data-option-index` / `data-selected` / `data-option-label`. Sentinela espera o `listen_select` (não o 你好 do “Ouça e imite”).
2. **QA Fast Path security (RC-001):** `/qa` e `/qa/player` só em development/preview. Production Beta (env, URL, marker, query string, deep link, refresh) redireciona para `/`.
3. **Isolamento TEST vs REAL (RC-002):** backup de `longyu-v1`, restore ao sair, sync/economia/entitlement/cloud restore desligados no TEST STATE. Banner “Sair do QA” **na coluna do conteúdo** (não irmão da row do shell — no 390px o main ia a 0px). `/conta` publica `data-cloud-sync-status`; Review publica `data-review-page`.
4. **Sentinelas** (RC-003) dos bugs históricos com atributos semânticos e geometria (não só CSS class).
5. **Topic Mastery 4/4** (RC-004): reload, back, forward, duplo clique, dupla conclusão, offline, rehidratação mock, reward idempotente, próximo tema bloqueado.
6. **Pedagogia (RC-005):** sem revisão curricular ampla. Pacote humano das primeiras 20 sessões classifica; não auto-corrige.
7. **First 20 sessions pack (RC-006):** `docs/reports/first-20-sessions-human-review.md`.
8. **Identidade RC (RC-007):** `src/lib/releaseCandidate.ts` + `npm run rc:identity`.
9. **Contratos** de QA físico e Stripe Test Mode — execução real fica para V4.7.7–V4.7.8.
10. **Higiene GitHub:** `docs/reports/stale-pr-audit.md`. Não mergear código velho.

## O que esta remessa **não** faz

English, +100 lições, Atlas em massa, novas moedas/rankings, Business Admin completo, novos planos, redesign, IA conversacional, Stripe Live, migration em produção.

Pedagogia: **sem V5**. O gate de fidelidade/feasibility permanece. QA de borda, não reconstrução.

## E2E / flakes

| Motor | Política V4.7.4 |
| --- | --- |
| Chromium (+ mobile Chrome / tablet) | Portão de merge |
| Firefox | Job CI **obrigatório**. Falha anterior: sentinela `listen_select` não avançava o “Ouça e imite”. Corrigida com `advanceToChoiceOptions`. |
| WebKit | Passo **informativo** (`continue-on-error` só neste passo). No HEAD `de3cfbf` o passo WebKit passou; Firefox é que falhou. Flake de overlay/timeout permanece documentado — não mascarar regressão real. |

Flakes conhecidos e mitigados (não no caminho crítico do merge Chromium):

- `privacy-consent` revoke em `/ajustes#privacidade-dados` — overlays; teste agora força dismiss + `force: true`.
- `topic-pass-return` timeout de 5 min em Firefox/WebKit — 4/4 completo só no Chromium.

## Produção

- `VITE_CLOUD_ONBOARDING_V2_ENABLED=false` no Netlify production permanece.
- `/qa` é `noindex` e `Disallow`.
- `READY_FOR_CLOSED_BETA_BR` **não** sobe com `CODE_READY`.

## Staging (não executado aqui)

Humano: `longyu-preview` **sem utilidade**; **não** pausar atomurus. MandarimProject é o backend Longyu que importa — **sem** migration/Edge nesta remessa. Inventário: `docs/reports/v476-staging-live-validation.md`. Opções A/D **revogadas**. V4.7.6 permanece `BLOCKED_BY_INFRASTRUCTURE` até B (upgrade + projeto novo) ou C (staging pago isolado ≠ produção ≠ atomurus).

## Sequência seguinte (fora desta remessa)

```text
V4.7.4 RC hardening
  → V4.7.5 staging + migrations + Edges
  → V4.7.6 auth + placement + sync reais
  → V4.7.7 Android + iPhone + desktop físico
  → V4.7.8 Stripe Test Mode + RLS A≠B
  → CLOSED PAID BETA BR
```
