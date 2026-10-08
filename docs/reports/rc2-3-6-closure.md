# RC2.3.6 — Learner Evidence Record, Personal Mastery & Knowledge Graph Foundation — Closure

Parent: [matstangherlin/longyu#316](https://github.com/matstangherlin/longyu/pull/316) @ `37d547f653c5a5f20002ec9c6278a38f974be27b` · Branch `cursor/rc2-3-6-personal-mastery` · 2026-10-07

| Area | Status | Evidence |
|---|---|---|
| Parent #316 hosted truth | **CODE_READY** | all green except `validate:beta + build` still running — [`rc2-3-6-parent-hosted-truth.md`](rc2-3-6-parent-hosted-truth.md) |
| Evidence source audit | **PASS** | [`rc2-3-6-evidence-source-audit.md`](rc2-3-6-evidence-source-audit.md) (+ JSON) — finding: lesson-wide accuracy smear |
| Learner Evidence Record | **PASS** | per-step events, `SKIPPED_TECHNICAL`, independence, idempotent ids — [`rc2-3-6-learner-evidence-record.md`](rc2-3-6-learner-evidence-record.md) |
| Adapters (speech, Hànzì, Everyday, culture, SRS, legacy) | **PASS** | gate PM1–PM4, PM13, PM14 |
| Knowledge graph | **PASS** | 966 targets · 4048 relations · 0 cycles · 0 leaks — [`rc2-3-6-knowledge-graph-foundation.md`](rc2-3-6-knowledge-graph-foundation.md) |
| Competency + Personal Mastery API | **PASS** | per dimension + handwriting view; UNKNOWN ≠ weak; spacing/variety; SRS decay |
| "Seu Domínio" + "Praticar o que preciso" (V0) | **PASS** (web) | E2E 4/4 at 360/375/390 |
| QA panel | **PASS** | `/qa/device` → Personal Mastery |
| Jev | **LIVE** feedback triage · **DEV_AUDIT** evidence audit (EXPERIMENTAL: competency 0.875, ρ 0.829) · **DISABLED** learner runtime — [`rc2-3-6-jev-integration.md`](rc2-3-6-jev-integration.md) |
| Storage / performance | **PASS** | 50k events → 1.42 MB, derive all 4 ms |
| Gate | **PASS** | `gate:rc2-3-6-personal-mastery` 17/17 mutations, profiles A–F 6/6, wired in `validate:beta` |
| Inherited gates | **PASS** (local) | typecheck, build, `gate:rc2-3-5-speech`, `gate:rc2-3-4-hanzi-writing`, `test:longyu-only-backend`, `test:fingerprint-chain` (`5a64821d0b7d` unchanged) |
| Full `validate:beta` (local) | **RUNNING** at PR creation | result posted on the PR |
| Android build / APK | **NOT_RUN** (this head) | this PR's Android workflow |
| Owner acceptance | **OWNER_ACTION_REQUIRED** | `OWNER_MASTERY_ACCEPTANCE` — 20-item checklist in [`rc2-3-6-personal-mastery-qa.md`](rc2-3-6-personal-mastery-qa.md); never automatic |

## Not regressed

#315 guardrails, Hànzì eligibility, fingerprint chain, #316 speech (68 contrasts, same canonical voice, fallback, privacy, ASR ≠ tone), `JEV_RUNTIME_ENABLED=false`, no paid resources, no sibling-project pause/delete, no production cloud migration, Journey order, Pedagogy V6, Visual First, Everyday, Culture Deep, Hànzì Writing. No new economy, no paywall decision; cloud sync is a contract in docs/types/tests only.
