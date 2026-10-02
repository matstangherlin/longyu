# RC2.2.31C — Android WebView gesture root cause

Base: `#305` tip `96d6dc7da40173e72a83a03df2097ae072103a0a`

## Root cause

Android WebView can expose `LongyuSpeech` (`isTTSAvailable() === true`) while `window.speechSynthesis` is `undefined`. `resumeSpeechSynthesis()` used `isTTSAvailable()` then dereferenced `speechSynthesis.paused` → TypeError inside `noteUserGesture()`.

That blocked:

1. Guided Try — `noteUserGesture()` before `playCanonicalAudio` → asset never requested
2. Conversation — `noteUserGesture()` before `goTo` → Continuar did nothing

## Fixes

- `webSpeechSynthesis()` — never use `isTTSAvailable()` as Web Speech proof
- `noteUserGesture()` — never throws
- Conversation `advance` / `advanceDialogue` — state first; no gesture on critical path
- `playMandarinAudio` — gesture best-effort; always reaches player
- Direct `MediaPlayer` + `AssetFileDescriptor` primary for packaged speech
- No READY→HEARD laundering; `PLAYBACK_NOT_CONFIRMED` without STARTED proof
- Guided Try — no 「Configurar voz chinesa」 for asset failure

## Physical truth

- Prior `#305` APK (pre-`1713d851`): Guided Try FAIL, Conversation FAIL (owner screenshots)
- Current HEAD: `NOT_RUN` until owner installs matching APK

Closed Beta: **NO-GO** until owner physical PASS.
