# Play signing handoff — RC2.3.13-RC1

**NO SECRET VALUES IN THIS FILE.**

## Status

`PLAY_CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED`  
Reason: `BLOCKED_SIGNING_SECRETS`

## Secrets expected (GitHub Actions)

| Secret | Purpose |
|--------|---------|
| `LONGYU_ANDROID_KEYSTORE_BASE64` | Upload keystore (`.jks`) as base64 |
| `LONGYU_ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `LONGYU_ANDROID_KEY_ALIAS` | Key alias |
| `LONGYU_ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API upload (Closed Testing) |

Consumed by: `.github/workflows/android-release.yml`  
Policy: `docs/RELEASE_PIPELINE.md`

## Verification (after owner configures secrets)

1. Re-run `android-release.yml` on `artifactSourceSha` / R.2 HEAD.
2. Confirm exit is **not** `BLOCKED_SIGNING_SECRETS` (exit 4).
3. Download signed AAB; compute SHA256 from bytes.
4. Stamp `playClosedBeta.status = SIGNED_BUILT` + `signedAabSha256`.
5. Only then evaluate `PLAY_CLOSED_BETA_ENTRY = GO` (still requires physical/ops as per cert).

## Do not

- Commit keystore or passwords
- Upload debug AAB to Play as “release”
- Treat Owner QA debug APK as Play Closed Testing candidate
