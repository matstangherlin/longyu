# Staging migration inventory (STG-002)

Gerado para V4.7.4-rc.1. **Não aplica SQL.** Produção não foi consultada nesta remessa.

Watermark de produção (inventário 2026-08-27): `20260810175737` `beta_experience_telemetry` em MandarimProject `drjcfalvlbbeblmmyhwj`.

Alvo pretendido: `longyu-preview` `wpnmygzxqvmpdlcuwrjp` — **INACTIVE**. Aplicar **somente** quando `ACTIVE_HEALTHY`.

| version | name | production (watermark) | staging |
| --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | NOT_APPLIED | BLOCKED |
| 20260813180000 | pearl_pro_economy | NOT_APPLIED | BLOCKED |
| 20260814010000 | mastery_pass_telemetry | NOT_APPLIED | BLOCKED |
| 20260825043000 | business_foundation | NOT_APPLIED | BLOCKED |
| 20260825062000 | business_operational_hardening | NOT_APPLIED | BLOCKED |
| 20260826230000 | placement_onboarding | NOT_APPLIED | BLOCKED |
| 20260827023000 | placement_onboarding_handoff | NOT_APPLIED | BLOCKED |

Ordem: uma por uma, validar schema/RLS/RPC após cada, parar no primeiro erro. Hard fail se o script apontar para produção.

Fonte viva: `npm run inventory:staging-migrations`.
