# RC2.3.6 — Evidence Source Audit

What every existing learning surface can honestly say about the learner — and what it cannot. Machine-readable: [`rc2-3-6-evidence-source-audit.json`](rc2-3-6-evidence-source-audit.json).

TRUST: **HIGH** = graded, unaided outcome on a known target · **MEDIUM** = graded but scaffolded or partial · **LOW** = participation/exposure only · **NONE** = must not count.

| Source | Measures | Does NOT measure | Storage | Retention | Can sync later | Trust |
|---|---|---|---|---|---|---|
| Core lesson step (`LessonPlayer.completeCurrentStep`) | per-step correct/incorrect, help level, step kind → competency | mastery after one step; anything about un-graded steps | LER (new) — before: only lesson-level `itemDimensionsByRef` | recent 1500 + aggregates | yes (stable event ids) | HIGH (graded) / LOW (discovery) |
| Lesson dimensions (`itemDimensionsByRef`) | lesson accuracy ≥ 0.7 smeared over **every** authored ref | which item was right or wrong (**truth finding**: not per-step) | zustand store | whole history | yes (existing sync) | LOW — not used as evidence |
| Lesson mastery (`lessonMasteryById`) | passes, last accuracy | per-item, per-skill competency | store | whole history | yes | LOW → legacy prior only |
| Speech (`speechEvidence`, #316) | model heard, perception trials/correct, recording captured, self playback, ASR attempt/match, retries | tone, pronunciation quality, ASR miss as learner error | `longyu:speech-evidence-v1` + LER | 200 events + LER | yes (counts only) | perception HIGH · ASR match MEDIUM (text, not tone) · self-compare LOW · mic failure NONE |
| Hànzì form evidence (#314/#315) | recognition, assembly, completion, stroke order, tracing, memory write, context write — separate channels; help/undo/replay | handwriting from recognition; memory writing from tracing | `longyu:hanzi-form-evidence-v1` + LER | per char + LER | yes | memory/context write HIGH · trace LOW (guided) · recognition MEDIUM (form only) |
| Culture Deep | introduced / practiced / mastered (mission) / memory review ok/miss | language production | store (`cultureKnowledgeById`, `cultureMemoryById`) + LER | store + LER | yes | recall/scenario HIGH · practice MEDIUM · observed LOW |
| Everyday intents (RC2.3.2) | intent + learner agency of the step (CHOOSE/COMPLETE/PRODUCE/SPEAK/TRANSFER) | free production from a contextual choice | step metadata → LER skill | LER | yes | choice LOW · completion MEDIUM · sentence/free/transfer HIGH |
| SRS (`srs`, review) | effective grade per domain (assisted grade capped at Hard) | skills the domain doesn't exercise | store + LER | store + LER | yes | HIGH (meaning/listening/form), MEDIUM (assisted) |
| Support / help (`HelpAffordance`, help level) | which help was used | — | folded into LER `supportUsed` / `independence` | with the event | yes | modifier, never a result |

## Findings

1. **Lesson-wide smear** (`LessonPlayer` lesson end): `itemDimensionsByRef` writes `correct: accuracy >= 0.7` for every ref in the lesson. It cannot tell which item failed. RC2.3.6 does not read it as evidence; per-step outcomes now go to the LER.
2. **Technical vs learning failure** was already separated in speech (RC2.3.5 fallback) but not represented as data; the LER has `SKIPPED_TECHNICAL`, which never counts.
3. **Assisted review** already caps the grade; the LER additionally lowers `independence`.
4. No source stores audio, transcripts, stroke images or biometrics; the LER contract has no field for them (gate PM12).
