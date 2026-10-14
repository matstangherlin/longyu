# JEV Wave 3 — Shadow Struggle Lab

**Result: `VERIFIED_SHADOW_ONLY` · recommendation `KEEP_SHADOW` · `LEARNER_RUNTIME=OFF` · `SHADOW_RUNTIME=OFF`.**

Research scaffold only. Do not wait on this to start Closed Beta. No learner-visible Jev.

## Research question

Could a semantic decision model select a better intervention than fixed heuristics — **without** grading, Mastery writes, curriculum invention, or runtime effect?

## What landed

| Piece | Location |
| --- | --- |
| Shadow core (candidates, state, abstain, metrics) | `supabase/functions/_shared/jevShadowStruggle.ts` |
| Kill switch | `JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: false` in `budgetPolicy.ts` |
| Research table (additive, not applied) | `supabase/migrations/20261009070000_jev_shadow_struggle_lab.sql` |
| Calibration dataset | `docs/research/jev-shadow-calibration-dataset.json` |
| Metrics report | `docs/research/jev-shadow-struggle-report.json` |
| Cert | `docs/jev/shadow-struggle-lab.json` |
| Gate | `gate:jev-shadow-learning` (20 kills) |

## Guarantees

- Jev chooses only from approved candidates (incl. `ABSTAIN`)
- Deterministic heuristic remains authoritative for learner UX
- Sparse triggers (not every tap)
- No raw audio / stroke paths / email in shadow payloads
- `<100` samples never promotes to experiment; runtime never auto-enabled
- Engagement/XP are not learning promotion metrics

## Exit recommendation

`KEEP_SHADOW` — wait for meaningful Closed Beta volume, then remeasure false interruption / missed struggle before any owner-approved micro-experiment.
