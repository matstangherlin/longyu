# RC2 — Device test matrix (canonical)

Authority for **what** must be covered on Android/iOS before public beta.
Human execution details and historical emulation notes live in
[`docs/REAL_DEVICE_QA.md`](../REAL_DEVICE_QA.md) and the evidence runbooks under
`docs/release/evidence/`. **Do not duplicate** those runbooks here.

## Honesty labels

| Label | Meaning |
|---|---|
| `EMULATED` / `CHROMIUM` / `WEBKIT` | Automation or engine preflight — **not** formal device PASS |
| `PREVIEW_DEVICE_PREFLIGHT` | Physical device against deploy-preview — still not formal PASS |
| `CANDIDATE` | Formal runbook against published `qa_candidate` only |

Emulation **must never** flip `android_real_device` / `ios_real_device` /
`pwa_upgrade` / `rollback_drill` to `pass: true`.

## Android (formal + preflight)

| Surface | Preflight | Formal (candidate) |
|---|---|---|
| Chrome Android | `mobile-chrome` / Pixel-ish | Real phone model + OS + Chrome |
| Portrait 390-ish / 360 / 375 | `e2e` viewports | Same on device |
| Keyboard closed / open | `simulateVirtualKeyboard` + sticky CTA e2e | Physical keyboard inset |
| Mic allow / deny / cancel / retry | stubs + code paths | Real permission UI |
| Audio autoplay / replay | policy + e2e | Real Chrome audio |
| PWA standalone | manifest/SW audit | Install from candidate |

## iOS (formal + preflight)

| Surface | Preflight | Formal (candidate) |
|---|---|---|
| Safari iPhone | `mobile-safari` / WebKit | Real iPhone + iOS + Safari |
| Keyboard + safe-area | CSS `env(safe-area-inset-*)` + sticky | Notch / home indicator |
| Autoplay blocked | `feedbackAudioPolicy` + replay affordance | Real Safari autoplay policy |
| SpeechRecognition unavailable | FreeAnswerField hides dead mic CTA | Real Safari |
| PWA standalone | manifest audit | Add to Home Screen |
| Orientation reload | optional | If supported on device |

## Required routes (mobile sweep)

`/` · onboarding · `/jornada` · lesson player · review · Reforço+ · Culture Hub ·
Culture collection · Culture Moment · History · Profile · Missions · feedback.

Automation entry points: `e2e/mobile-device.spec.ts`,
`e2e/lesson-player-mobile.spec.ts`, `e2e/guided-journey-culture.spec.ts`,
`e2e/culture-hub.spec.ts`, sticky CTA specs.

## Viewports (minimum)

| Size | Role |
|---|---|
| 390×844 | iPhone-class |
| 375×667 | Small iPhone |
| 360×800 / 360×640 | Android-class narrow |
| 393×851 | Pixel 5 profile (`mobile-chrome`) |

## Formal identity (future evidence)

Device model · OS version · browser version · `commitSha` = candidate C ·
`environment=qa_candidate`.

## Preflight status file

See `docs/release/device-preflight.json` — `PREFLIGHT_*` only. Formal checks in
`rc1-operational-checks.json` stay `false` until candidate drills.
