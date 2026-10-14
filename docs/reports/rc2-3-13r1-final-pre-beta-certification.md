# RC2.3.13R.1 — Final Pre-Beta Artifact Certification

## Parent

- PR #340 — Typography & Motion Closure
- Parent HEAD at R.1 branch: `b8f1e8dcfbc9c22ccf04b65beef4c0a12ebd9e85`
- P0 fix: `validate:guidance-surfaces` / `REDUCED_MOTION_IGNORED` — restore RC2.2.18 fade block adjacency; keep 13R panel fades in a separate block.

## SHA semantics

- **learnerRuntimeSha (frozen):** `ce8b7cc82740d6c05d080c462f8403e7d91b1a90`


| Field | Role |
|-------|------|
| learnerRuntimeSha | Last commit changing learner UI/runtime (includes reduced-motion CSS fix) |
| certificationHeadSha | Metadata/cert/report commit |
| artifactSourceSha | Exact checkout for APK/AAB/web — `NOT_BUILT` until hosted mint |

## RC identity

- **RC2.3.13-RC1** / `0.2.0-rc.5`
- Prior built: RC2.3.12-RC2 — cannot certify 13H/H.1/13R UI
- RC4 (`0.2.0-rc.4`) remains historical NOT_BUILT reservation

## Hosted (re-query; do not assume)

At R.1 start on #340:

- Security: SUCCESS (npm audit, gitleaks, CodeQL)
- Android foundation: **FAILURE** → `REDUCED_MOTION_IGNORED` (fixed in R.1)
- CI / beta suites: still queued/in progress — refresh after push

## Artifacts

`NOT_BUILT` until Android workflow SUCCESS on artifactSourceSha. Checksums will be computed from bytes — never invented.

## Physical / operations

All `NOT_RUN`. Agent cannot invent physical evidence.

## Entry

```text
CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED
PUBLIC_BETA_ENTRY = HOLD
```

## Matrix (compact)

| Area | Status |
|------|--------|
| UI Freeze | CODE (typography/motion/sticky) |
| RC Built | NOT_BUILT |
| Hosted | PARTIAL / re-query |
| Physical | NOT_RUN |
| Observability | NOT_RUN |
| Rollback | NOT_RUN |
| Cloud ×2 | NOT_RUN |
| OAuth | NOT_RUN |
| Owner Acceptance | NOT_RUN |
| Closed Beta | OWNER_ACTION_REQUIRED |
| Public Beta | HOLD |
