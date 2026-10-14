# Beta Health Model — RC2.3.13G

Canonical learner-health metrics for Closed Beta Wave 1 (≈10 testers).

## Principles

- Counts over fake percentages when N is tiny.
- Every rate shows numerator / denominator.
- No data → `NO_DATA`, never silent `0%`.
- Technical failures ≠ learner mistakes.
- Culture discovery is especially important after removing the Culture bottom tab.

## Activation

**Activated** = reached first meaningful Mandarin learning interaction
(`first_mandarin_action` / first guided listen / valid learner response).

Account creation alone is **not** activation.

## Core metrics

| Metric | Definition | Notes |
| --- | --- | --- |
| Activated testers | activated / eligible | Show N |
| First lesson started | `first_lesson_started` | |
| First lesson completed | `first_lesson_completed` | |
| Time to first Mandarin | p50 / p90 / N | From session start → first Mandarin action |
| First session success | completed one meaningful learning unit | |
| Journey stuck (derived) | started step, no complete, session end / repeats | Offline derivation |
| Audio tech failure rate | `audio_failed` / audio starts | Technical only |
| Speech tech failure rate | `speech_analysis_failed` / speech starts | Technical only |
| Culture discovery | `culture_first_switch` / activated | Top switch visibility |
| Culture value funnel | discovered → node start → node complete → return | |
| Practice discovery | `practice_first_open` | |
| Mastery discovery | `mastery_first_open` | |
| Second session | returned for another session | |
| D1 / D7 | show N/N only | No false confidence |

## Culture bottom-nav removal question

If 0/10 discover Culture → switch visibility / placement issue.  
If they find it and ignore it → content/value issue.  
Do **not** reflexively restore the Culture bottom tab.

## Event schema

`beta_event/1` — see `docs/beta/beta-health-schema.json` and `src/lib/beta/betaEvents.ts`.

## Privacy

Allowlisted fields only (`betaEventSafeFields` / `sanitizeBetaEvent`).  
Forbidden: email, tokens, raw audio, stroke traces, free-text answers.
