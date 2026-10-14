# JEV Wave 2 — Beta Feedback Intelligence v2

**Result: `JEV_BETA_TRIAGE = VERIFIED` · `LEARNER_RUNTIME = OFF`.**

Repo advisory triage pipeline is certified. Live Edge deploy + migration remain **OWNER_ACTION_REQUIRED** (same OA as Wave 1 live promote).

## What landed

| Piece | Location |
| --- | --- |
| Area taxonomy v2 | `supabase/functions/_shared/jevTriageTaxonomy.ts` |
| PII redaction | `supabase/functions/_shared/jevPiiRedact.ts` |
| Severity → P mapper | `supabase/functions/_shared/jevSeverityMap.ts` |
| Security overrides | `supabase/functions/_shared/jevSecurityOverride.ts` |
| Confidence policy | `supabase/functions/_shared/jevConfidencePolicy.ts` |
| Daily budget | `supabase/functions/_shared/jevDailyBudget.ts` |
| Pipeline helpers | `supabase/functions/_shared/jevTriagePipeline.ts` |
| Edge triage rewrite | `supabase/functions/triage-feedback/index.ts` |
| Additive migration | `supabase/migrations/20261009060000_jev_beta_triage_v2.sql` |
| Calibration dataset | `docs/beta/jev-calibration-dataset.json` |
| Health report | `docs/beta/jev-triage-health.json` |
| Cert | `docs/jev/beta-triage-v2.json` |
| Gate | `gate:jev-beta-triage-v2` |

## Invariants held

- Jev output is advisory only (never auto-closes / deploys / bans / changes Mastery).
- `ai_severity` = raw score; `ai_p_candidate` = mapped P-level (never equal).
- Deterministic security rules cannot be downgraded by Jev.
- P0/P1 candidates and low confidence always require human review.
- Feedback survives Jev failure / budget exhaustion (`PENDING_AI_TRIAGE`).
- Semantic clusters are release-scoped suggestions; operator confirms grouping.
- Cohort gates still consume human-confirmed P0/P1 — not raw Jev.
- Learner runtime remains OFF.

## Gate

```bash
npm run gate:jev-beta-triage-v2
```

20 mutation kills + false-negative / false-positive calibration cases.

## Owner still required

1. Approve migration apply (backup policy).
2. Approve Edge deploy of `triage-feedback` (see `docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md`).
3. Do **not** expand 10→50 / 50→200 from Jev alone.
