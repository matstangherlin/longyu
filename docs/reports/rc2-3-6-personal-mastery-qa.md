# RC2.3.6 — Personal Mastery QA

## Gate `gate:rc2-3-6-personal-mastery`

18 checks (PM1–PM18) + **17/17 mutations killed** (the 15 mandatory, plus "ASR without ceiling" and "JEV_RUNTIME_ENABLED=true"):

| # | Mutation | Caught by |
|---|---|---|
| 1 | ASR success → tone mastered | ASR_NOT_TONE |
| 2 | mic failure → production weakness | TECHNICAL_NOT_LEARNING |
| 3 | recognise Hànzì → handwriting mastered | RECOGNITION_NOT_WRITING |
| 4 | guided trace = memory write | TRACE_NOT_MEMORY |
| 5 | no evidence → weak | UNKNOWN_NOT_WEAK |
| 6 | one answer → stable | ONE_ANSWER_NOT_STABLE |
| 7 | help ignored | HELP_LOWERS_INDEPENDENCE |
| 8 | duplicate counted twice | IDEMPOTENT |
| 9 | future target recommended | CURRICULUM_LEAK |
| 10 | graph prerequisite cycle | GRAPH_INTEGRITY |
| 11 | Jev enabled in learner runtime | JEV_ISOLATION |
| 12 | raw speech in record | PRIVACY |
| 13 | legacy fabricates handwriting | LEGACY_NO_FABRICATION |
| 14 | contextual choice = free production | CHOICE_NOT_FREE_PRODUCTION |
| 15 | review recommends untaught | REVIEW_TAUGHT_ONLY |

## Learner profiles (simulation)

| Profile | Expected | Result |
|---|---|---|
| A — new learner | no labels, no tasks | PASS |
| B — steady, unaided, spaced | ≥ 5 strong; session = confirmations | PASS |
| C — repeated listening misses | listening NEEDS_PRACTICE, error signal, session starts with listening | PASS |
| D — succeeds only with help | DEVELOPING, never STRONG | PASS |
| E — microphone blocked | nothing negative, no error signal | PASS |
| F — back after 90 days | REVIEW_DUE, not "needs practice" | PASS |

## Web E2E (`e2e/rc2-3-6-personal-mastery.spec.ts`)

4/4 at 360×640, 375×667, 390×844: "Seu Domínio" groups with human labels, no numbers/percentages; "Por que estou vendo isto?" explains without judgement; "Praticar o que preciso" opens the existing review round; no horizontal overflow; stored record has no raw speech/handwriting.

## QA panel

`/qa/device` → **Personal Mastery (RC2.3.6)** (device QA builds only): record size, graph audit, error signals, and "Why this state?" — every view with state, confidence, rules and the evidence chain (time, skill, result, independence, support, activity).

## Device checklist (owner)

1. Fresh install → "Seu Domínio" says there is not enough activity yet.
2. Finish a lesson → items appear under "Você está firme em" only after repeated, unaided success.
3. Miss the same listening item 3+ times → it shows under "Vale praticar" with "Ouvir".
4. "Por que estou vendo isto?" reads kindly, no scores.
5. "Praticar o que preciso" → 5–8 review items, all already studied.
6. Deny microphone in a speaking activity → nothing negative appears.
7. Trace a character with the guide many times → handwriting never shows "Firme".
8. Write it from memory on different days → handwriting can become "Firme".
9. Use "show answer" often → item stays "Em construção".
10. Airplane mode → everything works (local only).
11. Reinstall/clear data → record resets cleanly, no crash.
12. Journey order unchanged; no new lesson unlocked by Personal Mastery.
13. Review hub shows the "Seu Domínio · Praticar o que preciso" link; normal review unchanged.
14. 360-px phone: no sideways scroll on "Seu Domínio".
15. TalkBack reads labels and the "Por que" button.
16. Dark mode legible.
17. QA panel visible only on device-QA builds.
18. No new currency, rewards or paywall around these screens.
19. Long-time account (pre-RC2.3.6) → no invented handwriting or speaking state.
20. App stays responsive after many sessions (no lag on answer).

`OWNER_MASTERY_ACCEPTANCE` is never automatic.
