# Staging Supabase Advisors (V4.7.3 / STAGE-003)

Atualizado em: 2026-08-27T22:18:00Z

**Status: BLOCKED**

Advisors de staging **não rodaram**. `longyu-preview` `wpnmygzxqvmpdlcuwrjp`
está `INACTIVE`. Restore na org Noba falhou com **2 project limit**.
Branching em MandarimProject falhou (`PaymentRequiredException`, plano Free).

Security/Performance Advisors **em MandarimProject** foram lidos em 2026-08-27T22:18Z
como baseline (57 security / 61 performance). Isso **não** é STG-009 e **não**
relabela dump de produção como resultado de staging. Detalhe em
`docs/reports/staging-live-inventory.md`.

Este arquivo **não** relabela o dump de produção como resultado de staging.

| Advisor | Projeto | Status | Findings classificados |
| --- | --- | --- | --- |
| Security | staging isolado | NOT_RUN | nenhum — ambiente indisponível |
| Performance | staging isolado | NOT_RUN | nenhum — ambiente indisponível |

Classificação usada quando o staging estiver `ACTIVE_HEALTHY` (ainda não aplicável):

- PASS — finding ausente ou já remediado no staging
- EXPECTED — finding conhecido e justificado (ex.: SECURITY DEFINER com `auth.uid()`)
- FIX_REQUIRED — finding crítico sem justificativa; bloqueia closed beta
- FOLLOW_UP — não crítico; não bloqueia se P0 = 0 e a justificativa existir

Nenhum finding de security crítico de staging está aberto porque **nenhum finding de staging foi gerado**.
Isso não é evidência de segurança. Produção (schema atrasado) permanece classificada em
`docs/reports/brazil-closed-beta-readiness.md` (BR-019), não aqui.

Quando o humano provisionar staging isolado (`LONGYU_STAGING_PROJECT_ID` ≠
`drjcfalvlbbeblmmyhwj`):

1. `npm run identify:staging`
2. `npm run migrate:staging` (parar no primeiro erro)
3. Rodar Security Advisor e Performance Advisor **nesse** project_id
4. Preencher as tabelas abaixo com timestamp real
5. Nenhum `FIX_REQUIRED` crítico pode ficar sem justificativa

## Security (staging)

NOT_RUN — sem DDL aplicado em staging nesta remessa.

## Performance (staging)

NOT_RUN — sem DDL aplicado em staging nesta remessa.
