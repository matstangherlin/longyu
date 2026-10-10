# Owner RC2 device test — only what you must do on a phone

**Physical target:** `RC2.3.12-RC2` · `0.2.0-rc.2` · versionCode `596`

**STOP if QA Release Truth does not match:** RC ID `RC2.3.12-RC2` · version `0.2.0-rc.2` · versionCode `596` · artifactSourceSha `529d2cd4…` · fingerprint `57a848ef9ef9`.

**Do not use RC1** (`0.2.0-rc.1` / versionCode `570`) — learner UI changed in RC2.3.13A.

Use the same physical checklist structure as RC1 (`OWNER_RC1_DEVICE_TEST.md`) but verify against **RC2** identity above.

Beta blockers (Sentry, cloud smoke, OAuth physical, rollback, physical acceptance) remain owner-gated — do **not** mark PASS merely because the UI wave / Android build passed.
