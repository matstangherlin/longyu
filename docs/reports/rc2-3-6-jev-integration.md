# RC2.3.6 — Jev Integration

| Use | Status | Where |
|---|---|---|
| Beta feedback triage | **LIVE** (server, admin-triggered) | `supabase/functions/triage-feedback` (#315). Key only in Supabase Vault (`TYPESAFE_API_KEY`). 5/5 existing feedback rows triaged on 2026-10-07 (model `jev-1.13.0`). |
| Evidence semantic audit | **DEV_AUDIT** | `scripts/jev-evidence-audit.mjs` → [`rc2-3-6-jev-evidence-audit.json`](rc2-3-6-jev-evidence-audit.json) |
| Learner runtime (mastery, recommendations) | **DISABLED** | `JEV_RUNTIME_ENABLED=false`; gate PM11: no Jev client, endpoint or key in `src/` or `dist/` |
| Ranking / remediation suggestions | **FUTURE** | only after calibration reaches CALIBRATED and owner approval |

**Jev never sets mastery.** Personal Mastery is deterministic; Jev answers only flag rules for a human to review.

## Evidence semantic audit (2026-10-07)

24 items (one per evidence skill, deduped by input hash), 4 questions each: competency (CHOICE), strength (SCORE 0–3), ambiguity (NOUL), remediation (CHOICE). Run through the Supabase database (`pg_net`) because the dev container cannot reach the API; key read from Vault, never printed or stored in the repo.

| Metric | Value |
|---|---|
| Answered | 24/24 (`jev-1.13.0`) |
| Competency agreement with our rules | **0.875** (21/24) |
| Strength rank correlation (Spearman) | **0.829** |
| Calibration status | **EXPERIMENTAL** (n < 30) |

Disagreements for human review (no rule changed automatically):

| Skill | Ours | Jev | Reading |
|---|---|---|---|
| CONTEXTUAL_CHOICE | production 0.3 | meaning | consistent with our ceiling (choice ≠ production); keep ceiling |
| HANZI_ASSEMBLY | form | production | building from parts is closer to production; candidate to revisit |
| HANZI_TRACE | form 0.35 | production, ambiguity 0.93 | Jev agrees it is weak/ambiguous; keep DEVELOPING ceiling |
| SPEECH_PERCEPTION | listening 0.7 | listening, ranked lower | multi-round identification may be guessable; candidate to lower strength |

## Cost controls

Dedupe by `inputHash` (model + state + questions) · cache `rc2-3-6-jev-evidence-audit.cache.json` · hard limit 40 items · changed-first sampling · fail-open (`NOT_RUN` without key, `UNAVAILABLE` on error) · 24 calls total for this audit.
