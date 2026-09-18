# Public Beta — Launch Day Runbook

**Verdict today remains NO-GO until cloud + devices + PWA + rollback + security + freezes are green.**  
This checklist is the day-of operations script once those gates pass.

## Before open

Confirm:

- [ ] Candidate / `main` SHA recorded (full hex — not “latest”)
- [ ] Security boundaries PASS
- [ ] `gate:public-beta-core` (or successor) PASS on that SHA
- [ ] `cloud_auth` / `cloud_sync` / `feedback_backend` PASS on **QA candidate** (not production-as-QA)
- [ ] `android_real_device` / `ios_real_device` PASS
- [ ] `pwa_upgrade` / `rollback_drill` PASS
- [ ] Human QA: P0 = 0; P1 main-flow = 0 or waived
- [ ] Privacy notice live (no `data-legal-later`)
- [ ] Terms `/termos` live (PT + EN)
- [ ] Support channel: `beta@longyu.app`
- [ ] Feature freeze `PUBLIC_BETA` · fingerprint `516692632525` (or post-RC2.3 final)

## First 2 hours

Monitor:

- Signup / login failures
- Feedback submissions (SENT vs QUEUED volume)
- Client diagnostics attached to feedback
- Backend / Edge errors (auth, sync, feedback RPC, delete-account)
- Sync failure reports from users

Use [`public-beta-observability-map.md`](./public-beta-observability-map.md).

## First 24 hours

Review:

- New feedback (P0/P1 first)
- Account deletion requests
- Auth failures
- Sync problems
- Incident log entries

Escalate SEV0/SEV1 via [`public-beta-incident-runbook.md`](./public-beta-incident-runbook.md).

## Explicit non-goals on launch day

- No new pedagogical features
- No Pro/Family self-serve flip
- No Sentry install without an explicit decision
- No production used as substitute for QA candidate evidence
