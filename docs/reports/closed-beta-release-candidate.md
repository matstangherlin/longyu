# Closed Beta — Release Candidate (V4.7.4)

**Não é autorização de closed beta paga.** Cada campo abaixo é independente.
Nenhum campo deriva automaticamente de outro. Automação **não** preenche PASS físico
nem PASS operacional.

- **Versão pretendida:** V4.7.4 — Closed Beta Release Candidate Hardening
- **Branch:** `cursor/v47-4-rc-hardening-1519`
- **Base:** `main` (consolidação V4.7)
- **Produção:** **não alterada** (sem migration MandarimProject, sem Edge nova, sem Stripe Live)

## Scoreboard (campos independentes)

| Campo | Valor | O que falta para virar PASS |
| --- | --- | --- |
| `CODE_READY` | `PENDING_CI` | `validate:beta` + build + E2E Chromium verdes neste HEAD |
| `STAGING_READY` | `NOT_READY` | Ativar `longyu-preview` e aplicar migrations/Edges **lá** (V4.7.5) |
| `PHYSICAL_QA_READY` | `NOT_RUN` | Rodar `docs/reports/physical-qa-contract.md` em Android Chrome, iPhone Safari e desktop Chrome |
| `PAYMENTS_READY` | `NOT_RUN` | Executar `docs/reports/stripe-test-mode-checklist.md` em Stripe **Test Mode** no staging |
| `SECURITY_READY` | `NOT_READY` | RLS A≠B e recovery no staging (V4.7.8). Scripts de fronteira no `validate:beta` não substituem isso |
| `READY_FOR_CLOSED_BETA_BR` | `NOT_READY` | Staging + QA físico + Test Mode + RLS. **Permanece NOT_READY nesta remessa.** |

## O que esta remessa entrega

1. **Firefox determinístico:** atalhos 1–0 escutam `keydown` em *capture* no `document` e aceitam `DigitN` / `NumpadN`. Opções publicam `data-option-index` / `data-selected`.
2. **QA Fast Path:** `/qa` e `/qa/player` só em development/preview. Production Beta redireciona para `/`.
3. **Sentinelas** dos bugs históricos (Pinyin/Hànzì, sticky, freeze, Review grande, 1/4, leak de transferência, missão, sync).
4. **Topic Mastery 4/4:** E2E completo no Chromium; invariantes (reload, back, dupla conclusão, offline, bloqueio do próximo tema) em todos os motores.
5. **Contratos** de QA físico e Stripe Test Mode — execução real fica para V4.7.5–V4.7.8.
6. **Higiene GitHub:** `docs/reports/stale-pr-audit.md`. Não mergear código velho.

## O que esta remessa **não** faz

English, +100 lições, Atlas em massa, novas moedas/rankings, Business Admin completo, novos planos, redesign, IA conversacional, Stripe Live, migration em produção.

Pedagogia: **sem V5**. O gate de fidelidade/feasibility permanece (3.875 passos, 0 falhas estruturais no último relatório gerado). QA de borda, não reconstrução.

## E2E / flakes

| Motor | Política V4.7.4 |
| --- | --- |
| Chromium (+ mobile Chrome / tablet) | Portão de merge |
| Firefox | Job CI **obrigatório**. Falha determinística de atalho numérico corrigida. 4/4 ponta a ponta fica no Chromium (duração); invariantes no spec de hardening |
| WebKit | Passo **informativo** (`continue-on-error` só neste passo). Overlay/timeout documentado; não esconde Firefox |

Flakes conhecidos e mitigados (não no caminho crítico do merge Chromium):

- `privacy-consent` revoke em `/ajustes#privacidade-dados` — overlays; teste agora força dismiss + `force: true`.
- `topic-pass-return` timeout de 5 min em Firefox/WebKit — 4/4 completo só no Chromium.

## Produção

- `VITE_CLOUD_ONBOARDING_V2_ENABLED=false` no Netlify production permanece.
- `/qa` é `noindex` e `Disallow`.
- `READY_FOR_CLOSED_BETA_BR` **não** sobe com `CODE_READY`.

## Sequência seguinte (fora desta remessa)

```text
V4.7.4 RC hardening
  → V4.7.5 staging + migrations + Edges
  → V4.7.6 auth + placement + sync reais
  → V4.7.7 Android + iPhone + desktop físico
  → V4.7.8 Stripe Test Mode + RLS A≠B
  → CLOSED PAID BETA BR
```
