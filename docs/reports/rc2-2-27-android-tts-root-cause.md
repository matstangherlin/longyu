# RC2.2.27 — Android TTS Root Cause + Completion Moment

- `RC2_2_27_BASE_SHA=eb84b6595249aff56f05dd4d71ad8c1142571075`. This is the real HEAD of #299; the body's APK SHA `e54ca366` was not used.
- Branch: `claude/rc2-2-27-android-tts-root-cause` (STACKED on `codex/rc2-2-26-android-physical-closure`).
- **CLOSED BETA: NO-GO.** Guided Try, Sequential TTS and Conversation Audio are still FAIL from the last physical test, and none of the three was retested on a device in this wave.

The cause analysis is in `docs/reports/rc2-2-27-android-tts-forensics.md`. The audit of audio-gated steps is in `docs/reports/rc2-2-27-audio-gated-steps.json`.

## OBSERVED

- **Owner, APK RC2.2.26:**
  - Guided Try 2/7 plays the audio, but Continuar stays grey.
  - Conversation: line 1 has audio, the next lines are silent.
  - Mobile web passes the same flow, so ANDROID_RUNTIME_BUG = CONFIRMED.
- **Base code (eb84b659), read line by line:**
  - `startSpeak` called `tts.stop()` unconditionally.
  - There was a single `startCall` slot.
  - The ACK depended only on `onStart` of the current `utteranceId`.
  - `onDone` without `onStart` rejected the ACK.
  - `stop()`/`getTtsStatus` ran outside the main thread.
  - The JS queried the state **once** (1.1 s).
  - Conversation autoplay ran outside the arbiter, and its cleanup did not cancel its own request.
  - The playback timeout called a global `stopSpeaking()`.
- **Gate `gate:rc2-2-27-android-tts-root-cause`:** 14 areas, all 35 required mutations killed, plus reinforcing mutations. It runs the real adapter (`nativeSpeech.ts`) against an engine simulated from the plugin contract:
  - isSpeaking with no callbacks.
  - 5 and 20 utterances in sequence.
  - Another request's START.
- **E2E `e2e/rc2-2-27-android-tts-root-cause.spec.ts` (Chromium, 8/8):**
  - The forensics panel shows the build verdict; the speech tests are disabled on the Web.
  - Guided Try with a silent engine shows [Tocar novamente] [Eu ouvi] [Continuar sem áudio] after the deadline.
  - With a confirmed engine, Continue unlocks on its own.
  - A silent conversation does not block Responder.
  - Guided Try needs no scroll at 390×844, 375×667 and 360×640.
  - The completion screen reveals in sequence, keeps Continue free and records the reopen key.
- **The Java plugin compiles** against stubs of the Android/Capacitor classes it uses (`javac`, no Gradle in this environment).

## INFERRED

- The candidates ranked C1–C7 (forensics §3) explain both symptoms, but **none was proven on a device**. The leading ones are:
  - C1: the ACK depends only on `onStart`.
  - C2: an unconditional stop before speak.
- **Structural corrections, in code** (they hold whatever the actual cause turns out to be):
  - Conditional stop.
  - TTS_SUPERSEDED instead of overwriting.
  - `isSpeaking` as an independent start source.
  - Polling repeated every 225 ms up to 4 s.
  - Each owner cancels only its own request.
  - One speech session for manual playback and autoplay.
  - `speechKey` per node.
  - stop/cancel/status calls on the main thread.
- **MODE A (`EXPLICIT_STOP`) vs MODE B (`QUEUE_FLUSH_ONLY`)** in the forensics panel decides C2 on the first physical test.
- **CompletionSequence is presentation only.**
  - It shows the Qi from the lesson's existing `newRewards` and the medal that already exists.
  - It reads the topic round captured at the start of the attempt.
  - It does not call `addXp`/`addQi`/`grantLessonReward`/`claimReward`.
  - The streak is not part of the reveal because it already has its own screen.

## NOT_TESTED

- **Everything physical (NOT_RUN):**
  - Build identity MATCH on the device.
  - 1/5/20 sequential utterances.
  - Interruption, A→DONE→B, double tap.
  - MODE A/B.
  - Guided Try 10/10 from a cold start.
  - 5 dialogues and 10 consecutive lines.
  - TTS → RECORDING → SELF_PLAYBACK → TTS → RECOGNITION → TTS.
  - Completion: sound, vibration and owner acceptance.
  - No-scroll on the device.
- **Main activities beyond Guided Try** have no automated no-scroll proof in this wave (lesson, Review, Pinyin, Tone Trainer).
- **Real Android engines** (Google TTS, Samsung SMT, others): callback behavior and `isSpeaking` are unknown until the panel runs on the device.
- **Unit and phase completion** (MAJOR) and **feature unlock** are wired in the module but not fed by LessonPlayer in this wave: no unlock, unit or phase delta reaches the victory screen. They remain owner debt.

## Owner, in this order

1. Install the APK from **this PR's HEAD**. In `/qa/device` → ANDROID TTS FORENSICS, paste the PR HEAD. If the verdict isn't **MATCH**, the test is TEST_INVALID: don't record PASS or FAIL.
2. Run "Teste uma fala" and "5 falas sequenciais". Tick "ouvi" on each row, then copy the diagnostic.
3. Repeat 5 utterances in `EXPLICIT_STOP`, then in `QUEUE_FLUSH_ONLY`.
4. Run interruption, A→DONE→B, double tap and simulated dialogue, then 20 utterances.
5. Guided Try 10× from a cold start. Then 5 complete conversations.
6. Complete a lesson and answer: "Parece satisfatório sem ficar infantil/poluído?" (YES/NO).
