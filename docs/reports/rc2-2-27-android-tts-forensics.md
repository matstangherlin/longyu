# RC2.2.27 — Android TTS forensics

- `RC2_2_27_BASE_SHA=eb84b6595249aff56f05dd4d71ad8c1142571075`. This is the real HEAD of #299 (`codex/rc2-2-26-android-physical-closure`), not the APK SHA in the PR body (`e54ca366`).
- Branch: `claude/rc2-2-27-android-tts-root-cause`.
- Physical status of this wave: **NOT_RUN**. No device was available in this environment. Nothing below is a PHYSICAL PASS.

## 1. What the owner observed (OBSERVED, physical, RC2.2.26 APK)

| Symptom | Where | Status |
| --- | --- | --- |
| Guided Try 2/7: you hear 你好, but Continuar stays grey | APK | REPRODUCED_AFTER_RC2_2_26 |
| Conversation: line 1 has audio, the following lines are silent | APK | REPRODUCED |
| Same flow on mobile web works | Mobile web | PASS (web) |
| Conclusion: the defect is in the Android runtime (plugin and adapter), not the shared UI | — | ANDROID_RUNTIME_BUG = CONFIRMED |

Test-identity warning: the RC2.2.26 PR body pointed to the APK `e54ca366` while the branch HEAD was `eb84b659`. Without comparing PR HEAD, workflow HEAD, embedded SHA and installed SHA, a physical result cannot be accepted as PASS or FAIL. RC2.2.27 adds that verdict in `/qa/device` (`buildIdentityVerdict`, MATCH / TEST_INVALID / UNKNOWN).

## 1b. Owner run on the #300 APK (OBSERVED)

- **Result: FAIL.** On Guided Try 2/7, Continuar stayed grey **with no status text and no recovery box**: the screen was in `IDLE`. The "Primeiro cumprimento" conversation showed the same symptom.
- **No diagnostic was possible.** The CI debug APK was built as `production_beta`, so `deviceQaEnabled=false`: there was no `/qa/device`, no technical line on Guided Try, and no `LongyuTTS` logs. The installed SHA is unknown (build identity `UNKNOWN`).
- **What the code explains** (CONFIRMED_IN_CODE, not the TTS cause):
  - A request that ended as *superseded* before starting sent the screen back to `IDLE`.
  - The UI deadline only armed in `STARTING`, so nothing ever offered a way out.
- **Fixed in #300 itself:**
  - The deadline is armed by the **tap**.
  - Superseded without a start becomes a recoverable failure (`TTS_SUPERSEDED`, offering [Tocar novamente] [Eu ouvi] [Continuar sem áudio]).
  - A `guided_try_audio_superseded` event is recorded.
  - The `android-build` debug APK is built with `VITE_DEVICE_QA=true`, as the diagnostic APK of the RC2.2.20 contract (never in the release).
- **The TTS root cause (C1–C7) remains NOT PROVEN.** The next owner run, on the diagnostic APK, has to come with the panel diagnostic.

## 2. Base path (eb84b659), read line by line (OBSERVED in the code)

### Manual playback (Guided Try, Ouça)
`playMandarinAudio` → `claimAudio("TTS", () => stopSpeaking())` → `speak` → `speakNative` → `nativeSpeakTracked` → `LongyuSpeech.startSpeak`.

### Autoplay (conversation)
`SpeechBubble` → `useAutoSpeak` → `tts.scheduleAutoSpeak` → `speak` → `speakNative`.
- It does **not** go through `playMandarinAudio` or the audio arbiter.
- It has no requestId of its own at the call site.
- Its cleanup cancels only the timer, not the in-flight request.

### Native start/ACK in the plugin
In `LongyuSpeechPlugin.java@eb84b659`:
- `startSpeak` (around lines 268–322):
  - `if (tts != null) tts.stop(); finishSpeak(true);` is **unconditional**, even with the engine idle.
  - Then `startCall = call;`. There is a **single** `startCall` slot, so a second call overwrites the first.
  - Then `setLanguage/rate/pitch` run on every speak, followed by `tts.speak(QUEUE_FLUSH)`.
