# Owner pack — RC2.3.13R.3 Physical & Operational

**NO FEATURE WAVE. Agent automates everything it safely can. This pack is only what the agent cannot perform.**

## Exact APK (stop if mismatch)

| Field | Value |
|-------|-------|
| RC | `RC2.3.13-RC1` |
| Version | `0.2.0-rc.5` |
| versionCode | `651` |
| artifactSourceSha | `5c27be365ed276ce7694c15769dd7f9997ec1989` |
| APK file | `longyu-android-debug-0.2.0-rc.5-3be0ade.apk` |
| **APK SHA256** | `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` |
| Fingerprint | `fea5455e1461` |
| Channel | `DEVICE_QA` (sideload — not Play) |

Open `/qa/device` after install. **STOP** if identity mismatches.

## Owner-only actions

1. **Install** the exact APK above (verify SHA256 of the file bytes before install).
2. **Physical matrix** (record into `rc2-3-13r3-physical-certification.json` with device class + Android version + testedAt — no serial numbers):
   - Clean install + cold launch
   - Upgrade path (if prior QA build exists)
   - Home / Journey / Culture / sticky chrome / Journey↔Culture / rapid switch
   - Typography + motion physical
   - Audio ×20 (numbered PASS/FAIL)
   - Guided Try ×10 complete
   - Speech ×5 (incl. deny/recovery)
   - Conversation ×5 full turns
   - Hànzì / Review / Dynamic Aula
   - TalkBack / font scale / reduced motion / Back / IME
   - Background-resume / offline-reconnect / ≥30 min session
   - Account login/logout persistence
3. **Android OAuth physical** for each intended beta provider (start → consent → callback → session → cancel path).
4. **Play signing secrets** in GitHub Actions only (never paste into PR): see `PLAY_SIGNING_HANDOFF.md`.
5. **Owner acceptance** naming this APK SHA256 only (`OWNER_FINAL_PRE_BETA_ACCEPTANCE`).

## Agent-owned when credentials exist

- Sentry synthetic event + release identity
- Netlify rollback drill with timestamps
- Cloud smoke #1 and independent #2
- Cloud migration truth query
- Hosted E2E stamp after #343 terminal green
- Signed AAB build via `android-release.yml` after secrets

## Entry rules

```text
OWNER_QA_ENTRY = GO  only after physical matrix + acceptance on this hash
PLAY_CLOSED_BETA_ENTRY = GO  only after physical + ops + OAuth + signed AAB + acceptance
PUBLIC_BETA_ENTRY = HOLD
Wave 1 = 10 real testers only after Play Closed Beta GO
```

Do not accept “I tested the latest APK.”
