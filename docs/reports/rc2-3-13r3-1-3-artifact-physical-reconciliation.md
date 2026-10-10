# RC2.3.13R.3.1.3 — Hosted Closure, Artifact Reconciliation & Targeted Physical Certification

```text
NO FEATURE WAVE.
NO NEW APK UNLESS CURRENT ARTIFACT IS INVALIDATED.
ARTIFACT RECONCILIATION + PHYSICAL PROOF.
```

## Parent

| Field | Value |
| --- | --- |
| PR | https://github.com/matstangherlin/longyu/pull/348 |
| Exact HEAD | `86f9dddfc02f7a2ffae90df9eed60d30dfee9c21` |
| Workflow merge SHA | `a6a467e8b65a205040a83e729ed8a77d5a849ab2` |
| Branch | `cursor/rc2-3-13r3-1-3-artifact-physical-reconciliation-af1a` |

## Hosted (re-query)

| Check | State |
| --- | --- |
| Release Truth | PASS |
| Security (gitleaks / npm audit / CodeQL Build / Analysis) | PASS |
| Beta suites | PASS |
| Quality/build | PASS |
| Android foundation | PASS · run `38023872888` |
| Android runtime emulator | PASS |
| Chromium | **PENDING** |
| WebKit | **PENDING** |
| Firefox | **PENDING** |
| Overall | **PENDING** until E2E terminal |

## Artifact (verified bytes)

| Field | Value |
| --- | --- |
| Artifact name | `longyu-android-debug-0.2.0-rc.5-a6a467e` |
| Artifact ID | `11659317310` |
| APK | `longyu-android-debug-0.2.0-rc.5-a6a467e.apk` |
| APK SHA256 | `fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af` |
| AAB SHA256 | `72d9088a2a9d24dc342624e158290eeea10cd903d8f5ef923ca315436b35c657` (DEBUG) |
| ZIP digest (not APK) | `ab71ae3ceb2f733c59bc6cd81aead46f48525f6eff76fb3f59a74c6d83039422` |
| versionName / versionCode | `0.2.0-rc.5` / `675` |
| packageId | `longyu.noba.com` |
| Channel | DEVICE_QA |
| Play ready | **false** |

## SHA model

| Field | Value |
| --- | --- |
| `prHeadSha` | `86f9dddf…` |
| `learnerRuntimeSha` | `b6fe9153…` (unchanged) |
| `artifactSourceSha` | `86f9dddf…` (PR head inside APK provenance scan) |
| `workflowMergeSha` | `a6a467e8…` |
| Fingerprint (current) | `29bb02ec0336` |
| Historical RC1/RC2 | `57a848ef9ef9` |

## dirtyTree forensics

| Field | Value |
| --- | --- |
| `dirtyTree` | `true` |
| Classification | **SAFE_BUILD_OUTPUT** |
| Mechanism | `android-cli` `readGitState` (`git status --porcelain --untracked-files=no`) runs at the start of `debug` / `bundle:debug`, after the Contratos Android gate chain has regenerated tracked report/docs outputs |
| Why safe for DEVICE_QA | Debug packaging does not require a clean tree (only `bundle:release` does). Packaged web bytes come from vite + Capacitor sync in the Debug step; APK provenance scan PASS for PR head `86f9dddf` + fp `29bb02ec0336` |
| Artifact impact | NONE_ON_LEARNER_RUNTIME_BYTES |
| Rebuild required? | **No** — do not invalidate for cosmetic git status |
| `sourceOfTruth` field | Provenance writes legacy `"main"`; actual authority is the PR branch + `prHeadSha` / `workflowMergeSha` above |

## Targeted physical

```text
R31_TARGETED_PHYSICAL_RETEST = NOT_RUN
```

Emulator success does not convert this to PASS.

## Entry

```text
OWNER_QA_ENTRY = OWNER_ACTION_REQUIRED
PLAY_CLOSED_BETA_ENTRY = HOLD
PUBLIC_BETA_ENTRY = HOLD
Wave1 invited = 0
resumeFullR3 = false
```

## Next

1. Terminal Chromium / WebKit / Firefox on exact head → `HOSTED = PASS`.
2. Owner installs APK `fc72f9e3…` and runs seven targeted checks.
3. PASS → resume full R.3 + ops (Sentry / rollback / cloud ×2 / OAuth).
4. Keep debug AAB out of Play.
