# RC2.2.31B — Full Android runtime closure

Base: **#304** tip `8a0633234b8d57b6a8239c15e2ed2f75d7356045`

## Code closure

| Area | Change |
| --- | --- |
| Fixed corpus | 657/657 `fixed-speech-xiaoxiao-v1` (0 `extended-tone-v1`) |
| AQV3 | `silencedetect` + volumedetect on **all** fixed assets |
| Media3 | Session-scoped listener (`capturedRequestId`/`capturedGeneration`) |
| Terminals | `AUDIO_SUPERSEDED` / `AUDIO_CANCELLED`; Promise always settles |
| READY | Only after native `AUDIO_READY` |
| Listeners | Partial bind removes handles before FAILED |
| Conversation | Real pointer/click traces; Reveal/Repair/stall-retry via `ConversationActionBoundary` |

## Physical truth

- #303 owner: Guided Try / Conversation / Sequential = **FAIL**
- #304: code-fixed, **not** owner-proven
- 31B: `CLOSED_BETA = NO_GO` until owner HEAD APK PASS

## Gate

`npm run gate:rc2-2-31b-android-runtime-final`