- The start ACK depends 100% on `UtteranceProgressListener.onStart`, and only when `utteranceId.equals(currentUtteranceId)` (around lines 378–405).
- `onDone` with no prior `onStart` runs `clearStartCall("TTS_START_NOT_CONFIRMED")`: the ACK is rejected even though the engine has **finished speaking** (around line 417).
- `stop()` (around line 482) and `getTtsStatus` run **on the bridge thread** (no `main.post`). They change `currentUtteranceId/currentRequestId/startCall` concurrently with the listener callbacks, which do run on `main`.

### JS adapter (`nativeSpeech.ts@eb84b659`)
- It queries `getTtsPlaybackState` **once**, at 1100 ms, plus once more in the `catch` (around lines 315 and 322).
- A start observed after 1.1 s that isn't followed by a DONE before the rejection is lost.

### Global stop from the playback contract (`audioPlayback.ts@eb84b659`)
- `NO_END_TIMEOUT` (8 s after the start) calls **global** `stopSpeaking()` (around line 236). It can cut a later line's utterance, not the one that timed out.

## 3. Candidate causes, ranked (CANDIDATE_FROM_CODE, not proven on a device)

| # | Candidate | Explains | Confidence | How the device proves or refutes it |
| --- | --- | --- | --- | --- |
| C1 | All three ACK sources (direct, event, query) derive from `onStart` of the **same** `currentUtteranceId`. Engines that skip `onStart` or deliver it late, or a concurrent `stop()` on the bridge thread nulling `currentUtteranceId`, leave Continuar grey even though the audio played. | Guided Try grey with audio heard | HIGH | Forensics panel: `isSpeaking=true` with `startCallback=—` (ack `isSpeaking`) or `ackSource=onDone` with `startEventMissed=true` |
| C2 | Unconditional `tts.stop()` immediately before `speak(QUEUE_FLUSH)`. On some engines, stop on an idle engine plus an immediate speak drops the next utterance, or its `onStart` never arrives. | Lines 2+ silent | HIGH | MODE A (`EXPLICIT_STOP`) vs MODE B (`QUEUE_FLUSH_ONLY`) in the "5 sequential utterances" test, same device and same SHA |
| C3 | Single `startCall`: a second request (double tap, autoplay plus manual) overwrites the first, whose promise never resolves or resolves with the wrong data. | Intermittent grey | MEDIUM | "Double tap" test: the first request must end as `SUPERSEDED` |
| C4 | `onDone` without `onStart` rejects the ACK (`TTS_START_NOT_CONFIRMED`). Engine finished, UI says failure. | Guided Try grey | MEDIUM | `ackSource=onDone` in the history |
| C5 | Conversation autoplay outside the arbiter, with no request ownership. The previous bubble's cleanup doesn't cancel its own request; the new speak kills it with a global stop and the race (C1/C2) decides who speaks. | Conversation line 1 only | MEDIUM | "Simulated dialogue" test: every line with `ENGINE_SPEAKING` + `DONE` |
| C6 | `NO_END_TIMEOUT` → global `stopSpeaking()` cuts a later utterance. | Silence in the middle of a dialogue | LOW | Request with `ON_STOP` that wasn't cancelled by its owner |
| C7 | `setLanguage` on every speak. Some engines rebind the voice and lose the first callback. | Late start | LOW | `languageStatus` stable plus `ON_START` present only when the locale didn't change |

**Root cause: NOT YET PROVEN.** RC2.2.27 does not claim it fixes the cause. It delivers instrumentation that decides between C1–C7 on the first physical test, plus the structural corrections the spec already required regardless of the cause.

## 4. Instrumentation delivered (CODE)

