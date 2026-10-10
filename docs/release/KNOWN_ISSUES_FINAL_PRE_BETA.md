# Known issues — Final Pre-Beta RC2.3.13-RC1

## R2-PLAY-SIGNING-BLOCKED

**ID:** R2-PLAY-SIGNING-BLOCKED  
**Severity:** P1  
**Surface:** Play Closed Testing distribution  
**Reproducibility:** always until secrets configured  
**Workaround:** Owner QA sideload APK for physical certification  
**Beta blocker:** yes for `PLAY_CLOSED_BETA_ENTRY`  
**Status:** OPEN  
**Notes:** `BLOCKED_SIGNING_SECRETS`. See `PLAY_SIGNING_HANDOFF.md`. Debug AAB must not be uploaded as Play release.

## R2-PHYSICAL-QA-NOT-RUN

**ID:** R2-PHYSICAL-QA-NOT-RUN  
**Severity:** P1  
**Surface:** physical device  
**Reproducibility:** n/a  
**Workaround:** `OWNER_FINAL_PRE_BETA_RC_TEST.md` bound to APK SHA256  
**Beta blocker:** yes for `OWNER_QA_ENTRY=GO`  
**Status:** OPEN  

## R2-SENTRY-NOT-RUN

**ID:** R2-SENTRY-NOT-RUN  
**Severity:** P1  
**Surface:** observability  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-ROLLBACK-NOT-RUN

**ID:** R2-ROLLBACK-NOT-RUN  
**Severity:** P1  
**Surface:** Netlify  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-CLOUD-SMOKE-NOT-RUN

**ID:** R2-CLOUD-SMOKE-NOT-RUN  
**Severity:** P1  
**Surface:** cloud  
**Beta blocker:** yes for GO  
**Status:** OPEN  
**Notes:** Requires QA credentials / production URL; agent must not invent PASS.

## R2-ANDROID-OAUTH-NOT-RUN

**ID:** R2-ANDROID-OAUTH-NOT-RUN  
**Severity:** P1  
**Surface:** Android OAuth  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-E2E-IN-PROGRESS

**ID:** R2-E2E-IN-PROGRESS  
**Severity:** P2  
**Surface:** hosted CI  
**Beta blocker:** yes for full hosted closure  
**Status:** OPEN  
**Notes:** Chromium + cross-engine pending on CI run 37995329933 at reconciliation time. Do not mark PASS while IN_PROGRESS.

## R2-VIEWPORT-HOSTED-PENDING

**ID:** R2-VIEWPORT-HOSTED-PENDING  
**Severity:** P2  
**Surface:** 360/375/390 + large font hosted  
**Beta blocker:** yes for full typography hosted closure  
**Status:** OPEN

## R21-ANDROID-FOUNDATION-PEM-FIXTURE (REPAIRED)

**ID:** R21-ANDROID-FOUNDATION-PEM-FIXTURE  
**Severity:** P1 (was)  
**Surface:** hosted Android foundation / release-safety  
**Beta blocker:** no (fixed in R.2.1)  
**Status:** REPAIRED  
**Notes:** R.2 mutation fixture embedded contiguous PEM header; `validate:android-release-safety` correctly failed with SERVICE_ACCOUNT_COMMITTED. Fixture now built from fragments. Safety gate unchanged.

## R21-CONVERGENCE-OR-TRUE-FIXTURE (REPAIRED)

**ID:** R21-CONVERGENCE-OR-TRUE-FIXTURE  
**Severity:** P1 (was)  
**Surface:** CI release-truth / stack-convergence  
**Beta blocker:** no (fixed in R.2.1 follow-on)  
**Status:** REPAIRED  
**Notes:** R.2.1 `GATE_OR_TRUE` kill embedded contiguous shell-or-true; `CONVERGENCE_HIDDEN_SKIP`. Markers now joined from fragments. Convergence gate unchanged.

## R3-HOSTED-E2E-IN-PROGRESS

**ID:** R3-HOSTED-E2E-IN-PROGRESS  
**Severity:** P1  
**Surface:** #343 CI Chromium (+ WebKit/Firefox)  
**Beta blocker:** yes for starting physical certification  
**Status:** OPEN  
**Notes:** Exact HEAD `8811deca` run `38003599459`. Chromium **FAIL** — 120 failed / 951 passed. Clusters: (1) dual h1 on `/jornada` TEST_CONTRACT_STALE; (2) culture `N/30` vs path `N de M` TEST_CONTRACT_STALE; (3) multiple `aria-current=step` CURRENT nodes — likely PRODUCT_RUNTIME_REGRESSION; (4) conversation `Verificar` timeouts — PRODUCT_RUNTIME_REGRESSION or contract. Physical NOT started.

## R3-PHYSICAL-NOT-RUN

**ID:** R3-PHYSICAL-NOT-RUN  
**Severity:** P1  
**Surface:** real device  
**Beta blocker:** yes for `OWNER_QA_ENTRY=GO`  
**Status:** OPEN  

## R3-OPS-CREDENTIALS-UNSET

**ID:** R3-OPS-CREDENTIALS-UNSET  
**Severity:** P1  
**Surface:** Sentry / Netlify / cloud smoke  
**Beta blocker:** yes for `PLAY_CLOSED_BETA_ENTRY=GO`  
**Status:** OPEN  
**Notes:** Agent environment has no SENTRY_*/NETLIFY_*/SUPABASE_* credentials. Keep NOT_RUN until real evidence.
