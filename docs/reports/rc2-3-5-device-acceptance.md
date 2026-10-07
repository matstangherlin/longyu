# RC2.3.5 — Speech Device Acceptance

Nothing here promotes a level automatically.

## Status

| Level | Status | Evidence |
|---|---|---|
| `CODE_PASS` | **PASS** | `gate:rc2-3-5-speech` — validator + 16/16 mutations, `test:rc232-unit`, `rc230-self-compare` |
| `WEB_PASS` | **PASS** (Chromium, fake mic) | `e2e/rc2-3-5-speech-contrast.spec.ts` 6/6 at 360×640, 375×667, 390×844 + `rc2-2-20-physical-readiness.spec.ts` 6/6 |
| `ANDROID_BUILD_PASS` | pending on this PR's head | "Android foundation" workflow |
| `APK_GENERATED` | pending on this PR's head | debug APK artifact of that run |
| `EMULATOR_PASS` | generic runtime only (previous heads) | no emulator test drives the microphone |
| `OWNER_AUDIO_ACCEPTANCE` | **NOT_RUN** | requires the owner on a real device |

## Pilot (8 items, `src/lib/speechPilot.ts`)

| # | Target | Prerequisite | Discovery | Perception | Production | Transfer | Model audio | Fallback |
|---|---|---|---|---|---|---|---|---|
| 1 Tone | 十 shí × 是 shì (2 × 4) | 十, 是 seen | listen A/B | Journey `audio_discrimination` | SelfCompare 是 | l8-shi (我是…) | canonical 是 | SELF_COMPARE |
| 2 Initial | 七 qī × 吃 chī (ch × q) | 七, 吃 seen | listen A/B | `audio_discrimination` | SelfCompare 吃 | — | canonical 吃 | SELF_COMPARE |
| 3 Final | 号 hào × 后 hòu (-ao × -ou) | 号, 后 seen | listen A/B | `audio_discrimination` | SelfCompare 后 | — | canonical 后 | SELF_COMPARE |
| 4 Word | 谢谢 | 谢 | — | model | SelfCompare | — | canonical 谢谢 | CONTINUE_WITHOUT_SPEAKING |
| 5 Phrase | 你好 | 你, 好 | — | model | PronunciationPractice (ASR optional) | greeting conversation | canonical 你好 | SELF_COMPARE |
| 6 Conversation | 我要米饭 | 我, 要, 米, 饭 | — | model | free answer (voice or keyboard) | `pedir-cardapio` | canonical 我要米饭 | CONTINUE_WITHOUT_SPEAKING |
| 7 Android recognition fallback | 请问 | 请, 问 | — | model | ASR → no service / no zh / 2 failures → SelfCompare | — | canonical 请问 | SELF_COMPARE |
| 8 Self-compare fallback | 再见 | 再, 见 | — | model | mic denied / no recorder → continue | — | canonical 再见 | CONTINUE_WITHOUT_SPEAKING |

Ladder rule enforced by the gate: discovery first, perception before production, production before transfer; contrasts must exist in Library V2; production is never open to a learner who has not seen both sides.
Speech is **not** spread across the 134 lessons in this wave; expansion waits for owner acceptance of this pilot.

## Android torture test (owner, real device)

| Case | Expected | Result |
|---|---|---|
| Cold start → straight into a speech exercise | model plays; record works | NOT_RUN |
| Mic first use | explanation, then system prompt | NOT_RUN |
| Mic allowed | "Gravando…" only once capture starts | NOT_RUN |
| Mic denied | message + retry + "Não posso falar agora" | NOT_RUN |
| Mic permanently denied | guidance to Settings | NOT_RUN |
| Model → record immediately | model stops before capture (arbiter RECORDING) | NOT_RUN |
| Record → self playback | own voice audible; "Reproduzindo…" only after PLAYING | NOT_RUN |
| Self playback → model | no overlap | NOT_RUN |
| Recognition (Mandarin available) | text result, honest copy (syllables, not tone) | NOT_RUN |
| Recognition unavailable | Record & compare offered | NOT_RUN |
| No internet | fallback, never stuck | NOT_RUN |
| Background while recording | recording discarded, state consistent on return | NOT_RUN |
| Background while playing | no stuck player | NOT_RUN |
| Interruption (other audio app) | playback stops cleanly | NOT_RUN |
| Rapid taps play/record/stop/retry | no race, no stuck state | NOT_RUN |
| 5 full runs model → record → self → recognition/fallback → continue | 5/5 without dead end | NOT_RUN |

## Owner checklist

### A. Contrast
- [ ] A/B clearly different (Pinyin Lab → Iniciais → g × k, j × q × x, ch × sh, z × c)
- [ ] same voice on A and B
- [ ] consistent audio level
- [ ] no strange speaker change
- [ ] replay works
- [ ] b × p, d × t, r × l, u × ü, an × ang, en × eng, in × ing show "áudio em preparação" (no silent side, no grading)

### B. Recording
- [ ] mic asks permission correctly
- [ ] "Gravando…" only when capture starts
- [ ] stop works
- [ ] file really exists (own voice audible)
- [ ] hear my voice works
- [ ] re-record works

### C. Recognition
- [ ] Mandarin recognized
- [ ] coherent text result
- [ ] no match does not block
- [ ] unavailable service does not block

### D. Audio
- [ ] model → mic
- [ ] mic → self playback
- [ ] self playback → model
- [ ] no silence where audio is expected
- [ ] no simultaneous audio

### E. Lifecycle
- [ ] background / resume
- [ ] lock / unlock (if testable)
- [ ] leave and return
- [ ] temporary recording is deleted

### F. UX
- [ ] 360×640
- [ ] 375×667
- [ ] 390×844
- [ ] no unexpected scroll
- [ ] no DEV text
- [ ] clear CTA

Record device model, Android version, APK artifact id and date. Only then: `OWNER_AUDIO_ACCEPTANCE`.