- **Native per-request registry (`TtsRequest`)**:
  - States: CREATED, QUEUED, ENGINE_SPEAKING, STARTED, DONE, SUPERSEDED, STOPPED, ERROR.
  - Timestamps.
  - Preflight: hadActiveRequest, previousState, previousEngineSpeaking, stopCalled, stopCallbackReceived, newSpeakCalledAt, newSpeakResult, newIsSpeakingObservedAt, stopMode.
- **Independent source `tts.isSpeaking()`**: native watchdog every 75 ms for up to 4 s. Only the current request can be confirmed by it.
- **START acceptance**: `onStart`, `isSpeaking` of the same current request, `DONE` (with `startEventMissed`), or direct ACK.
- **JS polling** of `getTtsPlaybackState` every 225 ms until 4 s.
- **`cancelSpeak(requestId)`**: the owner cancels only its own request.
- **QA stop modes**: `CONDITIONAL` (default; stops only if `isSpeaking`), `EXPLICIT_STOP` (MODE A) and `QUEUE_FLUSH_ONLY` (MODE B).
- **`LongyuTTS` logs** (QA only, never text): REQUEST, QUEUE_RESULT, ENGINE_IS_SPEAKING, ON_START, ON_DONE, ON_STOP, ON_ERROR, SUPERSEDED, CANCELLED.
- **`/qa/device` → ANDROID TTS FORENSICS**:
  - Build identity and verdict.
  - Engine, package, requested locale vs voice locale, language status, API, manufacturer, WebView.
  - Current request, `isSpeaking`, callback counts and the last 20 requests.
  - Buttons: 1 / 5 / 20 sequential utterances, interruption, A→DONE→B, double tap, simulated dialogue, copy diagnostic.
  - An "ouvi" (heard) column that the owner ticks.

## 5. Structural corrections (CODE; physical NOT_RUN)

- There is no more unconditional `tts.stop()`. In the default mode the plugin stops only if the engine is speaking.
- The previous request is rejected with `TTS_SUPERSEDED`. It is never overwritten silently.
- `stop()` and `cancelSpeak` run on `main`, the same thread as the listener callbacks.
- **One speech runtime (`requestMandarinSpeech`)**:
  - Sources: GUIDED_TRY, LESSON_AUDIO, CONVERSATION_AUTOPLAY, CONVERSATION_MANUAL, TONE, REVIEW, CULTURE, IMMERSION, PINYIN, SPEAKING_MODEL.
  - Modes: USER_REQUESTED and AUTO_PLAY.
  - Autoplay now goes through the same owner, arbiter and correlation.
- **Conversation autoplay**:
  - `useAutoSpeak` reacts to `speechKey` (`scene:node:index`), so the same text in a new node plays again.
  - Cleanup cancels only the bubble's own request.
- The playback timeout cancels **its own** request, never a global stop.
- **Guided Try**:
  - Continue unlocks with the first confirmed start (`onStart`, `isSpeaking`, `DONE`, ACK).
  - After `GUIDED_LISTEN_DEADLINE_MS` it offers [Tocar novamente] [Eu ouvi, continuar] [Continuar sem áudio]. "Eu ouvi" is a UX fallback; it does not count as PHYSICAL_PASS.

## 6. What the owner needs to run (in this order)

1. Install the APK from this PR's HEAD. In `/qa/device`, paste the PR HEAD. Without **MATCH**, stop: the test is TEST_INVALID.
2. ANDROID TTS FORENSICS:
   - "Teste uma fala", then "5 falas sequenciais".
   - Tick "ouvi" on each row.
   - Copy the diagnostic.
3. Switch the mode to `EXPLICIT_STOP` (MODE A) and repeat "5 falas"; then `QUEUE_FLUSH_ONLY` (MODE B) and repeat. The A/B difference decides C2.
4. "Teste interrupção", "A→DONE→B", "Toque duplo" and "Diálogo simulado". Then 20 utterances.
5. Guided Try 10/10 from a cold start. Conversation: 5 dialogues, 10 consecutive lines.

Until then: Guided Try / Sequential TTS / Conversation Audio = FAIL (last physical result) and **CLOSED BETA = NO-GO**.
