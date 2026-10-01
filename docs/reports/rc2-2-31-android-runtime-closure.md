# RC2.2.31 — Android audio root-cause + conversation deadlock

Base: `#303` tip `a70bff9d9fd5e762373ae7e55ce35bac15f66e60`

## Physical truth (owner on #303)

| Check | Result |
| --- | --- |
| Guided Try audio | FAIL / REPRODUCED |
| Conversation Continue | FAIL / REPRODUCED |
| Sequential conversation audio | FAIL / REPRODUCED |
| CLOSED_BETA | NO_GO |

## Root causes fixed in code

1. **Request-blind cancel** — `LongyuMediaPlugin.cancelCanonicalAudio(requestId)` now no-ops with `STALE_REQUEST` when `requestId != activeSession.requestId`. Cleanup of bubble A can no longer kill playback B.
2. **Stale Media3 callbacks** — `MediaItem.mediaId = requestId`; callbacks read `player.getCurrentMediaItem().mediaId` and ignore mismatches (`STALE_MEDIA_CALLBACK_IGNORED`).
3. **Tone placeholders as "speech"** — core pack was `core-tone-v1` pure tones (~450ms). Regenerated with `zh-CN-XiaoxiaoNeural` (edge-tts) as real Mandarin; AQV2 measures volume/silence.
4. **Conversation dual state / click-only** — V2 derives `nodeId` from `runtime.nodeId` only; V1+V2 Continue use `NativeSafeAction` (pointer → click → ~50ms fallback, idempotent).

## Gate

`npm run gate:rc2-2-31-android-runtime-closure` — local PASS (mutations killed + typecheck).

## Still required for Done

Owner installs HEAD APK and re-runs physical matrix (Guided Try 10/10, Conversation 20/20, sequential 10/10). Until then CLOSED_BETA remains NO_GO.
