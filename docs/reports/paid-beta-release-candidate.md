# Paid Beta Release Candidate — Evidence Board (V4.6)

Este relatório **separa** evidência de código, automação, operação, pagamentos e QA físico.
Existir código/script ≠ ter sido testado em staging ou em aparelho.

**RELEASE_DECISION:** PHYSICAL_QA_PENDING

---

## CODE/PEDAGOGY

| Item | Status | Evidence |
|------|--------|----------|
| First Mandarin interaction | CODE_OK | V4.2 / currículo L1 |
| First conversation | CODE_OK | V4.2 |
| First guided recall | CODE_OK | V4.1+ |
| First independent production ~L12 | CODE_OK | V4.2 |
| First transfer ≤ L15 `请问，你叫什么？` | CODE_OK | V4.5 + V4.6 integrity |
| Transfer target não vaza antes da tentativa | CODE_OK | V4.6 `transferTargetIntegrity` |
| transferBearingLessons ≥ 20 | CODE_OK | V4.5 report |
| domainMismatchCount = 0 | CODE_OK | V4.5 |
| labs with transfer = 0 | CODE_OK | V4.5 |
| Progresso antigo válido (IDs estáveis) | CODE_OK | sem rename de lesson IDs |

---

## AUTOMATED QA

| Item | Status | Notes |
|------|--------|-------|
| validate:beta | NOT_RUN | preencher após CI |
| build | NOT_RUN | |
| Chromium E2E | NOT_RUN | |
| Firefox E2E | NOT_RUN | |
| WebKit E2E | NOT_RUN | |
| Security | NOT_RUN | |
| transfer target integrity E2E | NOT_RUN | `e2e/transfer-target-integrity.spec.ts` |
| paid-beta regression sentinels | NOT_RUN | A–H |

---

## BACKEND/STAGING

| Item | Status | Notes |
|------|--------|-------|
| Supabase staging available? | NOT_RUN | humano/ops |
| latest migrations applied? | NOT_RUN | |
| Pearl/Pro staging harness executed? | NOT_RUN | `test:pearl-staging` existe ≠ executado |
| Business RLS A≠B executed? | NOT_RUN | SQL em `scripts/sql/` |
| Edge functions deployed? | NOT_RUN | |
| Supabase advisors reviewed? | NOT_RUN | |

---

## PAYMENTS

| Item | Status | Notes |
|------|--------|-------|
| Stripe Test Mode configured? | NOT_RUN | |
| checkout completed by human? | NOT_RUN | |
| webhook confirmed? | NOT_RUN | |
| entitlement activated? | NOT_RUN | |
| cancellation/expiration tested? | NOT_RUN | |

---

## PHYSICAL QA

Ver `docs/reports/paid-beta-device-qa.md` → **HUMAN DEVICE EVIDENCE**.

| Surface | Status |
|---------|--------|
| Android Chrome | NOT_RUN |
| iPhone Safari | NOT_RUN |
| Desktop Chrome | NOT_RUN |

Atalho: `/qa` em DEV/preview (não muta conta).

---

## RELEASE DECISION

Estados possíveis (emitidos por `validate:paid-beta-rc` + marcadores humanos):

| Estado | Significado |
|--------|-------------|
| AUTOMATED_READY | Código + gates automáticos ok |
| OPERATIONAL_PENDING | Staging/payments sem evidência |
| PHYSICAL_QA_PENDING | QA físico humano pendente |
| READY_FOR_CLOSED_PAID_BETA | Só com humano + ops preenchidos de propósito |

**Por que a beta paga ainda NÃO está liberada:** falta QA físico Android/iPhone/Desktop e evidência operacional de staging + Stripe Test Mode humano. CI verde sozinho não basta.
