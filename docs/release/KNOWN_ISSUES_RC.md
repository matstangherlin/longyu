# Known issues — RC2.3.12-RC1

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
