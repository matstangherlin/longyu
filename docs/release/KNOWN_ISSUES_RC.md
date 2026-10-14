# Known issues — RC2.3.12-RC1

## VERSION-NAME-NETLIFY-DRIFT (REPAIRED in 12B)

**Severity:** P1 (was)  
**Surface:** Android hosted / release-identity  
**Beta blocker:** no (fixed)  
**Workaround:** n/a  
**Notes:** `netlify.toml` `VITE_APP_VERSION` lagged at `0.2.0-beta.1` while package was `0.2.0-rc.1`, killing Android foundation before APK/AAB. Aligned in RC2.3.12B. See `VERSION_AUTHORITY.md`.

## CLOUD-CERT-BLOCKED

**Severity:** P1  
**Surface:** cloud / launch  
**Beta blocker:** yes (for cloud-required beta paths)  
**Workaround:** fail-closed missing backends; FREE_ONLY beta; no Batch A apply without backup  
**Notes:** `cloud.certification=BLOCKED` carried from #325/#326. Classified in `rc2-3-12-cloud-blocker-classification.json`.

## SENTRY-CONFIG-REQUIRED

**Severity:** P1  
**Surface:** observability  
**Beta blocker:** yes (unless owner approves exception)  
**Workaround:** none — Closed Beta without crash telemetry is high risk  
**Notes:** `OA-SENTRY-PROJECT` still open.

## ANDROID-OAUTH-PHYSICAL-NOT-RUN

**Severity:** P1  
**Surface:** Android auth  
**Beta blocker:** yes  
**Workaround:** email auth for web-first testers; Android social pending physical matrix  
**Notes:** `ANDROID_OAUTH` owner action.

## OA-FINAL-PRICING-OPEN

**Severity:** P2  
**Surface:** commercial  
**Beta blocker:** no (FREE_ONLY beta)  
**Workaround:** FREE_ONLY Closed Beta; paywall info-only  
**Notes:** Live billing remains forbidden regardless.

## STRIPE-TEST-EDGE-SECRETS

**Severity:** P2  
**Surface:** Stripe TEST  
**Beta blocker:** no under FREE_ONLY  
**Workaround:** engineering TEST e2e after Edge price secret wiring  
**Notes:** TEST catalog created in #326; Edge env still CONFIG_REQUIRED.

## PLAY-IAP-DISABLED

**Severity:** P3  
**Surface:** Android billing  
**Beta blocker:** no  
**Workaround:** intentional `DISABLED_FOR_BETA`  
**Notes:** Public launch blocker only.

## WEBKIT-E2E-FLAKES-10B

**Severity:** P2  
**Surface:** CI WebKit E2E  
**Beta blocker:** no (Chromium E2E green; investigate before public)  
**Workaround:** monitor on RC hosted runs  
**Notes:** Observed on ancestor 10B: speech contrast / tone trace / media fallback flakes.

## R1-ARTIFACT-NOT-BUILT

**ID:** R1-ARTIFACT-NOT-BUILT  
**Severity:** P1  
**Surface:** release / Android artifacts  
**Reproducibility:** always until hosted mint  
**Workaround:** wait for Android SUCCESS on R.1 branch; do not sideload RC2  
**Beta blocker:** yes  
**Status:** OPEN  
**Notes:** Final Pre-Beta APK/AAB/web pending after reduced-motion CI fix.

## R1-PHYSICAL-QA-NOT-RUN

**ID:** R1-PHYSICAL-QA-NOT-RUN  
**Severity:** P1  
**Surface:** physical device  
**Reproducibility:** n/a  
**Workaround:** owner pack `OWNER_FINAL_PRE_BETA_RC_TEST.md`  
**Beta blocker:** yes  
**Status:** OPEN  

## R1-SENTRY-NOT-RUN

**ID:** R1-SENTRY-NOT-RUN  
**Severity:** P1  
**Surface:** observability  
**Reproducibility:** n/a  
**Workaround:** configure Sentry project + synthetic event  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R1-ANDROID-OAUTH-NOT-RUN

**ID:** R1-ANDROID-OAUTH-NOT-RUN  
**Severity:** P1  
**Surface:** Android OAuth  
**Reproducibility:** n/a  
**Workaround:** none for social login on device  
**Beta blocker:** yes for GO  
**Status:** OPEN  
