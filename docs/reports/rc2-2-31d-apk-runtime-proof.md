# RC2.2.31D — Real APK runtime proof

Base: `#306` tip `f7f5ad23a60b4f9bfa61199ce565f82d9ae6b82d` (`RC2_2_31D_BASE_SHA`)

## Gaps closed

1. Fake `ConversationTenNodeInstrumentedTest` renamed to fixture contract; real WebView tests added
2. `android-runtime-emulator` CI job runs `connectedDebugAndroidTest`
3. `NativeSafeAction` — `safeObserve`, `actionRef`, unmount timer cleanup
4. Conversation V1/V2/finish — state-first (commit before trace/truth)
5. Async Direct→Media3 failover (`AUDIO_BACKEND_FAILED` non-terminal)
6. AudioFocus for Direct MediaPlayer
7. Pedagogical fail-open preserved; Closed Beta still NO-GO without physical audio PASS

## Lanes

| Lane | Meaning |
| --- | --- |
| ANDROID_BUILD | contracts + APK/AAB |
| ANDROID_EMULATOR_RUNTIME | install + WebView taps + DOM |
| ANDROID_PHYSICAL_OWNER | owner hears audio on device |

## Physical truth

- Prior `#305` FAIL preserved
- Current HEAD: `NOT_RUN` until owner APK
