# RC2.3.6 — Learner Evidence Record & Personal Mastery

Code: `src/lib/mastery/{evidence,adapters,competency,personalMastery,recorder,practiceQueue}.ts`. Data: [`rc2-3-6-personal-mastery.json`](rc2-3-6-personal-mastery.json).

## Record

One event per thing the learner demonstrated: `id` (deterministic from attempt) · `targetId/targetType` · `dimension` (meaning/listening/form/production) · `skill` (24 kinds, each with a fixed strength) · `result` (SUCCESS / PARTIAL / FAILURE / OBSERVED / SKIPPED_TECHNICAL) · `independence` (capped by the strongest support used) · `supportUsed` · `source` (lesson, activity, pass) · optional `errorFamily` (failures only) · `timestamp` · `deviceId`.
No field can hold audio, transcripts, stroke images or biometrics; `sanitizeEvidence` drops anything outside the contract.

**TECHNICAL FAILURE IS NOT LEARNING FAILURE** — mic denied, no recognizer, no audio confirmed → `SKIPPED_TECHNICAL`, excluded from every count.

## Where evidence comes from (hooks)

| Source | Hook | Mapping |
|---|---|---|
| Journey step | `LessonPlayer.completeCurrentStep` (`safeSideEffect`) | step kind → skill; Everyday `learnerAgency` refines; discovery = OBSERVED; help → support |
| Review | `RevisaoPage.grade` | effective grade (assisted ⇒ HINT) |
| Speech | `recordSpeechEvidence` | perception → listening; self-compare → OBSERVED; ASR match → `ASR_TEXT` (text, never tone); ASR miss → OBSERVED |
| Hànzì writing | `recordFormEvidence` | channel → skill; tracing always `GUIDED_TRACE` |
| Culture | store `recordCultureKnowledge`, `reviewCultureMemory`, `completeCultureBridge` | observed / practiced / scenario / recall |
| Legacy | once, from SRS | one OBSERVED `LEGACY_PRIOR` per item already met — nothing per skill |

## Competency (per target × view, never averaged)

Views: meaning, listening, form, production, handwriting (handwriting = trace / memory write / context use only).
States: UNSEEN · EXPOSED · DEVELOPING · NEEDS_PRACTICE · STRONG · STABLE · REVIEW_DUE.

- **UNKNOWN ≠ weak**: no evidence → UNSEEN; exposure → EXPOSED; < 3 graded → DEVELOPING.
- **NEEDS_PRACTICE** needs ≥ 3 graded, estimate < 0.45 and ≥ 2 failures.
- **STRONG**: estimate ≥ 0.7 and ≥ 2 independent successes. **STABLE**: ≥ 0.82, ≥ 3 independent successes on ≥ 3 days spanning ≥ 6 days, in ≥ 2 activities (anti-gaming: spacing + variety).
- **Conflict**: last two graded attempts failed → back to DEVELOPING.
- **Ceilings**: contextual choice, ASR text, guided trace, culture practice → at most DEVELOPING; self-compare, observed culture, legacy → EXPOSED; dialogue completion → STRONG.
- **Decay**: the existing SRS `due` → REVIEW_DUE (no second scheduler); without SRS, STRONG after 21 days / STABLE after 60 days.
- **Confidence** (internal, QA only): LOW / MEDIUM / HIGH by amount and spread of evidence.
- **Error memory**: a family is a signal only with ≥ 3 failures and ≥ 50 % failure ratio in 30 days.

## Personal Mastery API

`getTargetState · getDimensionState · getWeakTargets · getStrongTargets · getReviewDueTargets · getDevelopingTargets · getRecentProgress · explainTargetState · errorSignals` — memoised per target; only targets the learner was taught are listed.

## "Praticar o que preciso" — adaptive session V0

Existing review player, same SRS, items the learner already has. 5–8 tasks, ~75 % needs (NEEDS_PRACTICE → REVIEW_DUE → DEVELOPING) and the rest confirmations of strong items; ≤ 2 tasks per target; never the same target twice in a row, ≤ 2 of the same competency in a row; 10-minute cooldown; attempt cap 2 then recovery ladder (production → form → meaning; listening → meaning). Personal Mastery sets **priority only** — never eligibility, never Journey order.

## Storage, sync, privacy

Local only (`longyu:learner-evidence-v1`). Recent 1500 raw events (explanations) + aggregates rolled up weekly (8 weeks) → monthly (6 months) → all-time; 6000 seen ids for idempotency.

| Events | Recent | Aggregates | Size | Append | Derive all |
|---|---|---|---|---|---|
| 100 | 100 | 0 | 27 KB | 0 ms | 2 ms |
| 1 000 | 1 000 | 0 | 268 KB | 0 ms | 2 ms |
| 10 000 | 1 500 | 3 675 | 1.42 MB | 108 ms (batched) | 4 ms |
| 50 000 | 1 500 | 3 675 | 1.42 MB | 724 ms (batched) | 4 ms |

Sync contract (types + tests only, no cloud runtime): stable event ids, merge = union by id, per-device compacted snapshots (newer `compactedThrough` wins for that device only) — never whole-record last-write-wins.
