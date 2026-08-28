# Staging Supabase Advisors (Longyu)

Atualizado em: 2026-08-28

**Status: BLOCKED_REMOTE_STAGING**

Advisors of an isolated Longyu remote **did not run** (`LONGYU_STAGING_PROJECT_ID` unset).

Security/Performance Advisors **on MandarimProject** may be read-only baseline. That is **not** STG-009 and does **not** relabel production as staging.

| Advisor | Projeto | Status | Findings classificados |
| --- | --- | --- | --- |
| Security | staging isolado Longyu | NOT_RUN | nenhum — remoto não configurado |
| Performance | staging isolado Longyu | NOT_RUN | nenhum — remoto não configurado |

When a human sets `LONGYU_STAGING_PROJECT_ID` ≠ `drjcfalvlbbeblmmyhwj` and the project is `ACTIVE_HEALTHY`:

1. `npm run identify:staging`
2. `npm run migrate:staging` (stop on first error)
3. Run Security Advisor and Performance Advisor on **that** project_id
