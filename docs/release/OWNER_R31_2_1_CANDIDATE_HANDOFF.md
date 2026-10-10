# USE THIS APK

```text
File:         longyu-android-debug-0.2.0-rc.5-a6a467e.apk
RC:           RC2.3.13 DEVICE_QA (debug)
Version:      0.2.0-rc.5
versionCode:  675
Package:      longyu.noba.com
Source:       86f9dddfc02f7a2ffae90df9eed60d30dfee9c21  (PR head)
Workflow:     a6a467e8b65a205040a83e729ed8a77d5a849ab2  (merge SHA)
APK SHA256:   fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af
AAB SHA256:   72d9088a2a9d24dc342624e158290eeea10cd903d8f5ef923ca315436b35c657  (DEBUG — not Play)
Fingerprint:  29bb02ec0336
Channel:      DEVICE_QA
Run:          https://github.com/matstangherlin/longyu/actions/runs/38023872888
Artifact ID:  11659317310
```

# DO NOT USE OLD APK

```text
fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

That hash is **STALE_FOR_CURRENT_RUNTIME**.

Do **not** confuse the GitHub artifact ZIP digest
`ab71ae3ceb2f733c59bc6cd81aead46f48525f6eff76fb3f59a74c6d83039422`
with the APK SHA256 above.

---

## Pre-check on `/qa/device`

Before scoring any physical check, confirm:

```text
version 0.2.0-rc.5
versionCode 675
fingerprint 29bb02ec0336
DEVICE_QA
source ~ 86f9dddf
```

Mismatch → **STOP**.

---

## Status (engineering)

| Item | State |
| --- | --- |
| Hosted (Release Truth / Security / beta / Android / quality) | **PASS** |
| Chromium / WebKit / Firefox | **PENDING** (do not claim full HOSTED PASS yet) |
| New Owner QA APK | **BUILT** · `fc72f9e3…` |
| Provenance `dirtyTree` | **SAFE_BUILD_OUTPUT** (contratos regenerate reports before debug pack; packaged APK provenance scan PASS for PR head) |
| Debug AAB | **not** Play-signed / not Play-ready |
| `learnerRuntimeSha` | `b6fe9153…` |
| `R31_TARGETED_PHYSICAL_RETEST` | **NOT_RUN** |
| OWNER_QA_ENTRY | **OWNER_ACTION_REQUIRED** |
| PLAY_CLOSED_BETA_ENTRY | HOLD |
| PUBLIC_BETA_ENTRY | HOLD |
| Wave 1 invite | **0** |

## Targeted owner retest (seven checks)

1. Zero normal `EXERCÍCIO PULADO`
2. Full `我叫 + name`
3. Full dialogue audio incl. `不客气`
4. Fair personalized distractors
5. Visual variety
6. Hànzì small-screen fit
7. Audio ×20 (human-audible complete playback)

Emulator PASS ≠ physical PASS.
