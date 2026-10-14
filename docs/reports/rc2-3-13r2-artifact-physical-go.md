# RC2.3.13R.2 — Artifact Reconciliation & Physical GO Readiness

## Parent #341

| Field | Value |
|-------|-------|
| HEAD | `5c27be365ed276ce7694c15769dd7f9997ec1989` |
| Branch | `cursor/rc2-3-13r1-final-pre-beta-artifact-certification-af1a` |
| Commits on PR | 5 |
| Mergeable | MERGEABLE |
| Base | `cursor/rc2-3-13r-typography-motion-final-rc-af1a` (#340) |

## SHA semantics

| Field | Value |
|-------|-------|
| learnerRuntimeSha | `ce8b7cc82740d6c05d080c462f8403e7d91b1a90` |
| artifactSourceSha / sourceTip / prHead | `5c27be365ed276ce7694c15769dd7f9997ec1989` |
| workflowMergeSha | `3be0ade5565e28297ebedf71645261f037e13c1a` |
| certificationHeadSha | stamped on R.2 metadata commit |

## Hosted runs (exact HEAD)

| Workflow | runId | sourceSha | status | conclusion |
|----------|-------|-----------|--------|------------|
| Security | 37995330357 | 5c27be36… | completed | success |
| Android build | 37995330174 | 5c27be36… | completed | success |
| CI | 37995329933 | 5c27be36… | in_progress | (E2E Chromium + cross-engine pending at recon) |

Release truth, beta suites, quality/build: SUCCESS. Do not mark full CI PASS while E2E pending.

## Artifact discovery

| Artifact | Status | SHA256 |
|----------|--------|--------|
| Owner QA APK | BUILT | `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` |
| Play Closed Beta AAB | BLOCKED_SIGNING_SECRETS | debug AAB present `9342258e158b4eab0c6724a342bd6034cf59ec95aa250359be9280a3699ffb50` — not Play-ready |
| Web candidate | BUILT | `b82648cc1cca419f8937b1ca119eece7cd02e98d552e0e83ab4c5433c45158ee` |

- Android artifact name: `longyu-android-debug-0.2.0-rc.5-3be0ade`
- artifactId: `11646859473`
- versionName: `0.2.0-rc.5`
- versionCode: **651** (reconciled; stale 650 discarded)
- packageId: `longyu.noba.com`
- buildType: debug / DEVICE_QA

## Version reconciliation

Planned docs said `650`. Provenance + AAB bundleInspection say **651**. Authority = built artifact process. Canonical files updated to 651.

## Physical / ops

All physical + Sentry + rollback + cloud smoke ×2 + Android OAuth + owner acceptance: **NOT_RUN**.

## Entry

```text
OWNER_QA_ENTRY = OWNER_ACTION_REQUIRED
PLAY_CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED  # BLOCKED_SIGNING_SECRETS
PUBLIC_BETA_ENTRY = HOLD
realTesterCount = 0
```

## Wave 1

Prepared only as record: `targetRealTesters = 10`, `invited = 0`. No invites before Play/distribution GO.
