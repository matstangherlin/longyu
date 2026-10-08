# RC2.3.7 — Guidance Audit

One system (`guidanceOrchestrator.ts`), 25 definitions. Global (coachmark / unlock reveal) and inline (pedagogical tip inside an activity) keep separate budgets. Monetization never enters the orchestrator.

| id | kind | priority | surfaces | anchor | dragon | verdict |
|---|---|---|---|---|---|---|
| welcome_journey_v1 | COACHMARK | CRITICAL_UX | /jornada | journey-continue | ✓ | keep |
| new_features_v1 | UNLOCK_REVEAL | FEATURE_UNLOCK | /jornada | — | ✓ | keep (batch of ≤ 2) |
| practice/missions/culture/hanzi/atlas/league/shop/immersion unlocks | UNLOCK_REVEAL | FEATURE_UNLOCK | /jornada | — | some | keep |
| tone_direction_tip_v1 | INLINE_TIP | PEDAGOGICAL_TIP | /jornada | — | — | keep (after 3 confusions) |
| tone_trace_first_use_v1 | COACHMARK | CRITICAL_UX (essential) | /som | **tone-trace (was missing → added)** | ✓ | fixed anchor; obsolete surfaces `/treino/tons`, `/tons` removed |
| tone_confusion_2_3_v1 | INLINE_TIP | PEDAGOGICAL_TIP | /som | — | — | obsolete surfaces removed |
| practice_first_use_v1 | COACHMARK | OPTIONAL | /treino /praticar | practice-recommended | — | keep |
| review_first_use_v1 | COACHMARK | OPTIONAL | /treino /praticar | practice-review (prop) | — | keep |
| culture_first_use_v1 | COACHMARK | OPTIONAL | /cultura | culture-recommended | — | keep (copy flagged REVIEW by Jev) |
| atlas_first_use_v1 | COACHMARK | OPTIONAL | /hanzi/atlas | atlas-first-char | — | keep |
| **mastery_first_use_v1** | COACHMARK | OPTIONAL | /dominio | dominio-header | — | **new** — "Seu Domínio mostra o que você já demonstrou e o que ainda está consolidando." |
| **practice_need_first_use_v1** | COACHMARK | OPTIONAL | /dominio | practice-what-i-need | — | **new**, only after the first is resolved — "Esta prática usa dificuldades e revisões recentes para escolher atividades." (never "IA escolheu") |
| review_session_intro_v1 | INLINE_TIP | PEDAGOGICAL_TIP | /revisao | — | — | keep |
| profile_entry_v1 | COACHMARK | OPTIONAL | /jornada | topbar-profile | ✓ | keep |
| immersion_first_use_v1 | COACHMARK | OPTIONAL | /imersao | immersion-first-scene | — | keep |
| account_appearance_v1 | COACHMARK | OPTIONAL | /mais | more-you | — | keep |
| journey_culture_bridge_v1 | UNLOCK_REVEAL | PEDAGOGICAL_TIP | /jornada | — | ✓ | keep |
| notifications_offer_v1 | UNLOCK_REVEAL | OPTIONAL | /jornada | — | — | keep (native, after value is clear) |

## Budget (unchanged, now gated)

1 global guidance per session; first session 2, the second only after the first activity; never during an answer, recording, keyboard, reward or modal; never A → B → C. Resolved (SHOWN/DISMISSED/SKIPPED) first-use guidance never returns; no `_v2` bump in this wave.

## First-use coverage

speech recording / self compare / ASR (inline in SelfComparePractice/PronunciationPractice) · Tone Trace (coachmark + inline) · Hànzì trace / memory write (inline in the writing exercise) · Personal Mastery + Praticar o que preciso (new) · Culture Deep (culture_first_use) · adaptive review (review_session_intro).

## Dragon

Dragon appears only on welcome, unlocks, new concept (tone trace), profile entry and the Culture bridge; ordinary coachmarks and the two new mastery tips have no dragon. Victory mascot respects reduced motion.
