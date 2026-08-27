# Staging migration inventory (STG-002)

Gerado para V4.7.5 live MCP (2026-08-27T22:18Z). **Não aplica SQL.**

Watermark de produção **confirmado ao vivo** em MandarimProject `drjcfalvlbbeblmmyhwj`: `20260810175737` `beta_experience_telemetry`.

Alvo pretendido: `longyu-preview` `wpnmygzxqvmpdlcuwrjp` — **INACTIVE** (`list_migrations` timeout). Aplicar **somente** quando `ACTIVE_HEALTHY`.

Restore recusado: **2 project limit** Free. Ver `docs/reports/staging-live-inventory.md`.

| version | name | production | staging |
| --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | NOT_APPLIED | BLOCKED |
| 20260813180000 | pearl_pro_economy | NOT_APPLIED | BLOCKED |
| 20260814010000 | mastery_pass_telemetry | NOT_APPLIED | BLOCKED |
| 20260825043000 | business_foundation | NOT_APPLIED | BLOCKED |
| 20260825062000 | business_operational_hardening | NOT_APPLIED | BLOCKED |
| 20260826230000 | placement_onboarding | NOT_APPLIED | BLOCKED |
| 20260827023000 | placement_onboarding_handoff | NOT_APPLIED | BLOCKED |

Prova: `placement_onboarding_drafts`, `placement_attempts`, `business_leads`, `pearl_ledger` **ausentes** em produção.

Ordem: uma por uma, validar schema/RLS/RPC após cada, parar no primeiro erro. Hard fail se o script apontar para produção.

Fonte viva: `npm run inventory:staging-migrations` + MCP `list_migrations`.
