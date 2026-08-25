# Paid Beta RC — decisão automática

Gerado: 2026-08-25T11:38:17.838Z

| Campo | Valor |
|-------|-------|
| Decisão | **PHYSICAL_QA_PENDING** |
| Scripts auto | 5/5 |
| Human QA | PENDING |
| Operacional | PENDING |

## Regras

- `AUTOMATED_READY` — portões de código/pedagogia/automatização ok
- `OPERATIONAL_PENDING` — staging/payments ainda sem evidência
- `PHYSICAL_QA_PENDING` — Android/iPhone/Desktop humanos NOT_RUN
- `READY_FOR_CLOSED_PAID_BETA` — só com marcador humano + operacional no relatório RC

CI **nunca** inventa QA físico nem marca payments/staging como PASS.
