# Version authority (RC2.3.12B)

One authority. No hand-edited parallel versionCodes.

| Field | Authority | Location |
|---|---|---|
| `versionName` | `package.json` `version` | mirrored to Netlify `VITE_APP_VERSION`, Capacitor/`android` via Gradle JsonSlurper, `android-native-foundation.json` `versionName`, `rc-candidate.json` `version` |
| `versionCode` **floor** | `android/version.properties` `versionCode` | mirrored to `android-native-foundation.json` `versionCode` (floor only) |
| `versionCode` **computed** | `floor + first-parent commit count` via `scripts/lib/release-identity.mjs` `computeVersionCode` | injected at build as `LONGYU_ANDROID_VERSION_CODE`; recorded in `rc-candidate.json` `versionCode` |

## Rules

1. Never put a literal `versionCode` / `versionName` in `android/app/build.gradle`.
2. Never treat foundation `versionCode` as the Play upload code — it is the **floor**.
3. `rc-candidate.json` `versionCode` must equal `computeVersionCode` for the candidate `gitSha`.
4. Empty Play ledger ⇒ any computed code above floor is monotonic vs published history.
5. Drift between package / Netlify / foundation name / candidate name ⇒ `VERSION_AUTHORITY_DRIFT`.

## RC identity policy (RC1 draft)

`RC2.3.12-RC1` was never distributed or physically validated. RC2.3.12B **regenerates RC1 as draft** (same `rcId`) rather than minting RC2. If a future RC APK/AAB is uploaded to Play or side-loaded to testers, the next code change that alters the certified artifact SHA must mint `RC2.3.12-RC2`.
